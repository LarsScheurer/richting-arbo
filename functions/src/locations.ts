import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as cors from 'cors';

// Configureer CORS middleware
const corsHandler = cors({ origin: true }); // true = allow all origins

// Helper om HTML te fetchen
const fetchHtml = async (url: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RichtingBot/1.0)'
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
};

export const fetchLocationsForCustomer = functions.region('europe-west4').https.onRequest((req, res) => {
  // Gebruik de CORS middleware om request/response te wrappen
  corsHandler(req, res, async () => {
    try {
      if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
      }

      const { website, customerName } = req.body;

      if (!website) {
        res.status(400).json({ error: 'Website is required' });
        return;
      }

      console.log(`Fetching locations for ${customerName} (${website})...`);

      const html = await fetchHtml(website.startsWith('http') ? website : `https://${website}`);
      
      if (!html) {
         res.status(404).json({ error: 'Website not reachable' });
         return;
      }

      const locations = [];
      locations.push({
          naam: "Hoofdvestiging",
          adres: "Adres onbekend (automatisch gegenereerd)",
          stad: "Nederland",
          aantalMedewerkers: 10
      });

      res.json({ 
        success: true,
        locaties: locations,
        message: "Locaties opgehaald (simulatie)"
      });

    } catch (error: any) {
      console.error('Error in fetchLocationsForCustomer:', error);
      res.status(500).json({ error: error.message });
    }
  });
});
