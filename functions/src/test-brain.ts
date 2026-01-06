import { google } from 'googleapis';
import * as path from 'path';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

// Instellingen
const PROJECT_ID = 'richting-sales-d764a';
const LOCATION = 'europe-west1';

// Initialisatie
const KEY_FILE_PATH = path.join(__dirname, '../service-account-key.json');

if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(KEY_FILE_PATH) });
}
const db = admin.firestore();

// We gebruiken VertexAI alleen nog voor de Chat (dat werkte wel)
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
const generativeModel = vertexAI.preview.getGenerativeModel({ model: 'gemini-1.5-flash' });

// Authenticatie voor de Achterdeur (Embeddings)
const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE_PATH,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

// 🛠️ De MacGyver functie: Embeddings via de API (buiten de SDK om)
async function createEmbedding(text: string) {
    // 1. Haal een tijdelijk toegangsbewijs op
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    // 2. Het adres van de Google Embedding Machine
    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/text-embedding-004:predict`;

    // 3. Stuur het verzoek handmatig
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ content: text }]
        })
    });

    if (!response.ok) {
        throw new Error(`API Fout: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as any;
    // Vis de vector uit het antwoord
    return data.predictions[0].embeddings.values;
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function testBrain(question: string) {
    console.log(`\n🧠 VRAAG: "${question}"`);
    console.log('... aan het zoeken via de API achterdeur ...');

    try {
        const queryVector = await createEmbedding(question);
        
        const snapshot = await db.collection('knowledge_base').get();
        if (snapshot.empty) {
            console.log("❌ Oeps: Je database is leeg! Wacht tot Terminal 1 klaar is.");
            return;
        }

        const allDocs = snapshot.docs.map(doc => doc.data() as any);

        const scoredDocs = allDocs.map(doc => {
            const score = cosineSimilarity(queryVector, doc.embedding);
            return { ...doc, score };
        });

        // Top 3
        const topMatches = scoredDocs.sort((a, b) => b.score - a.score).slice(0, 3);
        
        if (topMatches.length > 0) {
             console.log('📚 Gevonden bronnen:');
             topMatches.forEach(m => console.log(`   - Match ${(m.score * 100).toFixed(1)}%: ${m.metadata.filename}`));
             
             const contextText = topMatches.map(doc => doc.content).join('\n\n');
             const prompt = `Gebruik deze info: ${contextText}. \n\nVraag: ${question}\n\nAntwoord in het Nederlands:`;
             
             console.log('\n... antwoord formuleren ...\n');
             
             const result = await generativeModel.generateContent(prompt);
             console.log('💬 ANTWOORD VAN AI:');
             console.log('------------------------------------------------');
             console.log(result.response.candidates?.[0].content.parts[0].text);
             console.log('------------------------------------------------');
        } else {
            console.log("⚠️ Geen relevante documenten gevonden.");
        }

    } catch (e) {
        console.error("❌ FOUT:", e);
    }
}

// ▼ ▼ ▼ DE VRAAG ▼ ▼ ▼
testBrain('Welke documenten heb je van Plant Trend?');