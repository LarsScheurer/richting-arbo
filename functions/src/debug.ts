import { VertexAI } from '@google-cloud/vertexai';

const PROJECT_ID = 'richting-sales-d764a';
const LOCATION = 'europe-west1';

const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

async function inspect() {
    console.log("🕵️‍♂️ DETECTIVE START");
    try {
        const model = vertexAI.getGenerativeModel({ model: 'text-embedding-004' });
        console.log("✅ Model aangemaakt.");
        
        // Dit is de magie: laat zien welke functies dit model wél heeft
        const functions = Object.getOwnPropertyNames(Object.getPrototypeOf(model));
        console.log("BESCHIKBARE FUNCTIES:", functions);
        
    } catch (e) {
        console.error("❌ Fout:", e);
    }
}
inspect();
