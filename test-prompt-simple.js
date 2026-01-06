/**
 * Eenvoudig test script om te controleren of de prompt "organisatie profiel" wordt gevonden
 * 
 * Gebruik: node test-prompt-simple.js
 * 
 * Let op: Dit script gebruikt de frontend Firebase SDK, dus je moet eerst
 * de Firebase configuratie controleren of dit script aanpassen voor Node.js.
 */

// Dit script werkt het beste in de browser console
// Voor Node.js zou je Firebase Admin SDK moeten gebruiken

console.log('🔍 Test: Zoeken naar prompt "organisatie profiel"...\n');
console.log('');
console.log('⚠️  Dit script werkt het beste in de browser console!');
console.log('');
console.log('📋 Instructies:');
console.log('1. Open de applicatie in je browser (http://localhost:3000)');
console.log('2. Log in als admin gebruiker');
console.log('3. Open browser console (F12)');
console.log('4. Kopieer en plak de code hieronder:');
console.log('');
console.log('=====================================================');
console.log('');

const testCode = `
(async function() {
  console.log('🔍 Test: Zoeken naar prompt "organisatie profiel"...\\n');
  
  try {
    const { promptService } = await import('./services/firebase');
    const allPrompts = await promptService.getPrompts();
    const matchingPrompts = allPrompts.filter(p => 
      p.type === 'publiek_organisatie_profiel' && p.isActief === true
    );
    
    if (matchingPrompts.length > 0) {
      const sorted = matchingPrompts.sort((a, b) => (b.versie || 0) - (a.versie || 0));
      const prompt = sorted[0];
      
      console.log('✅ Prompt gevonden!');
      console.log('   ID:', prompt.id);
      console.log('   Naam:', prompt.name || '(geen naam)');
      console.log('   Type:', prompt.type);
      console.log('   Versie:', prompt.versie);
      console.log('   isActief:', prompt.isActief);
      console.log('   Prompt lengte:', prompt.promptTekst?.length || 0, 'karakters');
      console.log('   Eerste 200 karakters:', prompt.promptTekst?.substring(0, 200) || '(geen tekst)');
      console.log(\`\\n   Totaal \${matchingPrompts.length} actieve prompt(s) met dit type gevonden\`);
      if (matchingPrompts.length > 1) {
        console.log('   Andere versies:');
        sorted.slice(1).forEach(p => {
          console.log(\`     - Versie \${p.versie}: \${p.name || p.id}\`);
        });
      }
      return { found: true, prompt };
    } else {
      console.log('❌ Geen actieve prompt gevonden met type "publiek_organisatie_profiel"');
      
      const activePrompts = allPrompts.filter(p => p.isActief === true);
      if (activePrompts.length > 0) {
        console.log(\`\\n🔍 Gevonden \${activePrompts.length} actieve prompt(s) met andere types:\`);
        activePrompts.forEach(p => {
          console.log(\`   - "\${p.name || p.id}": type="\${p.type}", versie=\${p.versie}\`);
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
})();
`;

console.log(testCode);
console.log('');
console.log('=====================================================');
console.log('');
console.log('💡 Tip: Je kunt deze code ook direct in de console plakken!');




