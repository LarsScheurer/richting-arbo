"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyseBedrijf = void 0;
const https_1 = require("firebase-functions/v2/https");
const vertexai_1 = require("@google-cloud/vertexai");
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
// Initialize Firebase Admin if not already done
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
// Gebruik named database 'richting01' zoals vereist in regels
const db = (0, firestore_1.getFirestore)("richting01");
const PROJECT_ID = process.env.GCLOUD_PROJECT;
const LOCATION = "europe-west4"; // Vertex AI locatie (Nederland)
const MODEL_NAME = "gemini-1.5-pro-001"; // Gebruik Pro voor diepere analyse
exports.analyseBedrijf = (0, https_1.onCall)({ region: LOCATION, timeoutSeconds: 540, memory: "1GiB" }, async (request) => {
    var _a, _b, _c, _d, _e, _f;
    const { companyName, websiteUrl } = request.data;
    if (!companyName || !websiteUrl)
        throw new https_1.HttpsError("invalid-argument", "Geen input");
    if (!PROJECT_ID)
        throw new https_1.HttpsError("failed-precondition", "Project ID mist");
    const vertexAI = new vertexai_1.VertexAI({ project: PROJECT_ID, location: LOCATION });
    // Hier staat getGenerativeModel
    const model = vertexAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.4
        },
        tools: [{ googleSearchRetrieval: {} }],
    });
    const prompt = `
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
                "hoofdcategorie": "Psychisch of Fysiek",
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
        }
    `;
    try {
        const result = await model.generateContent(prompt);
        const text = (_e = (_d = (_c = (_b = (_a = result.response.candidates) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.parts) === null || _d === void 0 ? void 0 : _d[0]) === null || _e === void 0 ? void 0 : _e.text;
        if (!text)
            throw new https_1.HttpsError("internal", "Geen antwoord AI");
        const parsedResult = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim());
        try {
            const analysisRef = db.collection("companyAnalyses").doc();
            await analysisRef.set({
                companyName,
                websiteUrl,
                analysis: parsedResult,
                userId: ((_f = request.auth) === null || _f === void 0 ? void 0 : _f.uid) || "anonymous",
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                model: MODEL_NAME,
                version: "2.0 (Fine & Kinney)"
            });
        }
        catch (dbError) {
            console.error("Fout bij opslaan in Firestore:", dbError);
        }
        return parsedResult;
    }
    catch (error) {
        console.error("AI Error:", error);
        throw new https_1.HttpsError("internal", "Fout: " + error.message);
    }
});
//# sourceMappingURL=ai-analyst.js.map