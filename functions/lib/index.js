"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomerFolders = exports.searchDriveFolder = exports.checkRIERapportage = exports.searchCompanyWebsite = exports.exportRapport = exports.analyseCultuurTest = exports.analyseBranche = exports.askQuestion = exports.analyzeDriveFile = exports.listModels = exports.analyzeDocument = void 0;
const https_1 = require("firebase-functions/v2/https");
const v2_1 = require("firebase-functions/v2");
const admin = require("firebase-admin");
const generative_ai_1 = require("@google/generative-ai");
const googleapis_1 = require("googleapis");
// import * as cors from "cors";
// Initialize Firebase Admin with explicit database configuration
const app = admin.initializeApp();
// Helper to get the named database (richting01) - same as frontend
// In Admin SDK, we need to access the named database differently
function getFirestoreDb() {
    try {
        // Method 1: Try using the database() method on the Firestore instance (Admin SDK v12+)
        const firestoreInstance = admin.firestore();
        if (firestoreInstance.database && typeof firestoreInstance.database === 'function') {
            try {
                const namedDb = firestoreInstance.database('richting01');
                console.log('✅ Using named database: richting01 (method 1)');
                return namedDb;
            } catch (e) {
                console.log('Method 1 failed:', e.message);
            }
        }
        // Method 2: Try using app.firestore() with database name
        if (app.firestore && typeof app.firestore === 'function') {
            try {
                const namedDb = app.firestore('richting01');
                console.log('✅ Using named database: richting01 (method 2)');
                return namedDb;
            }
            catch (e) {
                console.log('Method 2 failed:', e.message);
            }
        }
        // Method 3: Try using getFirestore with database name (Admin SDK v11+)
        try {
            const namedDb = admin.firestore('richting01');
            console.log('✅ Using named database: richting01 (method 3)');
            return namedDb;
        }
        catch (e) {
            console.log('Method 3 failed:', e.message);
        }
        // Method 4: Try direct Firestore constructor with database name
        try {
            const Firestore = require('@google-cloud/firestore').Firestore;
            const namedDb = new Firestore({ databaseId: 'richting01' });
            console.log('✅ Using named database: richting01 (method 4)');
            return namedDb;
        }
        catch (e) {
            console.log('Method 4 failed:', e.message);
        }
        // CRITICAL: Do not fall back to default database
        // Throw error instead to force fix
        const error = new Error('CRITICAL: Could not access richting01 database. All methods failed. Do not use default database!');
        console.error('❌', error.message);
        throw error;
    }
    catch (error) {
        console.error('❌ Error accessing named database:', error);
        // Do not return default database - throw error instead
        throw new Error('CRITICAL: Cannot access richting01 database. Please check Firebase Admin SDK configuration.');
    }
}
// Set global options for v2 functions
(0, v2_1.setGlobalOptions)({ region: "europe-west4" });
// const corsHandler = cors({ origin: true });
// --- CONFIG ---
// For v2, we use process.env directly or parametrized config, but for simplicity we stick to env vars
// configured via firebase functions:config:set (which are available in v1) OR define them in .env file for functions
// V2 prefers using defineString/defineSecret, but let's keep it simple first.
const API_KEY = process.env.GEMINI_API_KEY || process.env.gemini_key;
const genAI = API_KEY ? new generative_ai_1.GoogleGenerativeAI(API_KEY) : null;
const KNOWLEDGE_STRUCTURE_DESC = `
HOOFDCATEGORIE: Strategie & Visie (ID: strategy)
SUBCATEGORIEËN: Jaarplannen (ID: yearplan), Directie (ID: management), Marktontwikkeling (ID: market)

HOOFDCATEGORIE: HR & Organisatie (ID: hr)
SUBCATEGORIEËN: Handboek (ID: handbook), Verlof & Verzuim (ID: leave), Onboarding (ID: onboarding), Thuiswerken (ID: wfh)

HOOFDCATEGORIE: Marketing & Sales (ID: marketing)
SUBCATEGORIEËN: Branding (ID: branding), Campagnes (ID: campaigns), Productsheets (ID: products), Sales Scripts (ID: scripts)

HOOFDCATEGORIE: IT & Development (ID: tech)
SUBCATEGORIEËN: Security (ID: security), Handleidingen (ID: manuals), Tech Stack (ID: stack), Protocollen (ID: protocols)

HOOFDCATEGORIE: Projecten (ID: projects)
SUBCATEGORIEËN: Lopend (ID: active), Afgerond (ID: finished), Case Studies (ID: cases)
`;
exports.analyzeDocument = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { text } = req.body;
    if (!text) {
        res.status(400).json({ error: "No text provided" });
        return;
    }
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
        Je bent een content analist voor Richting.nl. Analyseer de volgende tekst.
        
        TAAK:
        1. Genereer een pakkende, zakelijke titel (max 10 woorden) die de kern van het document samenvat.
        2. Schrijf een uitgebreide, zakelijke samenvatting (100-150 woorden) met de belangrijkste punten, conclusies en acties uit het document.
        3. Categoriseer het document door een Main Category ID en een Sub Category ID te kiezen uit de lijst hieronder.
        4. Genereer 3 relevante tags.
        
        CATEGORIE STRUCTUUR:
        ${KNOWLEDGE_STRUCTURE_DESC}
        
        TEKST:
        ${text.substring(0, 10000)}

        Geef het antwoord in puur JSON formaat (zonder markdown opmaak):
        {
          "title": "Pakkende titel (max 10 woorden)",
          "summary": "Uitgebreide samenvatting van 100-150 woorden met belangrijkste punten, conclusies en acties.",
          "mainCategoryId": "...",
          "subCategoryId": "...",
          "tags": ["...", "...", "..."]
        }
      `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(jsonStr);
        res.json(json);
    }
    catch (error) {
        console.error("Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// Test endpoint to list available models
exports.listModels = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    try {
        // Try to get available models
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
        const data = await response.json();
        res.json({ models: data.models || [], fullResponse: data });
    }
    catch (error) {
        console.error("ListModels Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// Extract file ID from Google Drive URL
function extractFileId(url) {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match)
            return match[1];
    }
    return null;
}
// Fetch content from Google Drive file
async function fetchDriveFileContent(fileId, mimeType, accessToken) {
    // Use API key for public files, or access token for private files
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    const drive = googleapis_1.google.drive({
        version: 'v3',
        auth: accessToken || apiKey || undefined
    });
    // Get file metadata
    const fileMetadata = await drive.files.get({
        fileId,
        fields: 'name, mimeType, webViewLink'
    });
    const title = fileMetadata.data.name || 'Untitled';
    const webViewLink = fileMetadata.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;
    const fileMimeType = fileMetadata.data.mimeType || mimeType;
    let content = '';
    // Handle Google Docs (export as plain text)
    if (fileMimeType === 'application/vnd.google-apps.document') {
        const exported = await drive.files.export({
            fileId,
            mimeType: 'text/plain'
        });
        content = exported.data;
    }
    // Handle PDFs (download and extract text - simplified, might need PDF parsing library)
    else if (fileMimeType === 'application/pdf') {
        // For now, we'll note that it's a PDF and the user can view it
        // Full PDF text extraction would require a PDF parsing library like pdf-parse
        // TODO: Implement PDF text extraction
        content = `[PDF Document: ${title}. Download en bekijk het origineel voor volledige inhoud.]`;
    }
    // Handle other text files
    else if (fileMimeType.startsWith('text/')) {
        const textResponse = await drive.files.get({
            fileId,
            alt: 'media'
        });
        content = textResponse.data;
    }
    else {
        content = `[Bestand type: ${fileMimeType}. Bekijk het origineel voor volledige inhoud.]`;
    }
    return { content, title, webViewLink };
}
// New endpoint to analyze Google Drive files
exports.analyzeDriveFile = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { driveUrl, fileId, accessToken } = req.body;
    if (!driveUrl && !fileId) {
        res.status(400).json({ error: "driveUrl or fileId required" });
        return;
    }
    try {
        const id = fileId || extractFileId(driveUrl);
        if (!id) {
            res.status(400).json({ error: "Could not extract file ID from URL" });
            return;
        }
        // Fetch file content
        const { content, title, webViewLink } = await fetchDriveFileContent(id, 'application/vnd.google-apps.document', accessToken);
        if (!content || content.length === 0) {
            res.status(400).json({ error: "Could not extract content from file" });
            return;
        }
        // Analyze with Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
        Je bent een content analist voor Richting.nl. Analyseer de volgende tekst.
        
        TAAK:
        1. Genereer een pakkende, zakelijke titel (max 10 woorden) die de kern van het document samenvat.
        2. Schrijf een uitgebreide, zakelijke samenvatting (100-150 woorden) met de belangrijkste punten, conclusies en acties uit het document.
        3. Categoriseer het document door een Main Category ID en een Sub Category ID te kiezen uit de lijst hieronder.
        4. Genereer 3 relevante tags.
        
        CATEGORIE STRUCTUUR:
        ${KNOWLEDGE_STRUCTURE_DESC}
        
        TEKST:
        ${content.substring(0, 10000)}
        
        Geef het antwoord in puur JSON formaat (zonder markdown opmaak):
        {
          "title": "Pakkende titel (max 10 woorden)",
          "summary": "Uitgebreide samenvatting van 100-150 woorden met belangrijkste punten, conclusies en acties.",
          "mainCategoryId": "...",
          "subCategoryId": "...",
          "tags": ["...", "...", "..."]
        }
      `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        const json = JSON.parse(jsonStr);
        // Return analysis plus file metadata
        res.json(Object.assign(Object.assign({}, json), { title, originalUrl: webViewLink, fileId: id, content: content.substring(0, 5000) // Return first 5000 chars for preview
         }));
    }
    catch (error) {
        console.error("Drive Analysis Error:", error);
        res.status(500).json({ error: error.message });
    }
});
exports.askQuestion = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { question, context } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
          Je bent de AI Kennisbank assistent van Richting.nl.
          Beantwoord de vraag op basis van de bronnen.
          
          BRONNEN:
          ${context}
          
          VRAAG:
          ${question}
        `;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ answer: response.text() });
    }
    catch (error) {
        console.error("Question Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// Default Branche Analyse Prompt (VEREENVOUDIGD - Focus op locaties en medewerkers)
// Laatste update: ${new Date().toISOString()}
const DEFAULT_BRANCHE_ANALYSE_PROMPT = `
Je bent Gemini, geconfigureerd als een deskundige adviseur voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland.

PRIMAIRE DOELSTELLING:
Identificeer alle vestigingslocaties van de organisatie, het aantal medewerkers per locatie, en de dichtstbijzijnde Richting vestiging voor elke locatie.

OPDRACHT:

Gebruik de organisatienaam en website om de volgende informatie te verzamelen:

Hoofdstuk 1: Locaties en Medewerkers
- Zoek alle vestigingslocaties van de organisatie in Nederland
- Voor elke locatie verzamel:
  * Naam van de locatie (bijv. "Hoofdkantoor", "Vestiging Amsterdam", "Productielocatie Rotterdam")
  * Volledig adres (straat, huisnummer, postcode, stad)
  * Stad
  * Aantal medewerkers op die locatie (verplicht - gebruik 0 als onbekend)
  * Dichtstbijzijnde Richting vestiging (bijv. "Richting Amsterdam", "Richting Rotterdam", "Richting Utrecht")

BELANGRIJK: 
- Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst.
- Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\").
- De JSON moet direct parseerbaar zijn zonder enige bewerking.

JSON STRUCTUUR:
{
  "volledigRapport": "Kort markdown rapport met bevindingen over locaties en medewerkers",
  "locaties": [
    {
      "naam": "Naam van de locatie (bijv. Hoofdkantoor, Vestiging Amsterdam)",
      "adres": "Volledig adres inclusief straat en huisnummer",
      "stad": "Stad",
      "aantalMedewerkers": 0,
      "richtingLocatie": "Naam van de dichtstbijzijnde Richting vestiging (bijv. Richting Amsterdam, Richting Rotterdam)"
    }
  ]
}
`;
// Default prompt voor Publiek Cultuur Profiel (fallback als geen actieve prompt gevonden wordt)
const DEFAULT_CULTUUR_PROFIEL_PROMPT = `
Je bent Gemini, geconfigureerd als een deskundige cultuuranalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande cultuuranalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

BELANGRIJK: Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst. Alleen de JSON object. Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\"). De JSON moet direct parseerbaar zijn zonder enige bewerking.

Analyseer de organisatiecultuur en genereer een volledig CultuurProfiel met de volgende JSON structuur:

{
  "volledigRapport": "Volledig markdown rapport met alle bevindingen...",
  "scores": {
    "cultuurvolwassenheid": 0-100,
    "groeidynamiekScore": 0-100,
    "cultuurfit": 0-100,
    "cultuursterkte": "laag|gemiddeld|hoog|zeer_hoog",
    "dynamiekType": "stagnerend|organisch_groeiend|disruptief_veranderend"
  },
  "gaps": [
    {
      "dimensie": "Naam van dimensie",
      "huidigeScore": 0-100,
      "gewensteScore": 0-100,
      "gap": number,
      "urgentie": "laag|gemiddeld|hoog|urgent"
    }
  ],
  "dna": {
    "dominantType": "adhocratie|clan|hiërarchie|markt|hybride",
    "typeScores": {
      "adhocratie": 0-100,
      "clan": 0-100,
      "hiërarchie": 0-100,
      "markt": 0-100
    },
    "kernwaarden": [
      {
        "waarde": "naam van kernwaarde",
        "score": 0-100,
        "status": "kracht|zwakte|neutraal|gap",
        "beschrijving": "korte beschrijving"
      }
    ],
    "dimensies": [
      {
        "naam": "naam van dimensie",
        "score": 0-100,
        "trend": "stijgend|stabiel|dalend",
        "impact": "hoog|gemiddeld|laag"
      }
    ]
  },
  "performanceData": [
    {
      "metriek": "naam van metriek",
      "waarde": number,
      "trend": "stijgend|stabiel|dalend"
    }
  ],
  "engagementData": [
    {
      "dimensie": "naam van dimensie",
      "score": 0-100,
      "trend": "stijgend|stabiel|dalend"
    }
  ],
  "barrières": [
    {
      "naam": "naam van barrière",
      "impact": "hoog|gemiddeld|laag",
      "urgentie": "urgent|hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ],
  "opportuniteiten": [
    {
      "naam": "naam van opportuniteit",
      "potentieel": "hoog|gemiddeld|laag",
      "prioriteit": "urgent|hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ],
  "themas": [
    {
      "naam": "naam van thema",
      "categorie": "cultuur|leiderschap|processen|technologie",
      "status": "kracht|zwakte|opportuniteit|risico",
      "acties": ["actie 1", "actie 2"]
    }
  ],
  "gedragingen": [
    {
      "naam": "naam van gedraging",
      "type": "positief|negatief|neutraal",
      "frequentie": "vaak|soms|zelden",
      "impact": "hoog|gemiddeld|laag"
    }
  ],
  "interventies": [
    {
      "naam": "naam van interventie",
      "type": "quick_win|strategisch|transformatie",
      "prioriteit": "urgent|hoog|gemiddeld|laag",
      "impact": "hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ]
}

Zorg ervoor dat alle numerieke waarden (scores, percentages) daadwerkelijk worden ingevuld op basis van je analyse, niet op 0 blijven staan.
`;
// Helper function to fetch Richting locations from website
async function getRichtingLocations() {
    try {
        // Fetch the website
        const response = await fetch('https://www.richting.nl/locaties');
        if (!response.ok) {
            throw new Error(`Failed to fetch Richting locations: ${response.statusText}`);
        }
        const html = await response.text();
        // Use Gemini to extract locations from HTML
        if (!genAI) {
            throw new Error("Gemini API not available");
        }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
Je krijgt de HTML van de Richting locaties pagina (www.richting.nl/locaties). 

TAAK: Extraheer ALLE Richting vestigingslocaties die op deze pagina staan.

BELANGRIJK:
- Zoek naar alle vestigingen, kantoren, of locaties van Richting
- Elke vestiging heeft meestal een stad/plaatsnaam
- De naam is meestal "Richting [Stad]" of vergelijkbaar
- Neem ALLE locaties mee, niet alleen de eerste paar

Geef een JSON array terug met ALLE locaties in dit exacte formaat:
[
  {
    "naam": "Naam van de vestiging (bijv. Richting Amsterdam, Richting Rotterdam, Richting Utrecht)",
    "stad": "Stad waar de vestiging zich bevindt (bijv. Amsterdam, Rotterdam, Utrecht)",
    "adres": "Volledig adres (straat, huisnummer, postcode, stad) indien beschikbaar"
  }
]

HTML (eerste 50000 karakters):
${html.substring(0, 50000)}

Geef ALLEEN de JSON array terug, geen markdown, geen code blocks, geen extra tekst. Alleen de array met alle gevonden locaties.
`;
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        // Extract JSON from response
        let jsonStr = responseText.trim();
        // Remove markdown code blocks if present
        jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        // Try to extract JSON array if wrapped in other text
        const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        const locations = JSON.parse(jsonStr);
        console.log(`✅ Extracted ${locations.length} Richting locations:`, locations.map((l) => `${l.naam} (${l.stad})`).join(', '));
        return locations;
    }
    catch (error) {
        console.error("Error fetching Richting locations:", error);
        // Fallback to hardcoded list if fetch fails
        return [
            { naam: "Richting Amsterdam", stad: "Amsterdam" },
            { naam: "Richting Rotterdam", stad: "Rotterdam" },
            { naam: "Richting Utrecht", stad: "Utrecht" },
            { naam: "Richting Den Haag", stad: "Den Haag" },
            { naam: "Richting Eindhoven", stad: "Eindhoven" },
            { naam: "Richting Groningen", stad: "Groningen" },
            { naam: "Richting Zwolle", stad: "Zwolle" },
            { naam: "Richting Arnhem", stad: "Arnhem" },
            { naam: "Richting Breda", stad: "Breda" },
            { naam: "Richting Maastricht", stad: "Maastricht" }
        ];
    }
}
// Helper function to normalize city names (remove accents, postcodes, etc.)
function normalizeCityName(city) {
    if (!city)
        return '';
    // Remove postcodes (e.g., "1234 AB Amsterdam" -> "Amsterdam")
    let normalized = city.replace(/\d{4}\s?[A-Z]{2}\s*/gi, '').trim();
    // Remove common suffixes
    normalized = normalized.replace(/\s*-\s*(noord|zuid|oost|west|centrum|centrum|noord|zuid)$/gi, '');
    // Normalize to lowercase
    normalized = normalized.toLowerCase();
    // Remove accents and special characters
    normalized = normalized
        .replace(/[àáâãäå]/g, 'a')
        .replace(/[èéêë]/g, 'e')
        .replace(/[ìíîï]/g, 'i')
        .replace(/[òóôõö]/g, 'o')
        .replace(/[ùúûü]/g, 'u')
        .replace(/[ç]/g, 'c')
        .replace(/[ñ]/g, 'n');
    return normalized.trim();
}
// Helper function to find nearest Richting location based on city
function findNearestRichtingLocation(customerCity, richtingLocations) {
    if (!customerCity || !richtingLocations || richtingLocations.length === 0) {
        console.log(`⚠️ findNearestRichtingLocation: Missing input - city: ${customerCity}, locations: ${(richtingLocations === null || richtingLocations === void 0 ? void 0 : richtingLocations.length) || 0}`);
        return undefined;
    }
    const normalizedCustomerCity = normalizeCityName(customerCity);
    console.log(`🔍 Searching for Richting location for city: "${customerCity}" (normalized: "${normalizedCustomerCity}")`);
    console.log(`📍 Available Richting locations: ${richtingLocations.map(l => `${l.naam} (${l.stad})`).join(', ')}`);
    // Normalize all Richting location cities
    const normalizedLocations = richtingLocations.map(loc => (Object.assign(Object.assign({}, loc), { normalizedStad: normalizeCityName(loc.stad) })));
    // 1. Direct exact match (normalized)
    const directMatch = normalizedLocations.find(loc => loc.normalizedStad === normalizedCustomerCity);
    if (directMatch) {
        console.log(`✅ Direct match found: ${directMatch.naam} for "${customerCity}"`);
        return directMatch.naam;
    }
    // 2. Partial match - customer city contains location city or vice versa
    const partialMatch = normalizedLocations.find(loc => normalizedCustomerCity.includes(loc.normalizedStad) ||
        loc.normalizedStad.includes(normalizedCustomerCity));
    if (partialMatch) {
        console.log(`✅ Partial match found: ${partialMatch.naam} for "${customerCity}"`);
        return partialMatch.naam;
    }
    // 3. Region-based matching with better city mapping
    const cityLower = normalizedCustomerCity;
    // Noord Nederland
    const noordCities = ['groningen', 'leeuwarden', 'assen', 'emmen', 'drachten', 'heerlen', 'venlo', 'roermond', 'sittard', 'maastricht'];
    if (noordCities.some(c => cityLower.includes(c)) ||
        cityLower.includes('friesland') ||
        cityLower.includes('drenthe') ||
        cityLower.includes('groningen')) {
        const noordMatch = normalizedLocations.find(loc => loc.normalizedStad.includes('groningen') ||
            loc.normalizedStad.includes('zwolle') ||
            loc.normalizedStad.includes('maastricht'));
        if (noordMatch) {
            console.log(`✅ Noord region match found: ${noordMatch.naam} for "${customerCity}"`);
            return noordMatch.naam;
        }
    }
    // Oost Nederland
    const oostCities = ['arnhem', 'nijmegen', 'enschede', 'apeldoorn', 'deventer', 'zwolle', 'almelo', 'hengelo', 'doetinchem', 'zutphen'];
    if (oostCities.some(c => cityLower.includes(c)) ||
        cityLower.includes('overijssel') ||
        cityLower.includes('gelderland')) {
        const oostMatch = normalizedLocations.find(loc => loc.normalizedStad.includes('arnhem') ||
            loc.normalizedStad.includes('zwolle') ||
            loc.normalizedStad.includes('utrecht'));
        if (oostMatch) {
            console.log(`✅ Oost region match found: ${oostMatch.naam} for "${customerCity}"`);
            return oostMatch.naam;
        }
    }
    // Zuid Nederland
    const zuidCities = ['eindhoven', 'tilburg', 'breda', 'den bosch', 's-hertogenbosch', 'helmond', 'oss', 'venray', 'roosendaal', 'bergen op zoom'];
    if (zuidCities.some(c => cityLower.includes(c)) ||
        cityLower.includes('limburg') ||
        cityLower.includes('brabant') ||
        cityLower.includes('noord-brabant')) {
        const zuidMatch = normalizedLocations.find(loc => loc.normalizedStad.includes('eindhoven') ||
            loc.normalizedStad.includes('breda') ||
            loc.normalizedStad.includes('maastricht'));
        if (zuidMatch) {
            console.log(`✅ Zuid region match found: ${zuidMatch.naam} for "${customerCity}"`);
            return zuidMatch.naam;
        }
    }
    // West Nederland
    const westCities = ['amsterdam', 'rotterdam', 'den haag', 'haag', 'haarlem', 'utrecht', 'leiden', 'delft', 'gouda', 'alkmaar', 'zaandam'];
    if (westCities.some(c => cityLower.includes(c)) ||
        cityLower.includes('holland') ||
        cityLower.includes('noord-holland') ||
        cityLower.includes('zuid-holland')) {
        const westMatch = normalizedLocations.find(loc => loc.normalizedStad.includes('amsterdam') ||
            loc.normalizedStad.includes('rotterdam') ||
            loc.normalizedStad.includes('haag') ||
            loc.normalizedStad.includes('utrecht'));
        if (westMatch) {
            console.log(`✅ West region match found: ${westMatch.naam} for "${customerCity}"`);
            return westMatch.naam;
        }
    }
    // 4. Default fallback - try Utrecht first, then first available
    const utrechtMatch = normalizedLocations.find(loc => loc.normalizedStad.includes('utrecht'));
    if (utrechtMatch) {
        console.log(`⚠️ Using default fallback: ${utrechtMatch.naam} for "${customerCity}"`);
        return utrechtMatch.naam;
    }
    if (richtingLocations.length > 0) {
        console.log(`⚠️ Using first available location: ${richtingLocations[0].naam} for "${customerCity}"`);
        return richtingLocations[0].naam;
    }
    console.log(`❌ No Richting location found for "${customerCity}"`);
    return undefined;
}
// Endpoint voor branche analyse
exports.analyseBranche = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 540, // 9 minutes (max for 2nd gen)
    memory: "512MiB" // Increase memory for large responses
}, async (req, res) => {
    var _a;
    // Set CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { organisatieNaam, website, customerId } = req.body;
    if (!organisatieNaam || !website) {
        res.status(400).json({ error: "organisatieNaam en website zijn verplicht" });
        return;
    }
    try {
        // Get active prompt from Firestore (use named database 'richting01')
        let promptTekst = DEFAULT_BRANCHE_ANALYSE_PROMPT;
        try {
            const db = getFirestoreDb();
            const promptsRef = db.collection('prompts');
            try {
                let activePromptQuery = await promptsRef
                    .where('type', '==', 'publiek_organisatie_profiel')
                    .where('isActief', '==', true)
                    .orderBy('versie', 'desc')
                    .limit(1)
                    .get();
                if (activePromptQuery.empty) {
                    // Fallback: check oude type naam voor backwards compatibility
                    activePromptQuery = await promptsRef
                        .where('type', '==', 'branche_analyse')
                        .where('isActief', '==', true)
                        .orderBy('versie', 'desc')
                        .limit(1)
                        .get();
                }
                if (!activePromptQuery.empty) {
                    const activeDoc = activePromptQuery.docs[0];
                    const data = activeDoc.data();
                    if (data.type === 'branche_analyse') {
                        try {
                            await activeDoc.ref.update({ type: 'publiek_organisatie_profiel' });
                            console.log('🔄 Migrated prompt type to publiek_organisatie_profiel (backend)');
                        }
                        catch (migrateErr) {
                            console.log('⚠️ Could not migrate prompt type on backend:', migrateErr.message);
                        }
                    }
                    promptTekst = data.promptTekst;
                    console.log(`Using active prompt version ${data.versie}`);
                }
                else {
                    console.log('No active prompt found, using default');
                }
            }
            catch (orderByError) {
                // If orderBy fails, try without orderBy and sort in memory
                console.log('⚠️ orderBy failed, trying without orderBy:', orderByError.message);
                let allActivePrompts = await promptsRef
                    .where('type', '==', 'publiek_organisatie_profiel')
                    .where('isActief', '==', true)
                    .get();
                if (allActivePrompts.empty) {
                    allActivePrompts = await promptsRef
                        .where('type', '==', 'branche_analyse')
                        .where('isActief', '==', true)
                        .get();
                }
                if (!allActivePrompts.empty) {
                    const sorted = allActivePrompts.docs.sort((a, b) => {
                        const versieA = a.data().versie || 0;
                        const versieB = b.data().versie || 0;
                        return versieB - versieA;
                    });
                    promptTekst = sorted[0].data().promptTekst;
                    console.log(`Using active prompt version ${sorted[0].data().versie} (sorted in memory)`);
                }
                else {
                    console.log('No active prompt found, using default');
                }
            }
        }
        catch (promptError) {
            console.error("Error fetching prompt from Firestore:", promptError);
            console.log("Using default prompt");
        }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `${promptTekst}

ORGANISATIE NAAM: ${organisatieNaam}
WEBSITE: ${website}

Voer nu de analyse uit en geef het resultaat in het gevraagde JSON formaat.`;
        // Fetch Richting locations once at the start
        const richtingLocations = await getRichtingLocations();
        console.log(`📍 Loaded ${richtingLocations.length} Richting locations`);
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        // Clean up markdown formatting
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        // Improved JSON repair: handle unescaped characters in string values more robustly
        // Strategy: iterate character by character and properly escape control characters inside strings
        let repaired = '';
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            const charCode = jsonStr.charCodeAt(i);
            const nextChar = i + 1 < jsonStr.length ? jsonStr[i + 1] : null;
            
            if (escapeNext) {
                // We're processing an escaped character
                // Check if it's a valid escape sequence
                const validEscapes = ['n', 'r', 't', 'b', 'f', '\\', '"', '/', 'u'];
                if (validEscapes.includes(char)) {
                    repaired += '\\' + char;
                    // Special handling for unicode sequences
                    if (char === 'u' && i + 4 < jsonStr.length) {
                        const unicodeSeq = jsonStr.substring(i + 1, i + 5);
                        if (/^[0-9A-Fa-f]{4}$/.test(unicodeSeq)) {
                            repaired += unicodeSeq;
                            i += 4; // Skip the next 4 characters
                        }
                    }
                }
                else if (char === 'u' && i + 4 < jsonStr.length) {
                    // Unicode escape sequence \uXXXX
                    const unicodeSeq = jsonStr.substring(i, i + 5);
                    if (/^u[0-9A-Fa-f]{4}$/.test(unicodeSeq)) {
                        repaired += '\\' + unicodeSeq;
                        i += 4; // Skip the next 4 characters
                    }
                    else {
                        // Invalid unicode escape, escape the backslash
                        repaired += '\\\\u';
                    }
                }
                else {
                    // Invalid escape sequence - escape the backslash and keep the character
                    repaired += '\\\\' + char;
                }
                escapeNext = false;
                continue;
            }
            
            // Check for double backslash (already escaped) - don't treat as escape start
            if (char === '\\' && nextChar === '\\' && inString) {
                // Double backslash in string - keep as is (already properly escaped)
                repaired += '\\\\';
                i++; // Skip next backslash
                continue;
            }
            
            if (char === '\\') {
                // Start of escape sequence
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                repaired += char;
                continue;
            }
            
            if (inString) {
                // Inside a string: escape control characters and special characters
                if (char === '\n') {
                    repaired += '\\n';
                }
                else if (char === '\r') {
                    repaired += '\\r';
                }
                else if (char === '\t') {
                    repaired += '\\t';
                }
                else if (char === '\b') {
                    repaired += '\\b';
                }
                else if (char === '\f') {
                    repaired += '\\f';
                }
                else if (char === '\\') {
                    // Unescaped backslash in string - should be escaped
                    repaired += '\\\\';
                }
                else if (char === '"') {
                    // Unescaped quote in string - should be escaped
                    repaired += '\\"';
                }
                else if (charCode >= 0x00 && charCode <= 0x1F) {
                    // Control characters (except already handled ones) - remove or escape
                    // For most control chars, we'll remove them
                    continue;
                }
                else if (charCode === 0x7F) {
                    // DEL character - remove
                    continue;
                }
                else {
                    repaired += char;
                }
            }
            else {
                // Outside a string: keep as is
                repaired += char;
            }
        }
        // If we ended with an escape sequence, close it properly
        if (escapeNext) {
            repaired += '\\\\';
        }
        jsonStr = repaired;
        let json;
        try {
            json = JSON.parse(jsonStr);
        }
        catch (parseError) {
            console.error("JSON Parse Error:", parseError.message);
            const errorPos = (_a = parseError.message.match(/position (\d+)/)) === null || _a === void 0 ? void 0 : _a[1];
            if (errorPos) {
                const pos = parseInt(errorPos);
                console.error("JSON String (around error position):", jsonStr.substring(Math.max(0, pos - 100), pos + 100));
            }
            console.error("JSON String (first 500 chars):", jsonStr.substring(0, 500));
            // Return a structured error response with CORS headers
            res.status(500).json({
                error: "Failed to parse Gemini response as JSON",
                details: parseError.message,
                rawResponse: jsonStr.substring(0, 2000)
            });
            return;
        }
        // Add richtingLocatie to each location and to personeleOmvang
        if (json.locaties && Array.isArray(json.locaties)) {
            json.locaties = json.locaties.map((locatie) => {
                if (locatie.stad) {
                    const nearestRichting = findNearestRichtingLocation(locatie.stad, richtingLocations);
                    if (nearestRichting) {
                        locatie.richtingLocatie = nearestRichting;
                        console.log(`📍 Added richtingLocatie "${nearestRichting}" to location "${locatie.naam}" in ${locatie.stad}`);
                    }
                }
                return locatie;
            });

            // Persist locaties to Firestore (richting01) if customerId is provided
            if (customerId) {
                try {
                    const db = getFirestoreDb();
                    const batch = db.batch();
                    json.locaties.forEach((locatie, idx) => {
                        const locRef = db.collection('locations').doc();
                        batch.set(locRef, {
                            customerId: customerId,
                            name: locatie.naam || locatie.name || `Locatie ${idx + 1}`,
                            address: locatie.adres || locatie.address || '',
                            city: locatie.stad || locatie.city || '',
                            employeeCount: locatie.aantalMedewerkers ?? locatie.aantal ?? null,
                            richtingLocatieNaam: locatie.richtingLocatie || null,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            updatedAt: admin.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batch.commit();
                    console.log(`💾 Saved ${json.locaties.length} locaties to Firestore for customer ${customerId}`);
                }
                catch (saveError) {
                    console.error('❌ Error saving locaties to Firestore:', saveError);
                }
            }
        }
        // Add richtingLocatie to each regio in personeleOmvang
        if (json.personeleOmvang && Array.isArray(json.personeleOmvang)) {
            json.personeleOmvang = json.personeleOmvang.map((regio) => {
                // Determine a representative city for this region
                let representativeCity = '';
                switch (regio.regio) {
                    case 'noord':
                        representativeCity = 'Groningen';
                        break;
                    case 'midden_oost':
                        representativeCity = 'Arnhem';
                        break;
                    case 'midden_zuid':
                        representativeCity = 'Utrecht';
                        break;
                    case 'zuid':
                        representativeCity = 'Eindhoven';
                        break;
                }
                if (representativeCity) {
                    const nearestRichting = findNearestRichtingLocation(representativeCity, richtingLocations);
                    if (nearestRichting) {
                        regio.richtingLocatie = nearestRichting;
                        console.log(`📍 Added richtingLocatie "${nearestRichting}" to regio "${regio.regio}"`);
                    }
                }
                return regio;
            });
        }
        res.json(json);
    }
    catch (error) {
        console.error("Branche Analyse Error:", error);
        // Always return a response, even on error
        res.status(500).json({
            error: error.message || "Unknown error occurred",
            type: error.name || "Error"
        });
    }
});
// Publiek Cultuur Profiel Analyse - gebruikt prompt type 'publiek_cultuur_profiel'
exports.analyseCultuurTest = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 540, // 9 minutes (max for 2nd gen)
    memory: "512MiB" // Increase memory for large responses
}, async (req, res) => {
    var _a, _b, _c, _d;
    // Set CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { organisatieNaam, website } = req.body;
    if (!organisatieNaam || !website) {
        res.status(400).json({ error: "organisatieNaam en website zijn verplicht" });
        return;
    }
    try {
        // Get active prompt from Firestore (use named database 'richting01')
        // EXACT SAME LOGIC AS analyseBranche (which works!)
        let promptTekst = DEFAULT_CULTUUR_PROFIEL_PROMPT;
        try {
            const db = getFirestoreDb();
            const promptsRef = db.collection('prompts');
            const activePromptQuery = await promptsRef
                .where('type', '==', 'publiek_cultuur_profiel')
                .where('isActief', '==', true)
                .orderBy('versie', 'desc')
                .limit(1)
                .get();
            if (!activePromptQuery.empty) {
                promptTekst = activePromptQuery.docs[0].data().promptTekst;
                console.log(`Using active publiek_cultuur_profiel prompt version ${activePromptQuery.docs[0].data().versie}`);
            }
            else {
                console.log('No active publiek_cultuur_profiel prompt found, using default');
            }
        }
        catch (promptError) {
            console.error("Error fetching prompt from Firestore:", promptError);
            console.log("Using default prompt");
        }
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `${promptTekst}

ORGANISATIE NAAM: ${organisatieNaam}
WEBSITE: ${website}

Voer nu de analyse uit en geef het resultaat in het gevraagde JSON formaat.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        // Clean up markdown formatting
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        // Improved JSON repair: handle unescaped newlines in string values more robustly
        // Use the same improved logic as analyseBranche
        let repaired = '';
        let inString = false;
        let escapeNext = false;
        for (let i = 0; i < jsonStr.length; i++) {
            const char = jsonStr[i];
            const charCode = jsonStr.charCodeAt(i);
            const nextChar = i + 1 < jsonStr.length ? jsonStr[i + 1] : null;
            
            if (escapeNext) {
                // We're processing an escaped character
                const validEscapes = ['n', 'r', 't', 'b', 'f', '\\', '"', '/', 'u'];
                if (validEscapes.includes(char)) {
                    repaired += '\\' + char;
                    // Special handling for unicode sequences
                    if (char === 'u' && i + 4 < jsonStr.length) {
                        const unicodeSeq = jsonStr.substring(i + 1, i + 5);
                        if (/^[0-9A-Fa-f]{4}$/.test(unicodeSeq)) {
                            repaired += unicodeSeq;
                            i += 4; // Skip the next 4 characters
                        }
                    }
                }
                else if (char === 'u' && i + 4 < jsonStr.length) {
                    const unicodeSeq = jsonStr.substring(i, i + 5);
                    if (/^u[0-9A-Fa-f]{4}$/.test(unicodeSeq)) {
                        repaired += '\\' + unicodeSeq;
                        i += 4;
                    }
                    else {
                        repaired += '\\\\u';
                    }
                }
                else {
                    repaired += '\\\\' + char;
                }
                escapeNext = false;
                continue;
            }
            
            // Check for double backslash (already escaped) - don't treat as escape start
            if (char === '\\' && nextChar === '\\' && inString) {
                repaired += '\\\\';
                i++; // Skip next backslash
                continue;
            }
            
            if (char === '\\') {
                escapeNext = true;
                continue;
            }
            
            if (char === '"' && !escapeNext) {
                inString = !inString;
                repaired += char;
                continue;
            }
            
            if (inString) {
                // Inside a string: escape control characters
                if (char === '\n') {
                    repaired += '\\n';
                }
                else if (char === '\r') {
                    repaired += '\\r';
                }
                else if (char === '\t') {
                    repaired += '\\t';
                }
                else if (char === '\b') {
                    repaired += '\\b';
                }
                else if (char === '\f') {
                    repaired += '\\f';
                }
                else if (char === '\\') {
                    repaired += '\\\\';
                }
                else if (char === '"') {
                    repaired += '\\"';
                }
                else if (charCode >= 0x00 && charCode <= 0x1F) {
                    continue;
                }
                else if (charCode === 0x7F) {
                    continue;
                }
                else {
                    repaired += char;
                }
            }
            else {
                repaired += char;
            }
        }
        if (escapeNext) {
            repaired += '\\\\';
        }
        jsonStr = repaired;
        let json;
        try {
            json = JSON.parse(jsonStr);
            console.log('✅ JSON parsed successfully');
            console.log('📊 Parsed JSON keys:', Object.keys(json));
            console.log('📊 JSON scores:', json.scores);
            console.log('📊 JSON dna:', json.dna);
        }
        catch (parseError) {
            console.error("JSON Parse Error:", parseError.message);
            const errorPos = (_a = parseError.message.match(/position (\d+)/)) === null || _a === void 0 ? void 0 : _a[1];
            if (errorPos) {
                const pos = parseInt(errorPos);
                console.error("JSON String (around error position):", jsonStr.substring(Math.max(0, pos - 100), pos + 100));
            }
            console.error("JSON String (first 500 chars):", jsonStr.substring(0, 500));
            // Return a structured error response with CORS headers
            res.status(500).json({
                error: "Failed to parse Gemini response as JSON",
                details: parseError.message,
                rawResponse: jsonStr.substring(0, 2000)
            });
            return;
        }
        // Transform JSON response to CultuurProfiel structure
        // Ensure all required fields are present with defaults
        const cultuurProfiel = {
            // Metadata (will be added by frontend)
            volledigRapport: json.volledigRapport || '',
            // 1. The Executive Pulse - check if scores exists and has values
            scores: json.scores && (json.scores.cultuurvolwassenheid !== undefined || json.scores.groeidynamiekScore !== undefined) ? {
                cultuurvolwassenheid: (_b = json.scores.cultuurvolwassenheid) !== null && _b !== void 0 ? _b : 0,
                groeidynamiekScore: (_c = json.scores.groeidynamiekScore) !== null && _c !== void 0 ? _c : 0,
                cultuurfit: (_d = json.scores.cultuurfit) !== null && _d !== void 0 ? _d : 0,
                cultuursterkte: json.scores.cultuursterkte || 'gemiddeld',
                dynamiekType: json.scores.dynamiekType || 'organisch_groeiend'
            } : {
                cultuurvolwassenheid: 0,
                groeidynamiekScore: 0,
                cultuurfit: 0,
                cultuursterkte: 'gemiddeld',
                dynamiekType: 'organisch_groeiend'
            },
            gaps: json.gaps || [],
            // 2. Het Cultuur DNA - check if dna exists and has typeScores
            dna: json.dna && json.dna.typeScores ? {
                dominantType: json.dna.dominantType || 'hybride',
                typeScores: json.dna.typeScores || {
                    adhocratie: 0,
                    clan: 0,
                    hiërarchie: 0,
                    markt: 0
                },
                kernwaarden: json.dna.kernwaarden || [],
                dimensies: json.dna.dimensies || []
            } : {
                dominantType: 'hybride',
                typeScores: {
                    adhocratie: 0,
                    clan: 0,
                    hiërarchie: 0,
                    markt: 0
                },
                kernwaarden: [],
                dimensies: []
            },
            // 3. De Impact Matrix (optional)
            performanceData: json.performanceData || [],
            engagementData: json.engagementData || [],
            // 4. Obstakels & Versnellers
            barrières: json.barrières || [],
            opportuniteiten: json.opportuniteiten || [],
            themas: json.themas || [],
            // 5. De Actie-Modus
            gedragingen: json.gedragingen || [],
            interventies: json.interventies || []
        };
        console.log('📤 Sending cultuurProfiel to frontend:', JSON.stringify(cultuurProfiel, null, 2).substring(0, 1000));
        res.json(cultuurProfiel);
    }
    catch (error) {
        console.error("Cultuur Test Analyse Error:", error);
        // Always return a response, even on error
        res.status(500).json({
            error: error.message || "Unknown error occurred",
            type: error.name || "Error"
        });
    }
});
// Export Rapport naar HTML (gebruiker kan dit in Google Docs plakken of downloaden als PDF)
// Helper function to fetch content from different sources (voor toekomstig gebruik)
// @ts-ignore - Function kept for future use
async function _fetchBestandContent(bestandsRef, db, firestoreDb) {
    const { type, url, documentId } = bestandsRef;
    try {
        if (type === 'google_drive') {
            // Extract file ID from URL
            const fileId = extractFileId(url || '');
            if (!fileId) {
                throw new Error(`Kon geen file ID extraheren uit Google Drive URL: ${url}`);
            }
            const { content } = await fetchDriveFileContent(fileId, 'application/vnd.google-apps.document', undefined);
            return content;
        }
        else if (type === 'kennisbank') {
            // Fetch document from Firestore (use named database 'richting01')
            if (!documentId) {
                throw new Error('Document ID ontbreekt voor kennisbank document');
            }
            if (!firestoreDb) {
                firestoreDb = getFirestoreDb();
            }
            const docRef = firestoreDb.collection('documents').doc(documentId);
            const docSnap = await docRef.get();
            if (!docSnap.exists) {
                throw new Error(`Kennisbank document niet gevonden: ${documentId}`);
            }
            const docData = docSnap.data();
            return (docData === null || docData === void 0 ? void 0 : docData.content) || (docData === null || docData === void 0 ? void 0 : docData.summary) || '';
        }
        else if (type === 'url') {
            // Fetch content from URL
            const response = await fetch(url || '');
            if (!response.ok) {
                throw new Error(`Kon URL niet ophalen: ${url} (Status: ${response.status})`);
            }
            const text = await response.text();
            // Basic HTML stripping (simple approach)
            return text.replace(/<[^>]*>/g, '').substring(0, 50000); // Limit to 50k chars
        }
        else {
            throw new Error(`Onbekend bestandstype: ${type}`);
        }
    }
    catch (error) {
        console.error(`Fout bij ophalen bestand (${type}):`, error);
        return `[Fout bij ophalen bestand: ${error.message}]`;
    }
}
exports.exportRapport = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 60,
    memory: "256MiB"
}, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    const { organisatieProfiel, formaat } = req.body;
    if (!organisatieProfiel || !formaat) {
        res.status(400).json({ error: "organisatieProfiel en formaat zijn verplicht" });
        return;
    }
    try {
        // Generate HTML content
        const htmlContent = generateHTMLRapport(organisatieProfiel);
        if (formaat === 'google_docs') {
            // For Google Docs: Return HTML that can be opened and imported
            // Note: Direct Google Docs API integration requires OAuth setup which is complex
            // This solution opens Google Docs and provides HTML for import
            res.json({
                htmlContent,
                instructions: "Het HTML bestand wordt voorbereid. Google Docs wordt geopend.",
                downloadUrl: `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
            });
        }
        else if (formaat === 'pdf') {
            // For PDF, return HTML that can be printed to PDF
            res.json({
                htmlContent,
                instructions: "Open de HTML in een browser en gebruik 'Print to PDF' of download het bestand.",
                downloadUrl: `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`
            });
        }
        else {
            res.status(400).json({ error: "Ongeldig formaat. Gebruik 'google_docs' of 'pdf'" });
        }
    }
    catch (error) {
        console.error("Export Error:", error);
        res.status(500).json({
            error: error.message || "Unknown error occurred",
            type: error.name || "Error"
        });
    }
});
// Helper function to generate HTML report
function generateHTMLRapport(profiel) {
    const date = new Date(profiel.analyseDatum).toLocaleDateString('nl-NL');
    let html = `<!DOCTYPE html>
<html lang="nl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organisatie Profiel - ${profiel.organisatieNaam}</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; }
        h1 { color: #ea580c; border-bottom: 3px solid #ea580c; padding-bottom: 10px; }
        h2 { color: #334155; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
        h3 { color: #475569; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
        th { background-color: #f1f5f9; font-weight: bold; }
        .rating { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; }
        .rating.laag { background-color: #dcfce7; color: #166534; }
        .rating.gemiddeld { background-color: #fef3c7; color: #92400e; }
        .rating.hoog { background-color: #fed7aa; color: #9a3412; }
        .rating.zeer_hoog { background-color: #fee2e2; color: #991b1b; }
        .score-box { display: inline-block; padding: 10px 20px; background-color: #f1f5f9; border-radius: 5px; margin: 10px 5px; }
        .risico-categorie { display: inline-block; padding: 3px 10px; border-radius: 3px; font-size: 0.85em; margin: 2px; }
        .risico-categorie.psychisch { background-color: #e9d5ff; color: #6b21a8; }
        .risico-categorie.fysiek { background-color: #dbeafe; color: #1e40af; }
        .risico-categorie.overige { background-color: #f3f4f6; color: #374151; }
    </style>
</head>
<body>
    <h1>Organisatie Profiel: ${profiel.organisatieNaam}</h1>
    <p><strong>Website:</strong> ${profiel.website}</p>
    <p><strong>Analyse Datum:</strong> ${date}</p>
    
    <div style="margin: 20px 0;">
        <div class="score-box">
            <strong>Rating:</strong> <span class="rating ${profiel.rating.werkEnGezondheid}">${getRatingLabel(profiel.rating.werkEnGezondheid)}</span>
        </div>
        <div class="score-box">
            <strong>Totaal Score:</strong> ${profiel.totaalScore}
        </div>
        <div class="score-box">
            <strong>Gemiddelde Risico:</strong> ${profiel.gemiddeldeRisicoScore.toFixed(1)}
        </div>
    </div>`;
    // Add full report - convert markdown to HTML
    if (profiel.volledigRapport) {
        html += `<h2>Volledig Rapport</h2>
        <div style="white-space: pre-wrap; background-color: #f8fafc; padding: 20px; border-radius: 5px; font-family: Arial, sans-serif;">
${convertMarkdownToHTML(profiel.volledigRapport)}
        </div>`;
    }
    // Add risks table
    if (profiel.risicos && profiel.risicos.length > 0) {
        html += `<h2>Risico's</h2>
        <table>
            <thead>
                <tr>
                    <th>Risico</th>
                    <th>Categorie</th>
                    <th>Kans</th>
                    <th>Effect</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody>`;
        profiel.risicos.forEach((risico) => {
            html += `<tr>
                <td>${risico.naam}</td>
                <td><span class="risico-categorie ${risico.categorie}">${risico.categorie}</span></td>
                <td>${risico.kans}</td>
                <td>${risico.effect}</td>
                <td><strong>${risico.totaalScore}</strong></td>
            </tr>`;
        });
        html += `</tbody></table>`;
    }
    html += `</body></html>`;
    return html;
}
function getRatingLabel(rating) {
    const labels = {
        'laag': 'Laag Risico',
        'gemiddeld': 'Gemiddeld Risico',
        'hoog': 'Hoog Risico',
        'zeer_hoog': 'Zeer Hoog Risico'
    };
    return labels[rating] || rating;
}
// Helper function to convert markdown to HTML
function convertMarkdownToHTML(markdown) {
    let html = markdown;
    // Convert headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    // Convert bold
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert italic
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Convert lists
    html = html.replace(/^\- (.*$)/gim, '<li>$1</li>');
    // Wrap list items in ul tags (using [\s\S] instead of . with s flag for compatibility)
    html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
    // Convert tables (basic)
    html = html.replace(/\|(.*)\|/g, (match) => {
        const cells = match.split('|').filter(c => c.trim());
        if (cells.length > 0) {
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        }
        return match;
    });
    // Convert line breaks
    html = html.replace(/\n\n/g, '</p><p>');
    html = html.replace(/\n/g, '<br>');
    // Wrap in paragraphs
    html = '<p>' + html + '</p>';
    return html;
}
// Endpoint voor website zoeken op basis van bedrijfsnaam
exports.searchCompanyWebsite = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    // Set CORS headers explicitly
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { companyName } = req.body;
    if (!companyName) {
        res.status(400).json({ error: "companyName is verplicht" });
        return;
    }
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Je bent een assistent die helpt bij het vinden van de officiële website van een bedrijf.

BEDRIJFSNAAM: ${companyName}

BELANGRIJK:
- Voor Nederlandse bedrijven: geef .nl domeinen ALTIJD prioriteit, gevolgd door .com
- Probeer eerst: [bedrijfsnaam].nl en [bedrijfsnaam].com
- Voor het bedrijf "Richting": zoek specifiek naar "richting.nl" en "richting.com"
- Verwijder spaties en speciale tekens uit de bedrijfsnaam voor het domein (bijv. "Jansen Bouw" -> "jansenbouw.nl")
- Geef maximaal 5 resultaten, gesorteerd op waarschijnlijkheid (meest waarschijnlijk eerst)
- .nl domeinen krijgen "high" confidence, .com krijgt "high" of "medium", andere TLDs krijgen "medium" of "low"

Geef het antwoord ALLEEN in puur JSON formaat:
{
  "websites": [
    {
      "url": "https://bedrijfsnaam.nl",
      "title": "Bedrijfsnaam - Officiële Website",
      "snippet": "Korte beschrijving van de website",
      "confidence": "high|medium|low"
    }
  ]
}

Zorg dat alle URLs volledig zijn (met https://). Als je geen website kunt vinden, geef dan een lege array terug.`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let jsonStr = response.text();
        // Clean up markdown formatting
        jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
        // Try to extract JSON if it's wrapped in other text
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }
        let json;
        try {
            json = JSON.parse(jsonStr);
        }
        catch (parseError) {
            console.error("JSON Parse Error:", parseError.message);
            // Return empty results if parsing fails
            res.json({ websites: [] });
            return;
        }
        // Validate and return results
        const websites = (json.websites || []).map((w) => ({
            url: w.url || '',
            title: w.title || w.url || '',
            snippet: w.snippet || '',
            confidence: w.confidence || 'medium'
        })).filter((w) => w.url && w.url.startsWith('http'));
        res.json({ websites });
    }
    catch (error) {
        console.error("Website Search Error:", error);
        res.status(500).json({
            error: error.message || "Unknown error occurred",
            websites: []
        });
    }
});
// Endpoint voor het zoeken naar RIE rapportages in Google Drive
exports.checkRIERapportage = (0, https_1.onRequest)({
    cors: true,
    invoker: 'public'
}, async (req, res) => {
    var _a, _b, _c, _d;
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { folderId } = req.body;
        console.log(`🔍 Checking RIE rapportage for folder ID: ${folderId}`);
        if (!folderId) {
            res.status(400).json({ error: 'Folder ID is required' });
            return;
        }
        // Initialize Google Drive API using Application Default Credentials
        // This will use the Firebase default service account
        // Make sure the service account has access to the Google Drive folders
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
            // Use Application Default Credentials (ADC) - Firebase Functions default service account
        });
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        // Helper function to normalize folder names for matching
        const normalizeFolderName = (name) => {
            return name.toLowerCase()
                .replace(/&/g, '')
                .replace(/[''"]/g, '') // Remove apostrophes and quotes
                .replace(/[^a-z0-9]/g, '')
                .trim();
        };
        // Helper function to check if a folder name matches RIE patterns
        const isRIEFolder = (folderName) => {
            if (!folderName)
                return false;
            const normalized = normalizeFolderName(folderName);
            console.log(`   🔍 Checking folder name: "${folderName}" -> normalized: "${normalized}"`);
            // Match: "rie", "ri&e", "ries", "ri&es", "risicoinventarisatie", etc.
            const matches = normalized.includes('rie') ||
                normalized.includes('risicoinventarisatie') ||
                normalized.includes('risicoevaluatie');
            if (matches) {
                console.log(`   ✅ MATCH: "${folderName}" is a RIE folder!`);
            }
            return matches;
        };
        // Recursive function to search for RIE folder in a folder and its subfolders
        const findRIEFolderRecursive = async (parentFolderId, depth = 0, maxDepth = 3) => {
            var _a, _b;
            if (depth > maxDepth) {
                console.log(`   ⚠️ Max depth (${maxDepth}) reached, stopping search`);
                return null;
            }
            const indent = '  '.repeat(depth);
            console.log(`${indent}📂 Searching in folder (depth ${depth}): ${parentFolderId}`);
            try {
                // List all folders in the current folder
                const foldersResponse = await drive.files.list({
                    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
                    fields: 'files(id, name)',
                    pageSize: 100
                });
                const allFolders = foldersResponse.data.files || [];
                console.log(`${indent}📁 Found ${allFolders.length} folders:`);
                allFolders.forEach(folder => {
                    console.log(`${indent}   - "${folder.name}" (ID: ${folder.id})`);
                });
                // If no folders found, it might be a permission issue
                if (allFolders.length === 0 && depth === 0) {
                    console.log(`${indent}⚠️ No folders found in root folder. This might indicate a permission issue.`);
                }
                // First, check if any direct subfolder is a RIE folder
                const rieFolder = allFolders.find(folder => {
                    if (!folder.name)
                        return false;
                    const matches = isRIEFolder(folder.name);
                    if (matches) {
                        console.log(`${indent}   ✅ MATCH found: "${folder.name}"`);
                    }
                    return matches;
                });
                if (rieFolder === null || rieFolder === void 0 ? void 0 : rieFolder.id) {
                    console.log(`${indent}✅ Found RIE folder: "${rieFolder.name}" (ID: ${rieFolder.id})`);
                    return rieFolder.id;
                }
                // If not found, recursively search in subfolders
                console.log(`${indent}⚠️ No RIE folder found in direct children, searching in subfolders...`);
                for (const subfolder of allFolders) {
                    if (subfolder.id) {
                        const found = await findRIEFolderRecursive(subfolder.id, depth + 1, maxDepth);
                        if (found) {
                            return found;
                        }
                    }
                }
                return null;
            }
            catch (error) {
                console.error(`${indent}❌ Error searching in folder ${parentFolderId}:`, error.message);
                console.error(`${indent}   Error code: ${error.code}, Error details:`, JSON.stringify(error, null, 2));
                // If it's a permission error, log it clearly
                if (error.code === 403 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('permission')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('access'))) {
                    console.error(`${indent}   ⚠️ PERMISSION ERROR: Service account may not have access to this folder`);
                }
                return null;
            }
        };
        // Start recursive search from the root folder
        let rieFolderId = null;
        try {
            // First, verify we can access the root folder
            try {
                const rootFolder = await drive.files.get({
                    fileId: folderId,
                    fields: 'id, name, mimeType'
                });
                console.log(`✅ Can access root folder: "${rootFolder.data.name}" (ID: ${folderId}, Type: ${rootFolder.data.mimeType})`);
            }
            catch (accessError) {
                console.error(`❌ Cannot access root folder ${folderId}:`, accessError.message);
                if (accessError.code === 404) {
                    res.status(404).json({
                        error: 'Folder niet gevonden. Controleer of de folder ID correct is.',
                        aanwezig: false,
                        actueel: false
                    });
                    return;
                }
                if (accessError.code === 403) {
                    res.status(403).json({
                        error: 'Service account heeft geen toegang tot deze Google Drive map. Geef de service account "Viewer" toegang tot de map.',
                        aanwezig: false,
                        actueel: false
                    });
                    return;
                }
            }
            console.log(`🔍 Starting recursive search for RIE folder in: ${folderId}`);
            rieFolderId = await findRIEFolderRecursive(folderId, 0, 3);
            if (rieFolderId) {
                console.log(`✅ RIE folder found: ${rieFolderId}`);
            }
            else {
                console.log(`⚠️ No RIE folder found after recursive search`);
            }
        }
        catch (error) {
            console.error('Error finding RIE folder:', error);
            // Check if it's an authentication error
            if (error.code === 403 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('permission')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('access'))) {
                console.error('Authentication error - service account needs access to Google Drive folders');
                res.status(403).json({
                    error: 'Service account heeft geen toegang tot deze Google Drive map. Geef de service account toegang tot de map.',
                    aanwezig: false,
                    actueel: false
                });
                return;
            }
            // Continue even if we can't find the folder (might not exist)
        }
        // If we found the RIE folder, search for files in it
        let rieFiles = [];
        let latestFile = null;
        let latestDate = null;
        if (rieFolderId) {
            try {
                // Search for ALL files in RIE folder (not just those with "RIE" in name)
                // Since the folder is already identified as RIE, all files in it are likely RIE-related
                // Filter for common document types: PDFs, Word docs, Google Docs
                const filesResponse = await drive.files.list({
                    q: `'${rieFolderId}' in parents and trashed=false and (mimeType='application/pdf' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document' or mimeType='application/msword')`,
                    fields: 'files(id, name, modifiedTime, mimeType, webViewLink)',
                    orderBy: 'modifiedTime desc',
                    pageSize: 100
                });
                rieFiles = filesResponse.data.files || [];
                console.log(`✅ Found ${rieFiles.length} files in RIE folder`);
                // Find the most recent file
                if (rieFiles.length > 0) {
                    latestFile = rieFiles[0];
                    if (latestFile.modifiedTime) {
                        latestDate = new Date(latestFile.modifiedTime);
                        console.log(`✅ Latest RIE file: "${latestFile.name}" (modified: ${latestDate.toISOString()})`);
                    }
                }
                else {
                    console.log(`⚠️ No files found in RIE folder ${rieFolderId}`);
                }
            }
            catch (error) {
                console.error('Error searching RIE files:', error);
                // Check if it's an authentication error
                if (error.code === 403 || ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('permission')) || ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('access'))) {
                    console.error('Authentication error - service account needs access to Google Drive folders');
                    // Don't return error, just return no results
                }
            }
        }
        // Determine if RIE is present and current
        const isPresent = rieFiles.length > 0;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        const isActueel = latestDate ? latestDate >= oneYearAgo : false;
        res.json({
            aanwezig: isPresent,
            actueel: isActueel,
            laatsteUpdate: latestDate === null || latestDate === void 0 ? void 0 : latestDate.toISOString(),
            bestandsnaam: latestFile === null || latestFile === void 0 ? void 0 : latestFile.name,
            webViewLink: (latestFile === null || latestFile === void 0 ? void 0 : latestFile.webViewLink) || ((latestFile === null || latestFile === void 0 ? void 0 : latestFile.id) ? `https://drive.google.com/file/d/${latestFile.id}/view` : undefined),
            aantalBestanden: rieFiles.length
        });
    }
    catch (error) {
        console.error('Error checking RIE rapportage:', error);
        res.status(500).json({
            error: 'Failed to check RIE rapportage',
            details: error.message
        });
    }
});
// Endpoint voor het automatisch zoeken naar Google Drive mappen op basis van klantnaam
exports.searchDriveFolder = (0, https_1.onRequest)({
    cors: true,
    invoker: 'public'
}, async (req, res) => {
    var _a, _b;
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    try {
        const { customerName } = req.body;
        if (!customerName) {
            res.status(400).json({ error: 'Customer name is required' });
            return;
        }
        // Initialize Google Drive API
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        // Search for folders matching the customer name
        // We'll search in a parent folder if you have one, or search globally
        // For now, we'll search for folders with the customer name
        // Try to find a parent "Klanten" or "Customers" folder first
        let parentFolderId = null;
        try {
            // Search for a parent folder that might contain all customer folders
            // You can customize this search query based on your folder structure
            const parentSearch = await drive.files.list({
                q: "mimeType='application/vnd.google-apps.folder' and trashed=false and (name contains 'Klanten' or name contains 'Customers' or name contains 'Clienten')",
                fields: 'files(id, name)',
                pageSize: 10
            });
            // Use the first matching parent folder if found
            if (parentSearch.data.files && parentSearch.data.files.length > 0) {
                parentFolderId = parentSearch.data.files[0].id || null;
            }
        }
        catch (error) {
            console.log('No parent folder found, searching globally');
        }
        // Search for folders matching customer name
        const searchQuery = parentFolderId
            ? `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false and name contains '${customerName}'`
            : `mimeType='application/vnd.google-apps.folder' and trashed=false and name contains '${customerName}'`;
        const foldersResponse = await drive.files.list({
            q: searchQuery,
            fields: 'files(id, name, webViewLink)',
            pageSize: 20,
            orderBy: 'modifiedTime desc'
        });
        const folders = foldersResponse.data.files || [];
        // Filter and rank results by name similarity
        const rankedFolders = folders
            .map(folder => {
            const name = folder.name || '';
            const similarity = calculateSimilarity(customerName.toLowerCase(), name.toLowerCase());
            return {
                id: folder.id,
                name: folder.name,
                webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
                similarity
            };
        })
            .filter(f => f.similarity > 0.3) // Only include folders with >30% similarity
            .sort((a, b) => b.similarity - a.similarity); // Sort by similarity
        res.json({
            folders: rankedFolders,
            bestMatch: rankedFolders.length > 0 ? rankedFolders[0] : null
        });
    }
    catch (error) {
        console.error('Error searching Drive folder:', error);
        // Check if it's an authentication error
        if (error.code === 403 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('permission')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('access'))) {
            res.status(403).json({
                error: 'Service account heeft geen toegang. Geef de service account toegang tot Google Drive.',
                folders: []
            });
            return;
        }
        res.status(500).json({
            error: 'Failed to search Drive folder',
            details: error.message,
            folders: []
        });
    }
});
// Helper function to calculate string similarity (simple Levenshtein-based)
function calculateSimilarity(str1, str2) {
    // Simple similarity: check if one contains the other, or calculate character overlap
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    // Exact match
    if (s1 === s2)
        return 1.0;
    // One contains the other
    if (s1.includes(s2) || s2.includes(s1)) {
        return Math.max(s1.length, s2.length) / Math.min(s1.length, s2.length) * 0.8;
    }
    // Calculate character overlap
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    let matches = 0;
    for (let i = 0; i < shorter.length; i++) {
        if (longer.includes(shorter[i])) {
            matches++;
        }
    }
    return matches / longer.length;
}
// Endpoint voor het ophalen van alle klantmappen uit de "Klanten" map
exports.getCustomerFolders = (0, https_1.onRequest)({
    invoker: 'public' // Make function publicly accessible
}, async (req, res) => {
    var _a, _b;
    console.log(`📥 getCustomerFolders called - Method: ${req.method}, Headers:`, JSON.stringify(req.headers));
    // Handle preflight OPTIONS request FIRST
    if (req.method === 'OPTIONS') {
        console.log('✅ Handling OPTIONS preflight request');
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');
        console.log('✅ CORS headers set for OPTIONS, sending 204');
        res.status(204).end();
        return;
    }
    console.log(`📥 Processing ${req.method} request`);
    // Set CORS headers for all other requests
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
        const { parentFolderId } = req.body; // Optioneel: specifieke parent folder ID
        // Initialize Google Drive API
        const auth = new googleapis_1.google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });
        const drive = googleapis_1.google.drive({ version: 'v3', auth });
        let klantenFolderId = parentFolderId || null;
        // Als geen parentFolderId is opgegeven, zoek naar "Klanten" map
        if (!klantenFolderId) {
            console.log('🔍 Searching for "Klanten" folder...');
            // Zoek naar folders met namen zoals "Klanten", "Customers", "Clienten"
            const searchTerms = ['Klanten', 'Customers', 'Clienten', 'Klantendossiers'];
            for (const term of searchTerms) {
                try {
                    const searchResponse = await drive.files.list({
                        q: `mimeType='application/vnd.google-apps.folder' and trashed=false and (name='${term}' or name contains '${term}')`,
                        fields: 'files(id, name)',
                        pageSize: 10
                    });
                    if (searchResponse.data.files && searchResponse.data.files.length > 0) {
                        klantenFolderId = searchResponse.data.files[0].id || null;
                        console.log(`✅ Found "${term}" folder: ${klantenFolderId}`);
                        break;
                    }
                }
                catch (error) {
                    console.log(`⚠️ Error searching for "${term}":`, error.message);
                }
            }
            if (!klantenFolderId) {
                res.set('Access-Control-Allow-Origin', '*');
                res.status(404).json({
                    error: 'Geen "Klanten" map gevonden. Geef een parentFolderId op of zorg dat er een map met de naam "Klanten", "Customers" of "Clienten" bestaat.',
                    folders: []
                });
                return;
            }
        }
        else {
            // Verifieer dat de opgegeven folder bestaat
            try {
                const folderInfo = await drive.files.get({
                    fileId: klantenFolderId,
                    fields: 'id, name, mimeType'
                });
                console.log(`✅ Using provided folder: "${folderInfo.data.name}" (${klantenFolderId})`);
            }
            catch (error) {
                res.set('Access-Control-Allow-Origin', '*');
                if (error.code === 404) {
                    res.status(404).json({
                        error: 'Folder niet gevonden',
                        folders: []
                    });
                    return;
                }
                if (error.code === 403) {
                    res.status(403).json({
                        error: 'Service account heeft geen toegang tot deze map',
                        folders: []
                    });
                    return;
                }
                throw error;
            }
        }
        // Haal alle submappen op uit de Klanten map
        console.log(`📂 Fetching customer folders from: ${klantenFolderId}`);
        const foldersResponse = await drive.files.list({
            q: `'${klantenFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
            fields: 'files(id, name, webViewLink, modifiedTime)',
            pageSize: 500, // Genoeg voor veel klanten
            orderBy: 'name'
        });
        const folders = foldersResponse.data.files || [];
        console.log(`✅ Found ${folders.length} customer folders`);
        // Format de folders voor de response
        const customerFolders = folders.map(folder => ({
            id: folder.id,
            name: folder.name || 'Onbekend',
            webViewLink: folder.webViewLink || `https://drive.google.com/drive/folders/${folder.id}`,
            modifiedTime: folder.modifiedTime
        }));
        res.json({
            parentFolderId: klantenFolderId,
            folders: customerFolders,
            count: customerFolders.length
        });
    }
    catch (error) {
        console.error('Error getting customer folders:', error);
        // Ensure CORS headers are set even on errors
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        // Check if it's an authentication error
        if (error.code === 403 || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('permission')) || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('access'))) {
            res.status(403).json({
                error: 'Service account heeft geen toegang. Geef de service account toegang tot Google Drive.',
                folders: []
            });
            return;
        }
        res.status(500).json({
            error: 'Failed to get customer folders',
            details: error.message,
            folders: []
        });
    }
});
// Helper function to extract key data from hoofdstuk content
function extractKeyDataFromHoofdstuk(hoofdstukNummer, content, jsonData) {
    const keyData = {};
    if (hoofdstukNummer === '4' && jsonData && jsonData.risicos) {
        keyData.risicos = jsonData.risicos;
    }
    if (hoofdstukNummer === '5' && jsonData && jsonData.processen) {
        keyData.processen = jsonData.processen;
    }
    if (hoofdstukNummer === '6' && jsonData && jsonData.functies) {
        keyData.functies = jsonData.functies;
    }
    // Locaties kunnen in hoofdstuk 1 of 2 zitten (afhankelijk van prompt)
    if ((hoofdstukNummer === '1' || hoofdstukNummer === '2') && jsonData) {
        if (jsonData.sbiCodes) keyData.sbiCodes = jsonData.sbiCodes;
        if (jsonData.locaties) keyData.locaties = jsonData.locaties;
        if (jsonData.personeleOmvang) keyData.personeleOmvang = jsonData.personeleOmvang;
    }
    return keyData;
}
// Helper function to create context summary for prompts (OPTIMIZED: shorter, more focused)
function createContextSummary(context, currentHoofdstukNummer) {
    let summary = `ORGANISATIE: ${context.organisatieNaam}\nWEBSITE: ${context.website}\n`;
    if (context.metadata.branche) {
        summary += `BRANCHE: ${context.metadata.branche}\n`;
    }
    
    const hoofdstukKeys = Object.keys(context.hoofdstukken).sort();
    if (hoofdstukKeys.length === 0) {
        return summary; // No previous hoofdstukken yet
    }
    
    summary += '\nVOORGAANDE HOOFDSTUKKEN (samenvatting):\n';
    
    // Only include relevant context - limit to last 3 hoofdstukken for efficiency
    const relevantKeys = hoofdstukKeys.slice(-3);
    
    relevantKeys.forEach((key) => {
        const h = context.hoofdstukken[key];
        // Truncate samenvatting to max 50 words for efficiency
        const shortSummary = h.samenvatting ? h.samenvatting.split(' ').slice(0, 50).join(' ') + '...' : '';
        summary += `\nHoofdstuk ${key}: ${h.titel} - ${shortSummary}`;
        
        // Only add key data for critical hoofdstukken (risicos, processen, functies)
        if (h.keyData) {
            if (h.keyData.risicos && h.keyData.risicos.length > 0) {
                const risicoNames = h.keyData.risicos.slice(0, 10).map(r => r.naam).join(', ');
                summary += `\n  Risico's: ${risicoNames}${h.keyData.risicos.length > 10 ? '...' : ''}`;
            }
            if (h.keyData.processen && h.keyData.processen.length > 0) {
                const procesNames = h.keyData.processen.slice(0, 5).map(p => p.naam).join(', ');
                summary += `\n  Processen: ${procesNames}${h.keyData.processen.length > 5 ? '...' : ''}`;
            }
            if (h.keyData.functies && h.keyData.functies.length > 0) {
                const functieNames = h.keyData.functies.slice(0, 5).map(f => f.naam).join(', ');
                summary += `\n  Functies: ${functieNames}${h.keyData.functies.length > 5 ? '...' : ''}`;
            }
        }
    });
    
    return summary;
}
// Helper function to parse hoofdstukken from prompt text
function parseHoofdstukkenFromPrompt(promptText) {
    const hoofdstukken = [];
    // Pattern to match: "Hoofdstuk X: Titel" or "Hoofdstuk X: Titel" followed by description
    // Also handle variations like "Hoofdstuk X - Titel" or "Hoofdstuk X Titel"
    const hoofdstukPattern = /Hoofdstuk\s+(\d+)[:\-\s]+([^\n]+)/gi;
    const lines = promptText.split('\n');
    let currentHoofdstuk = null;
    let currentBeschrijving = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(/Hoofdstuk\s+(\d+)[:\-\s]+(.+)/i);
        
        if (match) {
            // Save previous hoofdstuk if exists
            if (currentHoofdstuk) {
                hoofdstukken.push({
                    nummer: currentHoofdstuk.nummer,
                    titel: currentHoofdstuk.titel,
                    beschrijving: currentBeschrijving.join('\n').trim() || currentHoofdstuk.titel
                });
            }
            // Start new hoofdstuk
            currentHoofdstuk = {
                nummer: match[1],
                titel: match[2].trim()
            };
            currentBeschrijving = [];
        } else if (currentHoofdstuk && line) {
            // Check if line starts with bullet or dash (description item)
            if (line.match(/^[-*]\s/) || line.match(/^\d+\.\s/)) {
                currentBeschrijving.push(line);
            } else if (line.length > 0 && !line.match(/^(DE GOUDEN|OPDRACHT|BELANGRIJK|CRUCIALE|Aanhef|Inleiding)/i)) {
                // Add to description if it's not a section header
                currentBeschrijving.push(line);
            }
        }
    }
    
    // Add last hoofdstuk
    if (currentHoofdstuk) {
        hoofdstukken.push({
            nummer: currentHoofdstuk.nummer,
            titel: currentHoofdstuk.titel,
            beschrijving: currentBeschrijving.join('\n').trim() || currentHoofdstuk.titel
        });
    }
    
    // Sort by hoofdstuk number
    hoofdstukken.sort((a, b) => parseInt(a.nummer) - parseInt(b.nummer));
    
    console.log(`✅ Parsed ${hoofdstukken.length} hoofdstukken from prompt`);
    return hoofdstukken;
}
// Helper function to generate hoofdstuk prompt (OPTIMIZED: shorter base prompt)
function generateHoofdstukPrompt(hoofdstukNummer, titel, beschrijving, context) {
    const contextSummary = createContextSummary(context, hoofdstukNummer);
    
    // OPTIMIZATION: Instead of sending the full base prompt every time, send only essential instructions
    // Extract only the core instructions from base prompt (first 500 chars should contain the key instructions)
    const basePromptText = context.basePrompt || DEFAULT_BRANCHE_ANALYSE_PROMPT;
    const coreInstructions = basePromptText.substring(0, 800) + '...'; // Limit base prompt to first 800 chars
    
    return `
Je bent Gemini, geconfigureerd als een deskundige adviseur voor Richting, een toonaangevende arbodienst in Nederland.

CORE INSTRUCTIES:
${coreInstructions}

BELANGRIJK: Je werkt nu aan een STAPSGEWIJZE analyse. Dit betekent dat je alleen Hoofdstuk ${hoofdstukNummer} genereert, niet het volledige rapport.

CONTEXT:
${contextSummary}

HUIDIGE TAAK:
Genereer ALLEEN Hoofdstuk ${hoofdstukNummer}: ${titel}

${beschrijving}

BELANGRIJK VOOR STAPSGEWIJZE ANALYSE:
- Je genereert ALLEEN dit hoofdstuk, niet het volledige rapport
- Gebruik de context van voorgaande hoofdstukken (zie hierboven)
- Verwijs consistent naar eerder genoemde informatie
- Zorg dat stijl en toon consistent blijven (persoonlijk, professioneel, proactief, 'u'-vorm)
- Als je verwijst naar risico's, gebruik EXACT dezelfde namen als in hoofdstuk 4
- Als je verwijst naar processen, gebruik EXACT dezelfde namen als in hoofdstuk 5
- Als je verwijst naar functies, gebruik EXACT dezelfde namen als in hoofdstuk 6
- Schrijf vanuit de identiteit en expertise van Richting
- Richt je tot de directie van ${context.organisatieNaam}

Geef het antwoord ALLEEN in puur, geldig JSON formaat:
{
  "hoofdstuk${hoofdstukNummer}": "Markdown content van het hoofdstuk",
  "samenvatting": "Korte samenvatting (max 100 woorden) voor context in volgende hoofdstukken"
  ${hoofdstukNummer === '4' ? ',\n  "risicos": [{"id": "...", "naam": "...", "categorie": "...", "kans": 1-5, "effect": 1-5, "blootstelling": 1-10, "risicogetal": 0, "prioriteit": 1-5}]' : ''}
  ${hoofdstukNummer === '5' ? ',\n  "processen": [{"id": "...", "naam": "...", "beschrijving": "..."}]' : ''}
  ${hoofdstukNummer === '6' ? ',\n  "functies": [{"id": "...", "naam": "...", "beschrijving": "...", "taken": ["..."]}]' : ''}
  ${hoofdstukNummer === '2' ? ',\n  "sbiCodes": [{"code": "...", "omschrijving": "..."}],\n  "locaties": [{"naam": "...", "adres": "...", "stad": "...", "aantalMedewerkers": 0}],\n  "personeleOmvang": [{"regio": "...", "aantal": 0}]' : ''}
}
`;
}
// Stapsgewijze Analyse Orchestrator
exports.analyseBrancheStapsgewijs = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 540,
    memory: "512MiB"
}, async (req, res) => {
    var _a;
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { organisatieNaam, website, customerId } = req.body;
    if (!organisatieNaam || !website) {
        res.status(400).json({ error: "organisatieNaam en website zijn verplicht" });
        return;
    }
    const analyseId = `analyse_${Date.now()}`;
    const db = getFirestoreDb();
    const progressRef = db.collection('analyseProgress').doc(analyseId);
    // Initialize progress
    const initialProgress = {
        analyseId,
        customerId: customerId || '',
        status: 'running',
        progress: {
            totaal: 0, // Will be updated after parsing hoofdstukken from prompt
            voltooid: 0,
            huidigeStap: 0
        },
        hoofdstukken: {},
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await progressRef.set(initialProgress);
    // Start async processing (don't wait for completion)
    processAnalyseStapsgewijs(organisatieNaam, website, analyseId, customerId).catch((error) => {
        console.error('Analyse error:', error);
        progressRef.update({
            status: 'failed',
            error: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    // Return immediately with analyseId
    res.json({
        analyseId,
        message: 'Analyse gestart. Gebruik analyseId om progress op te halen.',
        progressUrl: `/analyseProgress/${analyseId}`
    });
});
// Async function to process the analysis
async function processAnalyseStapsgewijs(organisatieNaam, website, analyseId, customerId) {
    const db = getFirestoreDb();
    const progressRef = db.collection('analyseProgress').doc(analyseId);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    // Get active prompt from Firestore
    let basePrompt = DEFAULT_BRANCHE_ANALYSE_PROMPT;
    try {
        const promptsRef = db.collection('prompts');
        try {
            let activePromptQuery = await promptsRef
                .where('type', '==', 'publiek_organisatie_profiel')
                .where('isActief', '==', true)
                .orderBy('versie', 'desc')
                .limit(1)
                .get();
            if (activePromptQuery.empty) {
                activePromptQuery = await promptsRef
                    .where('type', '==', 'branche_analyse')
                    .where('isActief', '==', true)
                    .orderBy('versie', 'desc')
                    .limit(1)
                    .get();
            }
            if (!activePromptQuery.empty) {
                const activeDoc = activePromptQuery.docs[0];
                const data = activeDoc.data();
                if (data.type === 'branche_analyse') {
                    try {
                        await activeDoc.ref.update({ type: 'publiek_organisatie_profiel' });
                        console.log('🔄 Migrated prompt type to publiek_organisatie_profiel (backend stapsgewijs)');
                    }
                    catch (migrateErr) {
                        console.log('⚠️ Could not migrate prompt type on backend (stapsgewijs):', migrateErr.message);
                    }
                }
                basePrompt = data.promptTekst;
                console.log(`✅ Using active prompt version ${data.versie} for stapsgewijze analyse`);
            }
            else {
                console.log('⚠️ No active prompt found for stapsgewijze analyse, using default');
            }
        }
        catch (orderByError) {
            console.log('⚠️ orderBy failed for stapsgewijze analyse, trying without orderBy:', orderByError.message);
            let allActivePrompts = await promptsRef
                .where('type', '==', 'publiek_organisatie_profiel')
                .where('isActief', '==', true)
                .get();
            if (allActivePrompts.empty) {
                allActivePrompts = await promptsRef
                    .where('type', '==', 'branche_analyse')
                    .where('isActief', '==', true)
                    .get();
            }
            if (!allActivePrompts.empty) {
                const sorted = allActivePrompts.docs.sort((a, b) => {
                    const versieA = a.data().versie || 0;
                    const versieB = b.data().versie || 0;
                    return versieB - versieA;
                });
                basePrompt = sorted[0].data().promptTekst;
                console.log(`✅ Using active prompt version ${sorted[0].data().versie} for stapsgewijze analyse (sorted in memory)`);
            }
            else {
                console.log('⚠️ No active prompt found for stapsgewijze analyse, using default');
            }
        }
    }
    catch (promptError) {
        console.error("Error fetching prompt for stapsgewijze analyse:", promptError);
        console.log("Using default prompt");
    }
    // Parse hoofdstukken from prompt - ALLEEN uit de prompt, geen hardcoded fallback
    let hoofdstukken = parseHoofdstukkenFromPrompt(basePrompt);
    
    // Als er geen hoofdstukken worden gevonden, geef een duidelijke foutmelding
    if (!hoofdstukken || hoofdstukken.length === 0) {
        const errorMsg = '❌ GEEN HOOFDSTUKKEN GEVONDEN IN PROMPT. De prompt moet hoofdstukken definiëren in het formaat "Hoofdstuk X: Titel".';
        console.error(errorMsg);
        console.error('Prompt tekst (eerste 500 karakters):', basePrompt.substring(0, 500));
        await progressRef.update({
            status: 'failed',
            error: errorMsg,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(400).json({ 
            error: errorMsg,
            details: 'De prompt moet hoofdstukken definiëren in het formaat "Hoofdstuk X: Titel" gevolgd door een beschrijving.'
        });
        return;
    }
    
    // Initialize context
    const context = {
        organisatieNaam,
        website,
        hoofdstukken: {},
        metadata: {},
        basePrompt: basePrompt
    };
    
    // Update progress with actual aantal hoofdstukken
    await progressRef.update({
        'progress.totaal': hoofdstukken.length,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`📋 Processing ${hoofdstukken.length} hoofdstukken from prompt`);
    
    // Process all hoofdstukken sequentieel (met context)
    for (const hoofdstuk of hoofdstukken) {
        try {
            // Update progress
            await progressRef.update({
                [`hoofdstukken.${hoofdstuk.nummer}`]: {
                    status: 'running',
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                },
                'progress.huidigeStap': parseInt(hoofdstuk.nummer),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Generate prompt with context
            const prompt = generateHoofdstukPrompt(hoofdstuk.nummer, hoofdstuk.titel, hoofdstuk.beschrijving, context);
            // Call Gemini
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let jsonStr = response.text();
            // Clean and parse JSON
            jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            // Parse JSON (with error handling)
            let jsonData;
            try {
                jsonData = JSON.parse(jsonStr);
            }
            catch (parseError) {
                console.error(`JSON Parse Error for hoofdstuk ${hoofdstuk.nummer}:`, parseError.message);
                // Try to repair JSON (simplified version)
                jsonStr = jsonStr.replace(/\\n/g, ' ').replace(/\\"/g, '"');
                jsonData = JSON.parse(jsonStr);
            }
            // Extract data
            const content = jsonData[`hoofdstuk${hoofdstuk.nummer}`] || jsonData.content || '';
            // OPTIMIZATION: Limit samenvatting to 50 words max for faster context passing
            const fullSamenvatting = jsonData.samenvatting || content.substring(0, 200);
            const samenvatting = fullSamenvatting.split(' ').slice(0, 50).join(' ');
            const keyData = extractKeyDataFromHoofdstuk(hoofdstuk.nummer, content, jsonData);
            // Update context
            context.hoofdstukken[hoofdstuk.nummer] = {
                titel: hoofdstuk.titel,
                content,
                samenvatting,
                keyData
            };
            // Update metadata if needed
            if (hoofdstuk.nummer === '1' && jsonData.branche) {
                context.metadata.branche = jsonData.branche;
            }
            // Save to progress
            await progressRef.update({
                [`hoofdstukken.${hoofdstuk.nummer}`]: {
                    status: 'completed',
                    content,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                },
                'progress.voltooid': admin.firestore.FieldValue.increment(1),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ Hoofdstuk ${hoofdstuk.nummer} voltooid`);
        }
        catch (error) {
            console.error(`❌ Error in hoofdstuk ${hoofdstuk.nummer}:`, error);
            await progressRef.update({
                [`hoofdstukken.${hoofdstuk.nummer}`]: {
                    status: 'failed',
                    error: error.message,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    // Synthesis stap: Combineer alle hoofdstukken tot één coherent rapport
    try {
        const aantalHoofdstukken = Object.keys(context.hoofdstukken).length;
        await progressRef.update({
            'progress.huidigeStap': aantalHoofdstukken + 1,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // OPTIMIZATION: For synthesis, include full content but limit to essential parts
        const hoofdstukkenContent = Object.keys(context.hoofdstukken).sort().map((key) => {
            const h = context.hoofdstukken[key];
            // For synthesis, we need full content but can optimize formatting
            return `\n## Hoofdstuk ${key}: ${h.titel}\n${h.content}`;
        }).join('\n\n');
        
        const synthesisPrompt = `
Je hebt een organisatieanalyse uitgevoerd in ${aantalHoofdstukken} hoofdstukken voor ${organisatieNaam}.

ALLE HOOFDSTUKKEN:
${hoofdstukkenContent}

TAAK:
1. Combineer alle hoofdstukken tot één coherent, volledig markdown rapport
2. Zorg voor consistentie in:
   - Risico namen (gebruik EXACT dezelfde namen overal)
   - Proces namen (gebruik EXACT dezelfde namen overal)
   - Functie namen (gebruik EXACT dezelfde namen overal)
   - Stijl en toon (persoonlijk, professioneel, proactief, 'u'-vorm)
3. Valideer cross-references tussen hoofdstukken
4. Zorg dat matrices (hoofdstuk 10) correct verwijzen naar risicos, processen en functies
5. Voeg een inleiding toe aan het begin: "Geachte directie van ${organisatieNaam}, ..."
6. Voeg een afsluiting toe met datum en copyright: "© ${new Date().getFullYear()} Richting. Alle rechten voorbehouden."

Geef het volledige rapport terug in markdown formaat. Geef ALLEEN het rapport, geen extra tekst.
`;
        const result = await model.generateContent(synthesisPrompt);
        const response = await result.response;
        const volledigRapport = response.text();
        // Extract structured data from context
        const risicos = context.hoofdstukken['4']?.keyData?.risicos || [];
        const processen = context.hoofdstukken['5']?.keyData?.processen || [];
        const functies = context.hoofdstukken['6']?.keyData?.functies || [];
        const sbiCodes = context.hoofdstukken['2']?.keyData?.sbiCodes || [];
        // Locaties kunnen in hoofdstuk 1 of 2 zitten (afhankelijk van prompt)
        const locaties = context.hoofdstukken['1']?.keyData?.locaties || 
                        context.hoofdstukken['2']?.keyData?.locaties || [];
        // Calculate scores
        const totaalScore = risicos.reduce((sum, r) => sum + (r.risicogetal || 0), 0);
        const gemiddeldeRisicoScore = risicos.length > 0 ? totaalScore / risicos.length : 0;
        
        // Save locaties to Firestore if customerId provided and locaties found
        if (customerId && locaties && locaties.length > 0) {
            try {
                // Get Richting locations for matching
                const richtingLocationsRef = db.collection('richtingLocaties');
                const richtingLocationsSnapshot = await richtingLocationsRef.get();
                const richtingLocations = richtingLocationsSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Process and save each location
                const batch = db.batch();
                for (const locatie of locaties) {
                    // Find nearest Richting location
                    let richtingLocatieNaam = null;
                    if (locatie.stad) {
                        const nearestRichting = findNearestRichtingLocation(locatie.stad, richtingLocations);
                        if (nearestRichting) {
                            richtingLocatieNaam = nearestRichting;
                            console.log(`📍 Matched Richting locatie "${nearestRichting}" for "${locatie.naam}" in ${locatie.stad}`);
                        }
                    }
                    
                    // Create location document
                    const locRef = db.collection('locations').doc();
                    batch.set(locRef, {
                        customerId: customerId,
                        name: locatie.naam || locatie.name || 'Onbekende locatie',
                        address: locatie.adres || locatie.address || '',
                        city: locatie.stad || locatie.city || '',
                        employeeCount: locatie.aantalMedewerkers ?? locatie.aantal ?? null,
                        richtingLocatieNaam: richtingLocatieNaam,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
                await batch.commit();
                console.log(`💾 Saved ${locaties.length} locaties to Firestore for customer ${customerId}`);
            }
            catch (saveError) {
                console.error('❌ Error saving locaties to Firestore:', saveError);
                // Don't fail the entire analysis if location saving fails
            }
        }
        
        // Save final result (aantalHoofdstukken already declared above)
        await progressRef.update({
            volledigRapport,
            status: 'completed',
            'progress.voltooid': aantalHoofdstukken,
            'progress.huidigeStap': aantalHoofdstukken,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Also save as OrganisatieProfiel if customerId provided
        if (customerId) {
            try {
                const profielRef = db.collection('organisatieProfielen');
                const profielData = {
                    customerId,
                    analyseDatum: new Date().toISOString(),
                    organisatieNaam,
                    website,
                    volledigRapport,
                    risicos,
                    processen,
                    functies,
                    totaalScore,
                    gemiddeldeRisicoScore,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                await profielRef.add(profielData);
                console.log('✅ OrganisatieProfiel opgeslagen');
            }
            catch (error) {
                console.error('Error saving OrganisatieProfiel:', error);
            }
        }
        console.log('✅ Synthesis voltooid - Analyse compleet');
    }
    catch (error) {
        console.error('❌ Error in synthesis:', error);
        await progressRef.update({
            status: 'failed',
            error: error.message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
}
// Endpoint to get analyse progress
exports.getAnalyseProgress = (0, https_1.onRequest)({
    cors: true
}, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    const analyseId = req.query.analyseId || req.body.analyseId;
    if (!analyseId) {
        res.status(400).json({ error: "analyseId is verplicht" });
        return;
    }
    try {
        const db = getFirestoreDb();
        const progressRef = db.collection('analyseProgress').doc(analyseId);
        const progressDoc = await progressRef.get();
        if (!progressDoc.exists) {
            res.status(404).json({ error: "Analyse niet gevonden" });
            return;
        }
        const progress = progressDoc.data();
        res.json(progress);
    }
    catch (error) {
        console.error('Error getting progress:', error);
        res.status(500).json({ error: error.message });
    }
});
// Helper function to repair JSON string
function repairJsonString(jsonStr) {
    // Remove markdown code blocks
    jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();
    // Try to extract JSON if wrapped in text
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonStr = jsonMatch[0];
    }
    // Escape control characters
    jsonStr = jsonStr.replace(/[\x00-\x1F\x7F]/g, '');
    // Fix common JSON issues
    jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
    return jsonStr;
}
// Analyse Risico Profiel Function
exports.analyseRisicoProfiel = (0, https_1.onRequest)({
    cors: true,
    timeoutSeconds: 540,
    memory: "512MiB"
}, async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (!genAI) {
        res.status(500).json({ error: "Server misconfiguration: API Key missing." });
        return;
    }
    const { customerId, organisatieNaam, website, userId } = req.body;
    if (!customerId || !organisatieNaam || !website) {
        res.status(400).json({ error: "customerId, organisatieNaam en website zijn verplicht" });
        return;
    }
    try {
        const db = getFirestoreDb();
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        // Get active prompt from Firestore
        let promptTekst = '';
        try {
            const promptsRef = db.collection('prompts');
            let activePromptQuery = await promptsRef
                .where('type', '==', 'publiek_risico_profiel')
                .where('isActief', '==', true)
                .orderBy('versie', 'desc')
                .limit(1)
                .get();
            if (!activePromptQuery.empty) {
                const activeDoc = activePromptQuery.docs[0];
                promptTekst = activeDoc.data().promptTekst;
                console.log(`Using active risico profiel prompt version ${activeDoc.data().versie}`);
            }
            else {
                console.log('No active risico profiel prompt found, using default');
                // Fallback default prompt
                promptTekst = `Je bent Gemini, geconfigureerd als een deskundige RI&E (Risico Inventarisatie & Evaluatie) specialist voor Richting.

Analyseer de organisatie [organisatieNaam] (website: [website]) en identificeer alle processen, functies, gevaarlijke stoffen en risico's.

Gebruik de Fine & Kinney methode voor risicoberekening:
- Probability (Kans/W): 0.5, 1, 3, 6, of 10
- Effect (E): 1, 3, 7, 15, of 40
- Exposure (Blootstelling/B): 1-10 (aantal personen)

Geef het antwoord in puur JSON formaat.`;
            }
        }
        catch (promptError) {
            console.error("Error fetching prompt from Firestore:", promptError);
        }
        // Build prompt with context
        const fullPrompt = `${promptTekst}

ORGANISATIE NAAM: ${organisatieNaam}
WEBSITE: ${website}

Voer nu de risico analyse uit en geef het resultaat in het gevraagde JSON formaat.`;
        console.log('Calling Gemini for risico profiel analysis...');
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        let jsonStr = response.text();
        // Repair JSON
        jsonStr = repairJsonString(jsonStr);
        let analysisData;
        try {
            analysisData = JSON.parse(jsonStr);
        }
        catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.error('JSON string:', jsonStr.substring(0, 500));
            res.status(500).json({ error: "Failed to parse Gemini response as JSON", details: parseError.message });
            return;
        }
        // Validate and save data to Firestore
        const processes = analysisData.processen || [];
        const functies = analysisData.functies || [];
        const stoffen = analysisData.stoffen || [];
        const risicos = analysisData.risicos || [];
        // Save processes
        const processIds = {};
        for (const proc of processes) {
            try {
                const processData = {
                    customerId: customerId,
                    name: proc.name || proc.naam,
                    description: proc.description || proc.beschrijving || '',
                    relatedFunctionIds: proc.relatedFunctionIds || [],
                    relatedSubstanceIds: proc.relatedSubstanceIds || [],
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                const processRef = await db.collection('processes').add(processData);
                processIds[proc.name || proc.naam] = processRef.id;
                console.log(`✅ Saved process: ${processData.name}`);
            }
            catch (error) {
                console.error(`Error saving process ${proc.name}:`, error);
            }
        }
        // Save functions
        const functionIds = {};
        for (const func of functies) {
            try {
                const functionData = {
                    customerId: customerId,
                    name: func.name || func.naam,
                    description: func.description || func.beschrijving || '',
                    department: func.department || func.afdeling || '',
                    fysiek: func.fysiek || undefined,
                    psychisch: func.psychisch || undefined,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                const functionRef = await db.collection('functions').add(functionData);
                functionIds[func.name || func.naam] = functionRef.id;
                console.log(`✅ Saved function: ${functionData.name}`);
            }
            catch (error) {
                console.error(`Error saving function ${func.name}:`, error);
            }
        }
        // Save substances
        const substanceIds = {};
        for (const stof of stoffen) {
            try {
                const substanceData = {
                    customerId: customerId,
                    name: stof.name || stof.naam,
                    casNumber: stof.casNumber || stof.casNummer || '',
                    hazardPhrases: stof.hazardPhrases || stof.hazardPhrases || [],
                    description: stof.description || stof.beschrijving || '',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                const substanceRef = await db.collection('substances').add(substanceData);
                substanceIds[stof.name || stof.naam] = substanceRef.id;
                console.log(`✅ Saved substance: ${substanceData.name}`);
            }
            catch (error) {
                console.error(`Error saving substance ${stof.name}:`, error);
            }
        }
        // Save risk assessments (with calculated scores)
        const riskIds = {};
        for (const risico of risicos) {
            try {
                // Convert Fine & Kinney values if needed
                let probability = risico.probability || risico.kans;
                let effect = risico.effect;
                let exposure = risico.exposure || risico.blootstelling || 3;
                // Map old kans values (1-5) to Fine & Kinney (0.5, 1, 3, 6, 10)
                if (probability >= 1 && probability <= 5) {
                    const mapping = { 1: 0.5, 2: 1, 3: 3, 4: 6, 5: 10 };
                    probability = mapping[probability] || 3;
                }
                // Map old effect values (1-5) to Fine & Kinney (1, 3, 7, 15, 40)
                if (effect >= 1 && effect <= 5) {
                    const mapping = { 1: 1, 2: 3, 3: 7, 4: 15, 5: 40 };
                    effect = mapping[effect] || 7;
                }
                // Calculate score
                const calculatedScore = probability * effect * exposure;
                // Calculate priority
                let priority = 5;
                if (calculatedScore >= 400)
                    priority = 1;
                else if (calculatedScore >= 200)
                    priority = 2;
                else if (calculatedScore >= 100)
                    priority = 3;
                else if (calculatedScore >= 50)
                    priority = 4;
                // Resolve IDs from names
                let processId = risico.processId;
                let functionId = risico.functionId;
                let substanceId = risico.substanceId;
                // If IDs are names, resolve them
                if (processId && !processId.startsWith('process_') && processIds[processId]) {
                    processId = processIds[processId];
                }
                if (functionId && !functionId.startsWith('function_') && functionIds[functionId]) {
                    functionId = functionIds[functionId];
                }
                if (substanceId && !substanceId.startsWith('substance_') && substanceIds[substanceId]) {
                    substanceId = substanceIds[substanceId];
                }
                const riskData = {
                    customerId: customerId,
                    riskName: risico.riskName || risico.naam,
                    description: risico.description || risico.beschrijving || '',
                    category: risico.category || risico.categorie || 'overige',
                    probability: probability,
                    effect: effect,
                    exposure: exposure,
                    calculatedScore: calculatedScore,
                    priority: priority,
                    processId: processId || null,
                    functionId: functionId || null,
                    substanceId: substanceId || null,
                    createdBy: userId || 'system',
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                };
                // Remove null values
                if (!riskData.processId)
                    delete riskData.processId;
                if (!riskData.functionId)
                    delete riskData.functionId;
                if (!riskData.substanceId)
                    delete riskData.substanceId;
                const riskRef = await db.collection('riskAssessments').add(riskData);
                riskIds[risico.riskName || risico.naam] = riskRef.id;
                console.log(`✅ Saved risk: ${riskData.riskName} (score: ${calculatedScore}, priority: ${priority})`);
            }
            catch (error) {
                console.error(`Error saving risk ${risico.riskName || risico.naam}:`, error);
            }
        }
        // Update process relations with actual function/substance IDs
        for (const proc of processes) {
            const processName = proc.name || proc.naam;
            const processId = processIds[processName];
            if (processId && proc.relatedFunctionIds) {
                const resolvedFunctionIds = proc.relatedFunctionIds
                    .map((name) => functionIds[name] || name)
                    .filter(Boolean);
                const resolvedSubstanceIds = (proc.relatedSubstanceIds || [])
                    .map((name) => substanceIds[name] || name)
                    .filter(Boolean);
                if (resolvedFunctionIds.length > 0 || resolvedSubstanceIds.length > 0) {
                    await db.collection('processes').doc(processId).update({
                        relatedFunctionIds: resolvedFunctionIds,
                        relatedSubstanceIds: resolvedSubstanceIds,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }
        }
        res.json({
            success: true,
            message: 'Risico profiel analyse voltooid',
            summary: {
                processen: processes.length,
                functies: functies.length,
                stoffen: stoffen.length,
                risicos: risicos.length
            }
        });
    }
    catch (error) {
        console.error('Error in analyseRisicoProfiel:', error);
        res.status(500).json({ error: error.message });
    }
});
//# sourceMappingURL=index.js.map