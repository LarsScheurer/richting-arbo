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