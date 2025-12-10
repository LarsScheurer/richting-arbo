/**
 * Script om de prompt "1. publiek organisatie profiel" uit Firestore te lezen
 * 
 * Dit script toont de exacte inhoud van de prompt zodat we kunnen zien
 * wat de prompt vraagt en zorgen dat de code dat exact uitvoert.
 */

// Dit script moet in de browser console worden uitgevoerd
// omdat het de frontend Firebase SDK gebruikt

const readPromptFromFirestore = `
// Kopieer en plak deze code in de browser console (F12)

(async function() {
  console.log('📖 STAP 1: Prompt "1. publiek organisatie profiel" ophalen uit Firestore...\n');
  
  try {
    const { promptService } = await import('./services/firebase');
    const allPrompts = await promptService.getPrompts();
    
    // Zoek de prompt met naam "1. publiek organisatie profiel" of type "publiek_organisatie_profiel"
    const targetPrompt = allPrompts.find(p => 
      (p.name && p.name.toLowerCase().includes('publiek organisatie profiel')) ||
      p.type === 'publiek_organisatie_profiel'
    );
    
    if (!targetPrompt) {
      console.log('❌ Prompt niet gevonden!');
      console.log('\\nBeschikbare prompts:');
      allPrompts.forEach(p => {
        console.log(\`   - "\${p.name || p.id}": type="\${p.type}", isActief=\${p.isActief}, versie=\${p.versie}\`);
      });
      return null;
    }
    
    console.log('✅ Prompt gevonden!');
    console.log('\\n📋 Prompt Details:');
    console.log('   ID:', targetPrompt.id);
    console.log('   Naam:', targetPrompt.name || '(geen naam)');
    console.log('   Type:', targetPrompt.type);
    console.log('   Versie:', targetPrompt.versie);
    console.log('   isActief:', targetPrompt.isActief);
    console.log('   Lengte:', targetPrompt.promptTekst?.length || 0, 'karakters');
    
    console.log('\\n📝 PROMPT INHOUD:');
    console.log('=====================================================');
    console.log(targetPrompt.promptTekst || '(geen inhoud)');
    console.log('=====================================================');
    
    return targetPrompt;
  } catch (error) {
    console.error('❌ Fout bij ophalen prompt:', error);
    console.error('   Error details:', error.message);
    return null;
  }
})();
`;

console.log(readPromptFromFirestore);


