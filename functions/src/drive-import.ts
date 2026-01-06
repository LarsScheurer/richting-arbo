import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import * as path from 'path';
// We gebruiken dynamic import voor pdf-parse omdat het soms problemen geeft in cloud environments
// of we gebruiken een simpelere text extractie als fallback

// Initialiseer admin als dat nog niet gebeurd is
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 1. Setup Auth (Service Account)
// In Cloud Functions zit de credentials vaak al in de environment, 
// maar voor Drive API hebben we specifieke scopes nodig.
// We gaan er vanuit dat de default service account toegang heeft of dat we key gebruiken.
// Voor nu: we proberen de default credentials.

async function getDriveClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.readonly']
  });
  return google.drive({ version: 'v3', auth });
}

// 2. Embedding Helper (Vertex AI)
// We hergebruiken de logica, maar nu netjes via de Vertex AI SDK of REST
async function generateEmbedding(text: string) {
    const project = process.env.GCLOUD_PROJECT;
    const location = 'europe-west4';
    const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/text-embedding-004:predict`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken.token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instances: [{ content: text }]
        })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embedding API Error: ${err}`);
    }

    const data = await response.json() as any;
    return data.predictions[0].embeddings.values;
}

// 3. File Parser
async function parseFileContent(drive: any, fileId: string, mimeType: string): Promise<string | null> {
    try {
        if (mimeType === 'application/vnd.google-apps.document') {
            const res = await drive.files.export({ fileId, mimeType: 'text/plain' });
            return res.data; // string
        } else if (mimeType === 'text/plain') {
            const res = await drive.files.get({ fileId, alt: 'media' });
            return res.data; // string
        } else if (mimeType === 'application/pdf') {
            // PDF parsing is zwaar in Cloud Functions. 
            // Voor nu slaan we PDF's even over of we moeten pdf-parse toevoegen aan dependencies
            // We returnen even een placeholder om te testen
            return null; // TODO: PDF support toevoegen
        }
        return null;
    } catch (e) {
        console.error(`Error parsing file ${fileId}:`, e);
        return null;
    }
}

// 4. De Cloud Function
export const importDocumentsFromDrive = functions.region('europe-west4')
    .runWith({ timeoutSeconds: 540, memory: '1GiB' }) // Langere timeout voor grote mappen
    .https.onCall(async (data, context) => {
    
    // Check Auth
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Je moet ingelogd zijn.');
    }

    const { customerId, driveFolderId } = data;
    if (!customerId || !driveFolderId) {
        throw new functions.https.HttpsError('invalid-argument', 'customerId en driveFolderId zijn verplicht.');
    }

    try {
        const drive = await getDriveClient();
        
        // Haal bestanden op
        const res = await drive.files.list({
            q: `'${driveFolderId}' in parents and trashed = false and (mimeType = 'application/vnd.google-apps.document' or mimeType = 'text/plain')`,
            fields: 'files(id, name, mimeType)',
            pageSize: 50 // Limit voor veiligheid
        });

        const files = res.data.files || [];
        console.log(`Gevonden bestanden voor klant ${customerId}: ${files.length}`);

        let processedCount = 0;

        for (const file of files) {
            if (!file.id || !file.name) continue;

            const text = await parseFileContent(drive, file.id, file.mimeType || '');
            if (!text || text.length < 50) continue;

            // Chunking
            const chunks = text.match(/.{1,1000}/g) || [];
            
            for (const [index, chunk] of chunks.entries()) {
                const vector = await generateEmbedding(chunk);
                
                await db.collection('knowledge_base').add({
                    content: chunk,
                    embedding: vector,
                    metadata: {
                        customerId: customerId, // BELANGRIJK: Koppel aan klant!
                        source: 'google_drive',
                        fileId: file.id,
                        filename: file.name,
                        chunkIndex: index,
                        created_at: admin.firestore.FieldValue.serverTimestamp()
                    }
                });
            }
            processedCount++;
        }

        return { 
            success: true, 
            message: `${processedCount} documenten verwerkt en geïndexeerd.`,
            fileCount: processedCount
        };

    } catch (error: any) {
        console.error("Drive Import Error:", error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

