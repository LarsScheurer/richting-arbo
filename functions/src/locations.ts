import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

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

export const fetchLocationsForCustomer = functions.region('europe-west4').https.onRequest(async (req, res) => {
  // CORS headers
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }

  try {
    const { website, customerName } = req.body;

    if (!website) {
      res.status(400).json({ error: 'Website is required' });
      return;
    }

    console.log(`Fetching locations for ${customerName} (${website})...`);

    // In een echte productie-omgeving zou je hier een scraping service gebruiken (zoals BrightData of Firecrawl)
    // of een Google Places API call doen.
    // Voor nu doen we een simpele check of we contact-pagina's kunnen vinden
    
    // Placeholder logica: We returnen een lijstje met gesimuleerde locaties of proberen iets te vinden.
    // Omdat we geen echte scraper hebben in deze omgeving, simuleren we een succesvol resultaat
    // als de website bereikbaar is.
    
    const html = await fetchHtml(website.startsWith('http') ? website : `https://${website}`);
    
    if (!html) {
       res.status(404).json({ error: 'Website not reachable' });
       return;
    }

    // Hele simpele regex om adressen te gokken (niet perfect, maar iets)
    const locations = [];
    
    // Fallback: Als we niks vinden, geven we de "Hoofdvestiging" terug op basis van de stad in de tekst (als we die vinden)
    // Dit is een placeholder implementatie.
    
    locations.push({
        naam: "Hoofdvestiging",
        adres: "Adres onbekend (automatisch gegenereerd)",
        stad: "Nederland", // Placeholder
        aantalMedewerkers: 10 // Placeholder
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
