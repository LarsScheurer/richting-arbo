import { GoogleGenerativeAI } from "@google/generative-ai";
import { GeminiAnalysisResult, DocumentSource, KNOWLEDGE_STRUCTURE } from '../types';

const genAI = process.env.API_KEY ? new GoogleGenerativeAI(process.env.API_KEY) : null;

export const analyzeContent = async (text: string): Promise<GeminiAnalysisResult> => {
  if (!genAI) {
    console.warn("No API Key provided. Returning mock analysis.");
    return {
      summary: "AI analyse niet beschikbaar (geen API key). Dit is een placeholder.",
      mainCategoryId: 'strategy',
      subCategoryId: 'yearplan',
      tags: ["Demo", "NoKey"]
    };
  }

  try {
    // Construct a string representation of the category structure for the prompt
    const structureDescription = KNOWLEDGE_STRUCTURE.map(c => 
      `HOOFDCATEGORIE: ${c.label} (ID: ${c.id})
       SUBCATEGORIEËN: ${c.subCategories.map(sub => `${sub.label} (ID: ${sub.id})`).join(', ')}`
    ).join('\n\n');

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

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const textResponse = response.text();
    
    // Try to parse JSON from response
    let jsonStr = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }
    const resultData = JSON.parse(jsonStr);
    
    // Fallback validation
    const mainCat = KNOWLEDGE_STRUCTURE.find(c => c.id === resultData.mainCategoryId) || KNOWLEDGE_STRUCTURE[0];
    const isValidSub = mainCat.subCategories.some(sub => sub.id === resultData.subCategoryId);
    
    // If subcategory doesn't match main category, default to first sub
    const finalSubId = isValidSub ? resultData.subCategoryId : mainCat.subCategories[0].id;

    return {
      summary: resultData.summary || "Geen samenvatting.",
      mainCategoryId: mainCat.id,
      subCategoryId: finalSubId,
      tags: resultData.tags || []
    };

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return {
      summary: "Fout bij analyse.",
      mainCategoryId: 'strategy',
      subCategoryId: 'yearplan',
      tags: ["Error"]
    };
  }
};

export const askQuestion = async (question: string, contextDocs: DocumentSource[]): Promise<{answer: string, citedIds: string[]}> => {
  if (!genAI) return { answer: "Configureer de API key om de AI assistent te gebruiken.", citedIds: [] };

  try {
    const contextText = contextDocs
      .filter(d => !d.isArchived)
      .slice(0, 15)
      .map(d => `ID: ${d.id}\nTITEL: ${d.title}\nCATEGORIE: ${d.mainCategoryId}\nINHOUD: ${d.content.substring(0, 800)}\n---`)
      .join('\n');

    const prompt = `
      Je bent de AI Kennisbank assistent van Richting.nl.
      Beantwoord de vraag op basis van de bronnen.
      
      BELANGRIJK:
      - Citeer je bronnen door de titel te noemen.
      - Wees professioneel, direct en behulpzaam.
      - Als het antwoord niet in de bronnen staat, geef dit aan.
      
      BRONNEN:
      ${contextText}
      
      VRAAG:
      ${question}
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    const result = await model.generateContent(prompt);
    const response = await result.response;

    return {
      answer: response.text() || "Geen antwoord.",
      citedIds: []
    };

  } catch (error) {
    return { answer: "Excuses, ik kan de vraag niet verwerken.", citedIds: [] };
  }
};

// Stub functions for backward compatibility with backup version
export const analyzeOrganisatieBranche = async (organisatieNaam: string, website: string) => {
  console.warn("analyzeOrganisatieBranche: Not implemented, using Firebase Function instead");
  return null;
};

export const analyzeCultuur = async (organisatieNaam: string, website: string) => {
  console.warn("analyzeCultuur: Not implemented, using Firebase Function instead");
  return null;
};