// Script om Firebase data backup te maken
// Run: node create-data-backup.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore,
  initializeFirestore,
  collection, 
  getDocs 
} from 'firebase/firestore';
import { writeFileSync } from 'fs';

const firebaseConfig = {
  apiKey: "AIzaSyDZh5R0sSQ-T3mnk9XS8WA0GV0t_xjD0pY",
  authDomain: "richting-sales-d764a.firebaseapp.com",
  projectId: "richting-sales-d764a",
  storageBucket: "richting-sales-d764a.firebasestorage.app",
  messagingSenderId: "228500270341",
  appId: "1:228500270341:web:1e2bbafbc609136a581b6c",
  measurementId: "G-6833KTWQ8K"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "richting01");

async function createBackup() {
  try {
    console.log('📦 Firebase data backup maken...');
    
    const collections = ['users', 'documents', 'customers', 'locations', 'contacts', 'organisatieProfielen', 'richtingLocaties', 'prompts'];
    const backup = {
      timestamp: new Date().toISOString(),
      database: 'richting01'
    };

    for (const collName of collections) {
      console.log(`  - Ophalen ${collName}...`);
      const snapshot = await getDocs(collection(db, collName));
      backup[collName] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`    ✅ ${backup[collName].length} documenten`);
    }

    const filename = `backup/firebase-backup-${new Date().toISOString().split('T')[0]}-${Date.now()}.json`;
    writeFileSync(filename, JSON.stringify(backup, null, 2), 'utf8');
    
    console.log(`\n✅ Backup opgeslagen: ${filename}`);
    console.log(`📊 Totaal documenten: ${Object.values(backup).filter(v => Array.isArray(v)).reduce((sum, arr) => sum + arr.length, 0)}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Backup gefaald:', error);
    process.exit(1);
  }
}

createBackup();

