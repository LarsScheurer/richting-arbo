import * as path from 'path';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/vertexai';

// Instellingen
const PROJECT_ID = 'richting-sales-d764a';
const LOCATION = 'europe-west1';
const KEY_FILE_PATH = path.join(__dirname, '../service-account-key.json');

// Init
const vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });

async function inspect() {
    console.log("🕵️‍♂️  DETECTIVE SCRIPT START");
    
    // Test 1: Normaal model
    console.log("\n--- TEST 1: vertexAI.getGenerativeModel ---");
    const model1 = vertexAI.getGenerativeModel({ model: 'text-embedding-004' });
    console.log("Model Object:", model1);
    console.log("Functies op dit object:", Object.getOwnPropertyNames(Object.getPrototypeOf(model1)));

    // Test 2: Preview model
    console.log("\n--- TEST 2: vertexAI.preview.getGenerativeModel ---");
    const model2 = vertexAI.preview.getGenerativeModel({ model: 'text-embedding-004' });
    console.log("Preview Object:", model2);
    console.log("Functies op preview object:", Object.getOwnPropertyNames(Object.getPrototypeOf(model2)));

    console.log("\n🕵️‍♂️  DETECTIVE SCRIPT KLAAR");
}

inspect();