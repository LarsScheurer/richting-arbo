import { onCall, HttpsError } from "firebase-functions/v2/https";
import { VertexAI } from "@google-cloud/vertexai";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin if not already done
if (getApps().length === 0) {
  initializeApp();
}

// Gebruik named database 'richting01' zoals vereist in regels
const db = getFirestore("richting01");

const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "europe-west4"; // Vertex AI locatie (Nederland)

// GEBRUIK EEN GELDIG VERTEX AI MODEL ID
// 'gemini-flash-latest' werkt alleen in AI Studio, niet in Vertex AI.
// Geldige Vertex AI ID's: 'gemini-1.5-flash-001', 'gemini-1.5-pro-001', 'gemini-1.0-pro-001'
const MODEL_NAME = "gemini-1.5-flash-001"; 

const SYSTEM_INSTRUCTION = `
Je bent een Senior Data Analist. Analyseer het bedrijf op basis van naam en URL.
INPUT: Bedrijfsnaam: \${companyName}, Website: \${websiteUrl}

BEOORDELINGSMETHODIEK: FINE & KINNEY
Risico = Waarschijnlijkheid (W) x Blootstelling (B) x Ernst (E).

OUTPUT FORMAAT (JSON):
{
  "bedrijfsprofiel": {
    "naam": "string", "sector_beschrijving": "string", "activiteiten": "string", "actualiteit_arbeidsmarkt": "string",
    "cao": { "naam": "string", "betrokken_partijen": "string", "status_onderhandelingen": "string", "belangrijkste_themas": ["string"], "impact_op_bedrijfsvoering": "string" }
  },
  "sbi_data": {
    "codes": [ {"code": "string", "omschrijving": "string"} ],
    "locaties": { "regio_activiteit": "string", "aantal_medewerkers_totaal": "string", "dichtstbijzijnde_richting_vestiging": "string" }
  },
  "arbo_instrumenten": {
    "arbocatalogus_status": "string", "instrumenten_lijst": [ {"naam": "string", "url": "string"} ]
  },
  "risico_analyse": {
    "totaal_score": number, "gemiddelde_score": number, "toelichting_score": "string",
    "categorieen": [
      { "hoofdcategorie": "Psychisch" | "Fysiek" | "Overig", "risico": "string", "waarschijnlijkheid": number, "blootstelling": number, "ernst": number, "score": number }
    ]
  },
  "primaire_processen": [ "string" ],
  "functies": [ {"functie_naam": "string", "taken": "string"} ],
  "verzuim_en_ziekten": { "analyse_branche_verzuim": "string", "vergelijking_landelijk": "string", "beroepsziekten": ["string"], "gevaarlijke_stoffen": ["string"] },
  "advies_en_actie": {
    "speerpunten_ondernemer": ["string"], "verwacht_effect_cao": "string",
    "voorgestelde_richting_services": [ {"dienst": "string", "reden": "string", "url": "string"} ],
    "stappenplan": [ {"stap": number, "actie": "string", "omschrijving": "string"} ]
  },
  "metadata": { "gegenereerd_op": "YYYY-MM-DD", "copyright": "Richting" },
  "bronnen": ["string"]
}`;

export const analyseBedrijf = onCall(
  { region: LOCATION, timeoutSeconds: 60, memory: "1GiB" },
  async (request) => {
    const { companyName, websiteUrl } = request.data;
    
    // Auth validatie (optioneel)
    // if (!request.auth) throw new HttpsError("unauthenticated", "Niet ingelogd");

    if (!companyName || !websiteUrl) throw new HttpsError("invalid-argument", "Geen input");
    if (!PROJECT_ID) throw new HttpsError("failed-precondition", "Project ID mist");

    const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    
    // Vertex AI vereist een specifiek model ID. 
    // We gebruiken hier expliciet het model dat door de SDK wordt ondersteund.
    const model = vertexAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: "application/json" },
      // Google Search Retrieval Tool (Grounding)
      tools: [{ googleSearchRetrieval: {} }],
    });

    try {
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: `Analyseer ${companyName} (${websiteUrl})` }] }],
        systemInstruction: { role: "system", parts: [{ text: SYSTEM_INSTRUCTION }] },
      });
      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new HttpsError("internal", "Geen antwoord AI");

      const parsedResult = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
      
      // Opslaan in Firestore 'richting01'
      try {
        const analysisRef = db.collection("companyAnalyses").doc();
        await analysisRef.set({
            companyName,
            websiteUrl,
            analysis: parsedResult,
            userId: request.auth?.uid || "anonymous",
            createdAt: FieldValue.serverTimestamp(),
            model: MODEL_NAME
        });
      } catch (dbError) {
        console.error("Fout bij opslaan in Firestore:", dbError);
      }

      return parsedResult;
    } catch (error: any) {
      console.error("AI Error:", error);
      // Geef de specifieke fout terug zodat we kunnen debuggen (bijv. Model not found)
      throw new HttpsError("internal", "Fout: " + error.message);
    }
  }
);
