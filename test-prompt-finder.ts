/**
 * Test script om te verifiëren dat de prompt "organisatie profiel" correct wordt gevonden
 * 
 * Gebruik:
 * 1. Zorg dat je ingelogd bent in de applicatie
 * 2. Open de browser console (F12)
 * 3. Kopieer en plak deze code in de console
 * 4. Of voer uit: npm run test:prompt (als je dit script compileert)
 */

import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from './services/firebase';

async function testPromptFinder() {
  console.log('🔍 Test: Zoeken naar prompt "organisatie profiel"...\n');
  
  try {
    const promptsRef = collection(db, 'prompts');
    
    // Methode 1: Zoek met orderBy (zoals de Firebase Function doet)
    console.log('📋 Methode 1: Zoeken met orderBy versie desc...');
    try {
      const activePromptQuery = query(
        promptsRef,
        where('type', '==', 'publiek_organisatie_profiel'),
        where('isActief', '==', true),
        orderBy('versie', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(activePromptQuery);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        console.log('✅ Prompt gevonden (met orderBy):');
        console.log('   - ID:', doc.id);
        console.log('   - Naam:', data.name || data.naam || '(geen naam)');
        console.log('   - Type:', data.type);
        console.log('   - isActief:', data.isActief);
        console.log('   - Versie:', data.versie);
        console.log('   - Prompt lengte:', data.promptTekst?.length || 0, 'karakters');
        console.log('   - Eerste 100 karakters:', data.promptTekst?.substring(0, 100) || '(geen tekst)');
        return { found: true, doc, data };
      } else {
        console.log('⚠️ Geen prompt gevonden met orderBy, proberen zonder orderBy...');
      }
    } catch (orderByError: any) {
      console.log('⚠️ orderBy faalde:', orderByError.message);
      console.log('   Proberen zonder orderBy...');
    }
    
    // Methode 2: Zoek zonder orderBy (fallback zoals de Firebase Function doet)
    console.log('\n📋 Methode 2: Zoeken zonder orderBy...');
    const allActivePromptsQuery = query(
      promptsRef,
      where('type', '==', 'publiek_organisatie_profiel'),
      where('isActief', '==', true)
    );
    
    const allSnapshot = await getDocs(allActivePromptsQuery);
    
    if (!allSnapshot.empty) {
      // Sorteer in memory (zoals de Firebase Function doet)
      const sorted = allSnapshot.docs.sort((a, b) => {
        const versieA = a.data().versie || 0;
        const versieB = b.data().versie || 0;
        return versieB - versieA;
      });
      
      const doc = sorted[0];
      const data = doc.data();
      console.log('✅ Prompt gevonden (zonder orderBy, gesorteerd in memory):');
      console.log('   - ID:', doc.id);
      console.log('   - Naam:', data.name || data.naam || '(geen naam)');
      console.log('   - Type:', data.type);
      console.log('   - isActief:', data.isActief);
      console.log('   - Versie:', data.versie);
      console.log('   - Prompt lengte:', data.promptTekst?.length || 0, 'karakters');
      console.log('   - Eerste 100 karakters:', data.promptTekst?.substring(0, 100) || '(geen tekst)');
      console.log(`   - Totaal ${allSnapshot.docs.length} actieve prompt(s) gevonden`);
      return { found: true, doc, data };
    } else {
      console.log('❌ Geen actieve prompt gevonden met type "publiek_organisatie_profiel"');
      
      // Check of er prompts zijn met een ander type
      console.log('\n🔍 Controleren op andere types...');
      const allPromptsQuery = query(promptsRef, where('isActief', '==', true));
      const allPromptsSnapshot = await getDocs(allPromptsQuery);
      
      if (!allPromptsSnapshot.empty) {
        console.log(`   Gevonden ${allPromptsSnapshot.docs.length} actieve prompt(s) met andere types:`);
        allPromptsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          console.log(`   - "${data.name || data.naam || doc.id}": type="${data.type}", versie=${data.versie}`);
        });
      } else {
        console.log('   Geen actieve prompts gevonden in de database');
      }
      
      return { found: false };
    }
  } catch (error: any) {
    console.error('❌ Fout bij zoeken naar prompt:', error);
    console.error('   Error details:', error.message);
    return { found: false, error: error.message };
  }
}

// Export voor gebruik in andere bestanden
export { testPromptFinder };

// Als dit script direct wordt uitgevoerd (niet via import)
if (require.main === module) {
  testPromptFinder()
    .then((result) => {
      console.log('\n✅ Test voltooid');
      if (result.found) {
        console.log('✅ Prompt wordt correct gevonden en gebruikt!');
      } else {
        console.log('⚠️ Prompt niet gevonden - controleer Firestore instellingen');
      }
      process.exit(result.found ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Test gefaald:', error);
      process.exit(1);
    });
}




