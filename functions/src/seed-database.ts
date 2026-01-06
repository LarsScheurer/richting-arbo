import { google } from 'googleapis';
import * as path from 'path';
import * as admin from 'firebase-admin';
// VertexAI import is weggehaald omdat we de API direct aanroepen
const pdf = require('pdf-parse'); 

// ▼ ▼ ▼ GEGEVENS ▼ ▼ ▼
const PROJECT_ID = 'richting-sales-d764a'; 
const FOLDER_ID = '1R7lGWA5ueLt6gT68a84RFt-u6Ll7QEbd'; 
const LOCATION = 'europe-west1'; 

// 1. Initialisatie
const KEY_FILE_PATH = path.join(__dirname, '../service-account-key.json');

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(KEY_FILE_PATH) });
}
const db = admin.firestore();

// Auth voor Drive én Vertex AI (via achterdeur)
const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/cloud-platform'
  ],
});

// 🛠️ De MacGyver Embed Functie (Werkt altijd)
async function generateEmbedding(text: string) {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token = accessToken.token;

    const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/text-embedding-004:predict`;

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
        throw new Error(`API Error: ${response.statusText}`);
    }

    const data = await response.json() as any;
    return data.predictions[0].embeddings.values;
}

// Hulpfunctie: Bestand downloaden
async function parseDriveFile(drive: any, fileId: string, mimeType: string) {
  process.stdout.write(`   ⬇️  Downloaden... `);
  
  try {
    let response;
    if (mimeType === 'application/vnd.google-apps.document') {
        response = await drive.files.export({
            fileId, mimeType: 'text/plain'
        }, { responseType: 'arraybuffer' });
        return Buffer.from(response.data).toString('utf-8');
    } 
    else {
        response = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);
        if (mimeType === 'application/pdf') {
            const data = await pdf(buffer);
            return data.text;
        }
        return buffer.toString('utf-8');
    }
  } catch (e) {
      console.error('❌ Mislukt:', e);
      return null;
  }
}

// Recursieve map-lezer
async function processFolder(drive: any, folderId: string, pathName: string = '') {
    const res = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType)',
        pageSize: 100
    });

    const files = res.data.files || [];
    
    for (const file of files) {
        if (!file.id || !file.name) continue;

        if (file.mimeType === 'application/vnd.google-apps.folder') {
            console.log(`\n📂 Map: ${file.name}`);
            await processFolder(drive, file.id, `${pathName}/${file.name}`);
        } 
        else if (['application/pdf', 'text/plain', 'application/vnd.google-apps.document'].includes(file.mimeType)) {
            console.log(`\n📄 Bestand: ${file.name}`);
            
            const text = await parseDriveFile(drive, file.id, file.mimeType);
            
            if (!text || text.length < 50) {
                console.log('⚠️ Te weinig tekst.');
                continue;
            }

            const cleanText = text.replace(/\n/g, ' ');
            const chunks = cleanText.match(/.{1,1000}/g) || [];
            console.log(`✂️ ${chunks.length} stukjes. Indexeren:`);

            for (const [index, chunk] of chunks.entries()) {
                try {
                    const vector = await generateEmbedding(chunk);
                    await db.collection('knowledge_base').add({
                        content: chunk,
                        embedding: vector, 
                        metadata: {
                            filename: file.name,
                            fullPath: `${pathName}/${file.name}`,
                            fileId: file.id,
                            chunkIndex: index,
                            created_at: admin.firestore.FieldValue.serverTimestamp()
                        }
                    });
                    process.stdout.write('.'); // Puntjes printen
                } catch (err) {
                    process.stdout.write('X');
                }
            }
            console.log(' ✅');
        }
    }
}

async function seedDatabase() {
  console.log('🚀 Start Indexering (Versie MacGyver)...');
  const drive = google.drive({ version: 'v3', auth });
  try {
      await processFolder(drive, FOLDER_ID, 'Klanten');
      console.log('\n🏁 KLAAR! Je database is gevuld.');
  } catch (error) {
    console.error('CRITICAL ERROR:', error);
  }
}

seedDatabase();