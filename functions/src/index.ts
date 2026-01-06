import * as admin from 'firebase-admin';
import { onRequest } from 'firebase-functions/v2/https';
import * as functions from 'firebase-functions';

// Initialiseer de app
if (!admin.apps.length) {
  admin.initializeApp();
}

// Importeer features
import { fetchLocationsForCustomer as fetchLocations } from './locations';
import { generateLevel as generateLevelFunc } from './features/ai-analyst-v2';

// Exporteer functions
export const fetchLocationsForCustomer = fetchLocations;
export const generateLevel = generateLevelFunc;

// Simpele test functie
export const ping = functions.region('europe-west4').https.onRequest((req, res) => {
  res.send("Pong from Firebase!");
});
