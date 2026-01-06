import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue, VectorQuerySnapshot } from "firebase-admin/firestore";

// Initialiseer Admin SDK
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore(); // Gebruik standaard database
const PROJECT_ID = process.env.GCLOUD_PROJECT || "richting-sales-d764a";
const LOCATION = "europe-west4"; 
const MODEL_NAME = "gemini-1.5-pro-001";
const EMBEDDING_MODEL = "text-embedding-004"; // Zelfde model als in seed-database.ts!

// Hulpfunctie: Maak embedding van de vraag van de gebruiker
async function getEmbedding(text: string, vertexAI: VertexAI) {
  const model = vertexAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

export const analyseBedrijfV2 = onCall(
  { region: LOCATION, timeoutSeconds: 540, memory: "1GiB", cors: true },
  async (request) => {
    const { companyName, websiteUrl } = request.data;
    
    if (!companyName || !websiteUrl) throw new HttpsError("invalid-argument", "Geen input: companyName en websiteUrl vereist");

    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

    try {
      // STAP 1: Zoek relevante kennis in jouw eigen Firestore database
      // We maken eerst een vector van de zoekopdracht
      const zoekVraag = `Informatie over werkwijze, verzuim en diensten voor klant ${companyName} in de sector`;
      const queryEmbedding = await getEmbedding(zoekVraag, vertexAI);

      // We zoeken in Firestore naar de 5 meest relevante stukjes tekst
      // LET OP: Hiervoor moet wel een Vector Index bestaan (zie instructie onder code)
      const coll = db.collection('knowledge_base');
      const vectorQuery = coll.findNearest('embedding', queryEmbedding, {
        limit: 5,
        distanceMeasure: 'COSINE'
      });

      const vectorSnapshot = await vectorQuery.get();

      let eigenKennisContext = "";
      vectorSnapshot.forEach(doc => {
        const data = doc.data();
        eigenKennisContext += `\n--- BRON: ${data.metadata.filename} ---\n${data.content}\n`;
      });

      if (!eigenKennisContext) {
        eigenKennisContext = "Geen specifieke interne documenten gevonden.";
      }

      console.log(`🧠 Kennis opgehaald: ${vectorSnapshot.size} documenten.`);

      // STAP 2: De System Instruction (Nu MET jouw eigen kennis)
      const systemInstruction = `
Je bent een Senior Data Analist gespecialiseerd in Arbodienstverlening en Verzuimmanagement.
Je taak is het genereren van een "Diepgaande Brancheanalyse" (Level 1).

GEBRUIK DEZE INTERNE KENNIS (PRIORITEIT):
De volgende informatie komt uit de interne dossiers van Richting. Gebruik dit om je antwoord specifiek en correct te maken:
${eigenKennisContext}

INPUT:
- Bedrijfsnaam: ${companyName}
- Website: ${websiteUrl}

INSTRUCTIES VOOR ONDERZOEK (Google Search Grounding):
Vul de interne kennis aan met actuele externe data (CAO status, nieuws).

BEOORDELINGSMETHODIEK: FINE & KINNEY
Gebruik voor de risico-analyse (hoofdstuk 4) de Fine & Kinney formule:
Risico = Waarschijnlijkheid (W) x Blootstelling (B) x Ernst (E).

Kies waarden uit deze vaste schalen:
1. Waarschijnlijkheid (W): 10, 6, 3, 1, 0.5, 0.2
2. Blootstelling (B): 10, 6, 3, 2, 1, 0.5
3. Ernst (E): 100, 40, 15, 7, 3, 1

RICHTING SERVICES (Harde URL eis):
Gebruik bij 'advies_en_actie' UITSLUITEND deze exacte links:
- RI&E: "https://www.richting.nl/dienst/risico-inventarisatie-en-evaluatie/"
- PAGO/PMO: "https://www.richting.nl/dienst/pmo-pago/"
- Het Richtinggevende Gesprek: "https://www.richting.nl/dienst/het-richtinggevende-gesprek/"
- Verzuimbegeleiding: "https://www.richting.nl/dienst/verzuimbegeleiding/"
- Werkplekonderzoek: "https://www.richting.nl/dienst/werkplekonderzoek/"

OUTPUT FORMAAT:
Genereer ALLEEN valide JSON. Geen markdown.
Gebruik exact deze structuur:

{
  "bedrijfsprofiel": {
    "naam": "string",
    "sector_beschrijving": "string",
    "activiteiten": "string",
    "actualiteit_arbeidsmarkt": "string",
    "cao": {
      "naam": "string",
      "betrokken_partijen": "string",
      "status_onderhandelingen": "string",
      "belangrijkste_themas": ["string"],
      "impact_op_bedrijfsvoering": "string"
    }
  },
  "sbi_data": {
    "codes": [ {"code": "string", "omschrijving": "string"} ],
    "locaties": {
      "regio_activiteit": "string",
      "aantal_medewerkers_totaal": "string of 'onbekend'",
      "dichtstbijzijnde_richting_vestiging": "string"
    }
  },
  "arbo_instrumenten": {
    "arbocatalogus_status": "string",
    "instrumenten_lijst": [ {"naam": "string", "url": "string"} ]
  },
  "risico_analyse": {
    "totaal_score": 0,
    "gemiddelde_score": 0,
    "toelichting_score": "string",
    "categorieen": [
      {
        "hoofdcategorie": "Psychisch of Fysiek of Overig",
        "risico": "string",
        "waarschijnlijkheid": 0,
        "blootstelling": 0,
        "ernst": 0,
        "score": 0
      }
    ]
  },
  "primaire_processen": [ "string" ],
  "functies": [ {"functie_naam": "string", "taken": "string"} ],
  "verzuim_en_ziekten": {
    "analyse_branche_verzuim": "string",
    "vergelijking_landelijk": "string",
    "beroepsziekten": ["string"],
    "gevaarlijke_stoffen": ["string"]
  },
  "advies_en_actie": {
    "speerpunten_ondernemer": ["string"],
    "verwacht_effect_cao": "string",
    "voorgestelde_richting_services": [
      {"dienst": "string", "reden": "string", "url": "Kies uit bovenstaande lijst"}
    ],
    "stappenplan": [
      {"stap": 1, "actie": "string", "omschrijving": "string"}
    ]
  },
  "metadata": {
    "gegenereerd_op": "YYYY-MM-DD",
    "copyright": "Richting"
  }
}`;

      // STAP 3: De daadwerkelijke AI aanroep
      const modelWithSystem = vertexAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
        },
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.5
        },
        tools: [{ googleSearchRetrieval: {} }] // Hij mag OOK nog op internet zoeken
      });

      const prompt = `Maak een analyse voor ${companyName}, ${websiteUrl}`;
      const result = await modelWithSystem.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new HttpsError("internal", "Geen antwoord AI");

      const parsedResult = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      
      // Loggen in Firestore
      await db.collection("companyAnalyses").add({
          companyName,
          websiteUrl,
          analysis: parsedResult,
          userId: request.auth?.uid || "anonymous",
          createdAt: FieldValue.serverTimestamp(),
          model: MODEL_NAME,
          bronnen_gebruikt: vectorSnapshot.size > 0
      });

      return parsedResult;

    } catch (error: any) {
      console.error("AI Error:", error);
      throw new HttpsError("internal", "Fout: " + error.message);
    }
  }
);