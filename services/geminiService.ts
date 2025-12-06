import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiAnalysisResult, DocumentSource, KNOWLEDGE_STRUCTURE } from '../types';

// Configuratie voor het model - gebruik gemini-2.5-flash zoals in werkende versie
const modelConfig = {
  model: "gemini-2.5-flash"
};

const genAI = process.env.API_KEY ? new GoogleGenerativeAI(process.env.API_KEY) : null;

export const analyzeContent = async (text: string): Promise<GeminiAnalysisResult> => {
  if (!genAI) {
    console.warn("No API Key provided.");
    return {
      summary: "Fout bij automatische analyse.",
      mainCategoryId: 'strategy',
      subCategoryId: 'yearplan',
      tags: ["Error"]
    };
  }

  try {
    // Construct a string representation of the category structure for the prompt
    const structureDescription = KNOWLEDGE_STRUCTURE.map(c => 
      `HOOFDCATEGORIE: ${c.label} (ID: ${c.id})
       SUBCATEGORIEËN: ${c.subCategories.map(sub => `${sub.label} (ID: ${sub.id})`).join(", ")}`
    ).join("\n");

    const prompt = `
      Je bent een content analist voor Richting.nl. Analyseer de volgende tekst.
      
      TAAK:
      1. Schrijf een scherpe, zakelijke samenvatting (max 25 woorden).
      2. Categoriseer het document door een Main Category ID en een Sub Category ID te kiezen uit de lijst hieronder.
      3. Genereer 3 relevante tags.
      
      CATEGORIE STRUCTUUR:
      ${structureDescription}
      
      TEKST:
      ${text.substring(0, 10000)}
      
      Geef het antwoord in JSON formaat:
      {
        "summary": "...",
        "mainCategoryId": "...",
        "subCategoryId": "...",
        "tags": ["...", "...", "..."]
      }
    `;

    // Het model aanroepen - gebruik modelConfig zoals in werkende versie
    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    
    // De JSON uit de tekst halen (soms zet Gemini er markdown omheen)
    let jsonString = response.text().replace(/```json/g, "").replace(/```/g, "").trim();
    
    // Fallback voor als er extra tekst omheen zit
    const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const data = JSON.parse(jsonString);

    // Validatie of de categorie bestaat, anders fallback naar de eerste
    const mainCat = KNOWLEDGE_STRUCTURE.find(c => c.id === data.mainCategoryId) || KNOWLEDGE_STRUCTURE[0];
    const subCatId = mainCat.subCategories.some(s => s.id === data.subCategoryId) 
        ? data.subCategoryId 
        : mainCat.subCategories[0].id;

    return {
      summary: data.summary || "Geen samenvatting beschikbaar.",
      mainCategoryId: mainCat.id,
      subCategoryId: subCatId,
      tags: data.tags || []
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback object bij error
    return {
      summary: "Fout bij automatische analyse.",
      mainCategoryId: "strategy",
      subCategoryId: "yearplan",
      tags: ["Error"]
    };
  }
};

// Analyseer organisatie/branche op basis van klant informatie
export const analyzeOrganisatieBranche = async (customerName: string, industry: string, website?: string, employeeCount?: number): Promise<string> => {
  if (!genAI) {
    console.warn("No API Key provided.");
    return "Fout: API key niet geconfigureerd.";
  }

  try {
    const prompt = `
Je bent Gemini, geconfigureerd als een deskundige adviseur en brancheanalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande organisatie- en brancheanalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

Je schrijft altijd vanuit de identiteit en expertise van Richting. De toon is persoonlijk, professioneel, proactief en adviserend, gericht aan de directie van de te analyseren organisatie. Het doel is niet alleen te informeren, maar vooral om concrete, op maat gemaakte adviezen en een stappenplan voor samenwerking aan te bieden.

ORGANISATIE INFORMATIE:
- Bedrijfsnaam: ${customerName}
- Branche: ${industry || "Niet opgegeven"}
- Website: ${website || "Niet opgegeven"}
- Aantal medewerkers: ${employeeCount || "Niet opgegeven"}

OPDRACHT:

Zodra je de organisatienaam en website hebt, voer je een "deep search" uit en genereer je een volledig analyserapport.

Dit rapport moet strikt de structuur en kwaliteitsnormen volgen zoals vastgelegd in het "Handboek: Kwaliteitsstandaard voor Diepgaande Brancheanalyse". Werk alle onderstaande hoofdstukken volledig en gedetailleerd uit.

DE GOUDEN STANDAARD: RAPPORTSTRUCTUUR

Aanhef: "Geachte directie van ${customerName},"

Inleiding: Een korte, persoonlijke introductie vanuit Richting, waarin je het doel van dit rapport uitlegt: het bieden van inzicht in de branche-specifieke risico's en het voorstellen van een proactieve aanpak voor een gezonde en veilige werkomgeving.

Hoofdstuk 1: Introductie en Branche-identificatie
- Geef een algemene beschrijving van de sector en de belangrijkste activiteiten.
- Analyseer de actualiteiten in de branche op het gebied van mens en werk (arbeidsmarkt, trends, vacatures).
- Identificeer de belangrijkste CAO-thema's die relevant zijn voor verzuim en arbeidsomstandigheden. Benoem de betrokken werkgevers- en werknemersorganisaties.

Hoofdstuk 2: SBI-codes en Bedrijfsinformatie
- Analyseer de personele omvang en vestigingslocaties van de organisatie in Nederland.
- Identificeer alle vestigingslocaties met volledige adresgegevens indien beschikbaar.

Hoofdstuk 3: Arbocatalogus en Branche-RI&E
- Geef een overzicht van de door de branche erkende arbo-instrumenten (Arbocatalogus, Branche-RI&E), inclusief hun status.

Hoofdstuk 4: Risicocategorieën en Kwantificering
- Presenteer een overzicht met de belangrijkste risico's, onderverdeeld in 'Psychische risico's', 'Fysieke risico's', en 'Overige'.
- Kwantificeer elk risico met een score voor Kans (1-5) en Effect (1-5) en bereken de totaalscore (Kans * Effect).

Hoofdstuk 5: Primaire Processen in de Branche
- Beschrijf stapsgewijs de kernprocessen op de werkvloer die typerend zijn voor deze branche.

Hoofdstuk 6: Werkzaamheden en Functies
- Geef een overzicht van de meest voorkomende functies, inclusief een omschrijving en voorbeelden van taken.

Hoofdstuk 7: Verzuim in de Branche
- Analyseer het verzuim in de branche, benoem de belangrijkste oorzaken en vergelijk dit met het landelijk gemiddelde.

Hoofdstuk 8: Beroepsziekten in de Branche
- Analyseer de meest voorkomende beroepsziekten en koppel deze direct aan de geïdentificeerde risico's.

Hoofdstuk 9: Gevaarlijke Stoffen en Risico's
- Indien van toepassing, beschrijf de gevaarlijke stoffen die in de sector worden gebruikt.

Hoofdstuk 10: Vooruitblik en Speerpunten
- Analyseer het verwachte effect van CAO-thema's op o.a. verzuim, verloop en aantrekkingskracht op de arbeidsmarkt.
- Formuleer concrete speerpunten voor de ondernemer om verzuim positief te beïnvloeden en te prioriteren.

Hoofdstuk 11: Stappenplan voor een Preventieve Samenwerking
- Presenteer een concreet en op maat gemaakt stappenplan voor de organisatie, gebaseerd op de analyse. Begin altijd met Implementatie en Verzuimbegeleiding.
- Doe voorstellen voor specifieke diensten van Richting (RI&E, PMO, Werkplekonderzoek, Het Richtinggevende Gesprek, etc.).

CRUCIALE KWALITEITS- EN FORMATVEREISTEN:
- Stijl: Het gehele rapport is geschreven in de 'u'-vorm, persoonlijk gericht aan de directie. De stijl is die van een deskundige partner die meedenkt en concrete oplossingen biedt.
- Afsluiting: Sluit het rapport af met de datum van generatie en een copyright-vermelding: © ${new Date().getFullYear()} Richting. Alle rechten voorbehouden.

Geef een volledig, professioneel rapport in markdown formaat in het Nederlands.
`;

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Organisatie analyse failed:", error);
    return "Fout bij organisatie analyse. Probeer het opnieuw.";
  }
};

// Analyseer organisatiecultuur op basis van beschikbare informatie
export const analyzeCultuur = async (customerName: string, industry: string, documents?: DocumentSource[]): Promise<string> => {
  if (!genAI) {
    console.warn("No API Key provided.");
    return "Fout: API key niet geconfigureerd.";
  }

  try {
    const documentContext = documents && documents.length > 0
      ? documents.slice(0, 10).map(doc => `- ${doc.title}: ${doc.summary || doc.content.substring(0, 300)}`).join("\n")
      : "Geen documenten beschikbaar";

    const prompt = `
Je bent Gemini, geconfigureerd als een deskundige cultuuranalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande cultuuranalyse op basis van een door de gebruiker opgegeven organisatienaam en beschikbare informatie.

Je schrijft altijd vanuit de identiteit en expertise van Richting. De toon is persoonlijk, professioneel, proactief en adviserend, gericht aan de directie van de te analyseren organisatie.

ORGANISATIE INFORMATIE:
- Bedrijfsnaam: ${customerName}
- Branche: ${industry || "Niet opgegeven"}

BESCHIKBARE DOCUMENTEN EN CONTEXT:
${documentContext}

OPDRACHT:

Analyseer de organisatiecultuur en genereer een volledig CultuurProfiel met de volgende elementen:

1. CULTUURDNA ANALYSE
   - Identificeer het dominante cultuurtype (adhocratie, clan, hiërarchie, markt, of hybride)
   - Analyseer de kernwaarden die uit de informatie blijken
   - Beschrijf de cultuurdimensies (flexibiliteit, stabiliteit, interne focus, externe focus)

2. CULTUURVOLWASSENHEID
   - Beoordeel de volwassenheid van de organisatiecultuur (0-100)
   - Analyseer de groeidynamiek (stagnerend, organisch groeiend, disruptief veranderend)
   - Beoordeel de cultuursterkte (laag, gemiddeld, hoog, zeer hoog)

3. PERFORMANCE & ENGAGEMENT
   - Analyseer de relatie tussen cultuur en performance indicatoren
   - Beoordeel medewerker engagement op verschillende dimensies
   - Identificeer trends (stijgend, stabiel, dalend)

4. GAPS & BARRIÈRES
   - Identificeer gaps tussen huidige en gewenste cultuur
   - Analyseer barrières die cultuurontwikkeling belemmeren
   - Beoordeel urgentie en impact van elke gap/barrière

5. OPPORTUNITEITEN & THEMA'S
   - Identificeer kansen voor cultuurverbetering
   - Analyseer belangrijke thema's (cultuur, leiderschap, processen, technologie)
   - Categoriseer als kracht, zwakte, opportuniteit of risico

6. GEDRAGINGEN & INTERVENTIES
   - Beschrijf waargenomen gedragingen (positief, negatief, neutraal)
   - Stel concrete interventies voor (quick wins, strategisch, transformatie)
   - Prioriteer interventies op basis van impact en urgentie

7. RISICO'S PSYCHOSOCIALE ARBEIDSBELASTING (PSA)
   - Analyseer risico's op het gebied van PSA
   - Koppel cultuuraspecten aan PSA risico's
   - Geef aanbevelingen voor preventie

8. AANBEVELINGEN & ACTIEPLAN
   - Formuleer concrete aanbevelingen voor cultuurverbetering
   - Koppel aanbevelingen aan specifieke Richting diensten
   - Presenteer een prioriteitsmatrix voor acties

CRUCIALE KWALITEITS- EN FORMATVEREISTEN:
- Stijl: Het gehele rapport is geschreven in de 'u'-vorm, persoonlijk gericht aan de directie
- Diepgang: Gebruik de beschikbare documenten om concrete voorbeelden en bewijs te leveren
- Actiegericht: Elke bevinding moet leiden tot concrete, uitvoerbare aanbevelingen
- Afsluiting: Sluit het rapport af met de datum van generatie en een copyright-vermelding: © ${new Date().getFullYear()} Richting. Alle rechten voorbehouden.

Geef een volledig, professioneel rapport in markdown formaat in het Nederlands. Gebruik de beschikbare documenten om je analyse te onderbouwen met concrete voorbeelden.
`;

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Cultuur analyse failed:", error);
    return "Fout bij cultuur analyse. Probeer het opnieuw.";
  }
};

export const askQuestion = async (question: string, contextDocs: DocumentSource[]): Promise<{answer: string, citedIds: string[]}> => {
  if (!genAI) return { answer: "Configureer de API key.", citedIds: [] };

  try {
    // Context opbouwen met documenten
    const context = `
      Je bent de AI Kennisbank assistent van Richting.nl.
      Beantwoord de vraag op basis van de bronnen.
      
      BELANGRIJK:
      - Citeer je bronnen door de titel te noemen.
      - Wees professioneel, direct en behulpzaam.
      - Als het antwoord niet in de bronnen staat, geef dit aan.
      
      BRONNEN:
      ${contextDocs.filter(doc => !doc.isArchived).slice(0, 15).map(doc => `ID: ${doc.id}
TITEL: ${doc.title}
CATEGORIE: ${doc.mainCategoryId}
INHOUD: ${doc.content.substring(0, 800)}
---`).join("\n")}
      
      VRAAG:
      ${question}
    `;

    const model = genAI.getGenerativeModel(modelConfig);
    const result = await model.generateContent(context);
    const response = await result.response;

    return {
      answer: response.text() || "Geen antwoord.",
      citedIds: [] // Citations zou je hier nog complexer kunnen parsen als je wilt
    };
  } catch (error) {
    return {
      answer: "Excuses, ik kan de vraag niet verwerken.",
      citedIds: []
    };
  }
};