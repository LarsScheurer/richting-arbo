import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 1. Authenticatie instellen
// We zoeken de sleutel in de hoofdmap (één mapje hoger dan 'src')
const KEY_FILE_PATH = path.join(__dirname, '../service-account-key.json');

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_FILE_PATH,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});

async function listFiles() {
  console.log('🔄 Verbinding maken met Google Drive...');
  
  try {
    const drive = google.drive({ version: 'v3', auth });
    
    // ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼ ▼
    // VUL HIERONDER JE EIGEN MAP ID IN!
    const folderId = '1R7lGWA5ueLt6gT68a84RFt-u6Ll7QEbd'; 
    // ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲ ▲

    // 2. Bestanden opvragen
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType)',
      pageSize: 10,
    });

    const files = response.data.files;

    if (files && files.length > 0) {
      console.log('✅ Succes! Gevonden bestanden:');
      files.forEach((file) => {
        console.log(`- [${file.mimeType}] ${file.name} (${file.id})`);
      });
    } else {
      console.log('⚠️ Verbinding gelukt, maar geen bestanden gevonden in deze map.');
    }
  } catch (error) {
    console.error('❌ Fout bij ophalen bestanden:', error);
  }
}

listFiles();