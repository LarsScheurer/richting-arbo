/**
 * Browser Console Test Script
 * 
 * Kopieer en plak deze code in de browser console (F12) om te testen
 * of de prompt "organisatie profiel" correct wordt gevonden.
 * 
 * Zorg dat je eerst ingelogd bent in de applicatie!
 */

async function testPromptFinder() {
  console.log('🔍 Test: Zoeken naar prompt "organisatie profiel"...\n');
  
  try {
    // Import Firebase (als je dit in de console plakt, moet Firebase al geladen zijn)
    const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
    
    // Haal db op uit de services (dit werkt alleen als je dit in de app context uitvoert)
    // Alternatief: gebruik window.db als die beschikbaar is
    let db;
    if (window.db) {
      db = window.db;
    } else {
      // Probeer db te vinden via de app
      const { db: firebaseDb } = await import('./services/firebase');
      db = firebaseDb;
    }
    
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
    } catch (orderByError) {
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
  } catch (error) {
    console.error('❌ Fout bij zoeken naar prompt:', error);
    console.error('   Error details:', error.message);
    return { found: false, error: error.message };
  }
}

// Eenvoudigere versie die werkt vanuit de browser console
// Gebruik deze versie als je dit direct in de console plakt
window.testPromptFinder = async function() {
  const { getFirestore, collection, query, where, orderBy, limit, getDocs } = await import('firebase/firestore');
  const { db } = await import('./services/firebase');
  
  console.log('🔍 Test: Zoeken naar prompt "organisatie profiel"...\n');
  
  try {
    const promptsRef = collection(db, 'prompts');
    
    // Probeer eerst met orderBy
    try {
      const q = query(
        promptsRef,
        where('type', '==', 'publiek_organisatie_profiel'),
        where('isActief', '==', true),
        orderBy('versie', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        const data = doc.data();
        console.log('✅ Prompt gevonden!');
        console.log('   Naam:', data.name || data.naam || doc.id);
        console.log('   Type:', data.type);
        console.log('   Versie:', data.versie);
        console.log('   isActief:', data.isActief);
        return { found: true, data };
      }
    } catch (e) {
      console.log('⚠️ orderBy faalde, proberen zonder...');
    }
    
    // Fallback zonder orderBy
    const q2 = query(
      promptsRef,
      where('type', '==', 'publiek_organisatie_profiel'),
      where('isActief', '==', true)
    );
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      const sorted = snapshot2.docs.sort((a, b) => (b.data().versie || 0) - (a.data().versie || 0));
      const doc = sorted[0];
      const data = doc.data();
      console.log('✅ Prompt gevonden (zonder orderBy)!');
      console.log('   Naam:', data.name || data.naam || doc.id);
      console.log('   Type:', data.type);
      console.log('   Versie:', data.versie);
      console.log('   isActief:', data.isActief);
      return { found: true, data };
    }
    
    console.log('❌ Geen prompt gevonden');
    return { found: false };
  } catch (error) {
    console.error('❌ Fout:', error);
    return { found: false, error: error.message };
  }
};

console.log('✅ Test script geladen! Voer uit: testPromptFinder()');


