// Script om Richting locaties te seeden naar Firestore
// Run met: npx tsx seed-richting-locaties.ts

import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, collection, setDoc, doc, getDocs } from 'firebase/firestore';

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

const locaties = [
  { id: '36d500ec', vestiging: 'Groningen', regio: 'Noord', volledigAdres: 'Van Ketwich Verschuurlaan 98, 9721 SW Groningen, Nederland', latitude: 53.1926921, longitude: 6.5689307 },
  { id: 'a54776c5', vestiging: 'Amersfoort', regio: 'West', volledigAdres: 'Ruimtevaart 24, 3824 MX Amersfoort, Nederland', latitude: 52.1957367, longitude: 5.3982116 },
  { id: '586b4230', vestiging: 'Zwolle', regio: 'Oost', volledigAdres: 'Hanzelaan 198, 8017 JG Zwolle', latitude: 52.5037589, longitude: 6.0871051 },
  { id: 'f83336ac', vestiging: 'Breda', regio: 'Zuid West', volledigAdres: 'Bijster 11, 4817 HZ Breda, Nederland', latitude: 51.58312129999999, longitude: 4.8044974 },
  { id: 'c4ce4a2c', vestiging: 'Waalre', regio: 'Zuid Oost', volledigAdres: 'Burgemeester Mollaan 90, 5582 CK Waalre', latitude: 51.40121449999999, longitude: 5.4777508 },
  { id: 'e16692e4', vestiging: 'Venlo', regio: 'Zuid Oost', volledigAdres: 'Noorderpoort 9, 5916 PJ Venlo', latitude: 51.3927543, longitude: 6.1747741 },
  { id: '6e95b809', vestiging: 'Zoetermeer', regio: 'Zuid West', volledigAdres: 'Boerhaavelaan 40, 2713 H Zoetermeer', latitude: 52.0487212, longitude: 4.4770099 },
  { id: '00389e7c', vestiging: 'Urmond', regio: 'Zuid Oost', volledigAdres: 'Mauritslaan 49, 6129 EL Urmond', latitude: 50.98915539999999, longitude: 5.778275499999999 },
  { id: 'b2768a20', vestiging: 'Nijmegen', regio: 'Zuid Oost', volledigAdres: 'Kerkenbos 1077b, 6546 BB Nijmegen', latitude: 51.8254254, longitude: 5.7774944 },
  { id: 'eda76f60', vestiging: 'Nieuwegein', regio: 'West', volledigAdres: 'Nevelgaarde 20, 3436 ZZ Nieuwegein', latitude: 52.02700489999999, longitude: 5.0654463 },
  { id: '9ec6aaff', vestiging: 'Lelystad', regio: 'Oost', volledigAdres: 'Plaats 9, 8224 AB Lelystad', latitude: 52.5190434, longitude: 5.4853216 },
  { id: '3a207f68', vestiging: 'Leeuwarden', regio: 'Noord', volledigAdres: 'James Wattstraat 4, 8912 AR Leeuwarden', latitude: 53.192288, longitude: 5.7708977 },
  { id: 'ba33d36b', vestiging: 'Heerhugowaard', regio: 'West', volledigAdres: 'Stationsplein 57, 1703 WE Heerhugowaard', latitude: 52.6690345, longitude: 4.822707900000001 },
  { id: 'cc13044f', vestiging: 'Goes', regio: 'Zuid West', volledigAdres: 'Stationspark 45, 4462 DZ Goes', latitude: 51.4965371, longitude: 3.8928287 },
  { id: '270118f5', vestiging: 'Enschede', regio: 'Oost', volledigAdres: 'Wethouder Beversstraat 185, 7543 BK Enschede', latitude: 52.20672010000001, longitude: 6.891583 },
  { id: '42b42612', vestiging: 'Emmen', regio: 'Noord', volledigAdres: 'Hoenderkamp 20, 7812 VZ Emmen', latitude: 52.7720902, longitude: 6.8983212 },
  { id: '298ebb42', vestiging: 'Den Bosch', regio: 'Zuid Oost', volledigAdres: 'Werfpad 6, 5212 VJ Den Bosch', latitude: 51.6966, longitude: 5.3015019 },
  { id: '1c5c23ae', vestiging: 'Capelle aan den Ijssel', regio: 'Zuid West', volledigAdres: 'Rivium Quadrant 241, 2909 LC Capelle aan den IJssel', latitude: 51.9143589, longitude: 4.5407378 },
  { id: '7cf9f89f', vestiging: 'Badhoevedorp', regio: 'West', volledigAdres: 'Prins Mauritslaan 1, 1171 LP Badhoevedorp', latitude: 52.34155639999999, longitude: 4.7654893 },
  { id: 'b744ef62', vestiging: 'Assen', regio: 'Noord', volledigAdres: 'Balkendwarsweg 5, 9405 PT Assen', latitude: 52.9954845, longitude: 6.5206287 },
  { id: '81fd7dd6', vestiging: 'Arnhem', regio: 'Oost', volledigAdres: 'Delta 1-F, 6825 ML Arnhem', latitude: 51.9786827, longitude: 5.9747155 },
  { id: '6f1e4b76', vestiging: 'Apeldoorn', regio: 'Oost', volledigAdres: 'Beatrijsgaarde 1, 7329 BK Apeldoorn, Nederland', latitude: 52.1925101, longitude: 6.001603500000001 },
  { id: '215b3f92', vestiging: 'Almere', regio: 'Midden', volledigAdres: 'Koninginneweg 1, 1312 AW Almere, Nederland', latitude: 52.374984, longitude: 5.2078947 }
];

async function seedRichtingLocaties() {
  try {
    console.log('🌱 Starting to seed Richting locaties...');
    
    // Check if locaties already exist
    const existing = await getDocs(collection(db, 'richtingLocaties'));
    if (!existing.empty) {
      console.log(`⚠️  Found ${existing.size} existing locaties. Skipping seed.`);
      console.log('   To re-seed, delete the collection first in Firebase Console.');
      return;
    }
    
    // Add all locaties
    for (const locatie of locaties) {
      await setDoc(doc(db, 'richtingLocaties', locatie.id), locatie);
      console.log(`✅ Added: ${locatie.vestiging} (${locatie.regio})`);
    }
    
    console.log(`\n✅ Successfully seeded ${locaties.length} Richting locaties!`);
  } catch (error) {
    console.error('❌ Error seeding Richting locaties:', error);
    throw error;
  }
}

seedRichtingLocaties()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Failed:', error);
    process.exit(1);
  });


