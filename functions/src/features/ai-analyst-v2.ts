import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI, HarmCategory, HarmBlockThreshold } from "@google-cloud/vertexai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already done
if (getApps().length === 0) {
  initializeApp();
}

const db = getFirestore("richting01");

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "europe-west4"; 
const MODEL_NAME = "gemini-1.5-pro-001"; // Fallback to stable pro model

export const analyseBedrijfV2 = onCall(
  { region: LOCATION, timeoutSeconds: 540, memory: "1GiB", cors: true },
  async (request) => {
    const { companyName, websiteUrl } = request.data;
    
    if (!companyName || !websiteUrl) throw new HttpsError("invalid-argument", "Geen input: companyName en websiteUrl vereist");
    if (!PROJECT_ID) throw new HttpsError("failed-precondition", "Project ID mist");

    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    
    const systemInstruction = `
Je bent een Senior Data Analist gespecialiseerd in Arbodienstverlening en Verzuimmanagement.
Je taak is het genereren van een "Diepgaande Brancheanalyse" (Level 1) op basis van een bedrijfsnaam en website.

INPUT:
- Bedrijfsnaam: ${companyName}
- Website: ${websiteUrl}

INSTRUCTIES VOOR ONDERZOEK (Google Search Grounding):
1. Analyseer de website en zoek extern naar de branche, activiteiten en cultuur.
2. Zoek naar de relevante CAO (status onderhandelingen, partijen, thema's).
3. Zoek naar actuele branche-risico's en verzuimtrends.

BEOORDELINGSMETHODIEK: FINE & KINNEY
Gebruik voor de risico-analyse (hoofdstuk 4) de Fine & Kinney formule:
Risico = Waarschijnlijkheid (W) x Blootstelling (B) x Ernst (E).

Kies waarden uit deze vaste schalen:
1. Waarschijnlijkheid (W):
   - 10 (Vrijwel zeker), 6 (Zeer waarschijnlijk), 3 (Waarschijnlijk), 1 (Mogelijk), 0.5 (Denkbaar), 0.2 (Vrijwel onmogelijk)
2. Blootstelling (B):
   - 10 (Voortdurend), 6 (Dagelijks), 3 (Wekelijks), 2 (Maandelijks), 1 (Jaarlijks), 0.5 (Zelden)
3. Ernst (E):
   - 100 (Ramp/Meerdere doden), 40 (Zeer groot/Dode), 15 (Ernst/Blijvend), 7 (Belangrijk/Verzuim), 3 (Gering/EHBO), 1 (Verwaarloosbaar)

RICHTING SERVICES (Harde URL eis):
Gebruik bij het adviseren van diensten ('advies_en_actie') UITSLUITEND deze exacte links:
- RI&E: "https://www.richting.nl/dienst/risico-inventarisatie-en-evaluatie/"
- PAGO/PMO: "https://www.richting.nl/dienst/pmo-pago/"
- Het Richtinggevende Gesprek: "https://www.richting.nl/dienst/het-richtinggevende-gesprek/"
- Verzuimbegeleiding: "https://www.richting.nl/dienst/verzuimbegeleiding/"
- Werkplekonderzoek: "https://www.richting.nl/dienst/werkplekonderzoek/"

OUTPUT FORMAAT:
Genereer ALLEEN valide JSON. Geen markdown, geen introductie.
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

    try {
      // In Vertex Node SDK, systemInstruction is passed at model instantiation.
      const modelWithSystem = vertexAI.getGenerativeModel({
        model: MODEL_NAME,
        systemInstruction: {
            role: 'system',
            parts: [{ text: systemInstruction }]
        },
        generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.5,
            topP: 0.95,
            maxOutputTokens: 8192
        },
        tools: [{ googleSearchRetrieval: {} }],
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
        ]
      });

      const prompt = `Maak een analyse voor ${companyName}, ${websiteUrl}`;
      const result = await modelWithSystem.generateContent(prompt);
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!text) throw new HttpsError("internal", "Geen antwoord AI");

      const parsedResult = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      
      // Opslaan voor logging
      try {
        await db.collection("companyAnalyses").add({
            companyName,
            websiteUrl,
            analysis: parsedResult,
            userId: request.auth?.uid || "anonymous",
            createdAt: FieldValue.serverTimestamp(),
            model: MODEL_NAME,
            version: "v2-custom-prompt"
        });
      } catch (e) {
        console.error("Log error", e);
      }

      return parsedResult;
    } catch (error: any) {
      console.error("AI Error:", error);
      throw new HttpsError("internal", "Fout: " + error.message);
    }
  }
);

