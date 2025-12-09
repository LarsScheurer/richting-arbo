# Testplan Richting Kennisbank v1.0

## 🎯 Testdoel
Verificeren dat alle recente wijzigingen correct werken en de applicatie stabiel is.

## 📋 Testcategorieën

### 1. Settings - Eenduidige Structuur ✅
**Doel:** Verificeren dat alle tabs dezelfde structuur hebben

#### 1.1 Autorisatie Tab
- [ ] Tab is zichtbaar voor ADMIN gebruikers
- [ ] Header toont "Gebruikers" met "+ Toevoegen" knop rechts
- [ ] Lijst toont alle gebruikers met naam, email en rol
- [ ] Elke gebruiker heeft "Bewerken" en "Verwijderen" knoppen
- [ ] Rol kan worden aangepast via dropdown
- [ ] "+ Toevoegen" knop werkt (of toont placeholder)

#### 1.2 Promptbeheer Tab
- [ ] Tab is zichtbaar voor ADMIN gebruikers
- [ ] Header toont "Prompts" met "Exporteer", "Importeer" en "+ Toevoegen" knoppen
- [ ] Prompts worden getoond, geordend op nummer (1, 2, 3...)
- [ ] Geen grijze type labels zichtbaar (alleen versie en actief badges)
- [ ] Elke prompt heeft "Bewerken" en "Verwijderen" knoppen
- [ ] Inactieve prompts hebben "Activeer" knop
- [ ] "+ Toevoegen" opent prompt editor
- [ ] "Exporteer" exporteert prompts naar JSON
- [ ] "Importeer" importeert prompts uit JSON

#### 1.3 Databeheer Tab
- [ ] Tab is zichtbaar voor ADMIN gebruikers
- [ ] Header toont "Imports" met "+ Toevoegen" knop rechts
- [ ] Richting Locaties sectie is zichtbaar
- [ ] "Seed Richting Locaties" knop werkt
- [ ] Locaties worden getoond na seeden

#### 1.4 Typebeheer Tab
- [ ] Tab is zichtbaar voor ADMIN gebruikers
- [ ] Header toont "Types" met inputvelden en "+ Toevoegen" knop
- [ ] Lijst toont alle prompt types met label en ID
- [ ] Elke type heeft "Bewerken" en "Verwijderen" knoppen
- [ ] "Bewerken" opent edit formulier
- [ ] "+ Toevoegen" voegt nieuw type toe

### 2. Prompt Functionaliteit ✅
**Doel:** Verificeren dat promptbeheer correct werkt

- [ ] Prompts worden geladen uit Firestore
- [ ] Prompts worden gesorteerd op nummer (1, 2, 3...)
- [ ] Type labels zijn verwijderd uit weergave
- [ ] Actieve prompts tonen "✓ Actief" badge
- [ ] Prompt editor opent bij "Bewerken"
- [ ] Prompt kan worden opgeslagen
- [ ] Prompt kan worden verwijderd
- [ ] Prompt kan worden geactiveerd
- [ ] Export werkt en genereert geldige JSON
- [ ] Import werkt en laadt prompts correct

### 3. Type Beheer Functionaliteit ✅
**Doel:** Verificeren dat typebeheer correct werkt

- [ ] Types worden geladen uit Firestore
- [ ] Default types zijn zichtbaar (Publiek Organisatie Profiel, Publiek Cultuur Profiel, Andere)
- [ ] Nieuw type kan worden toegevoegd
- [ ] Type label kan worden bewerkt
- [ ] Type kan worden verwijderd (alleen als geen prompts gebruikt)
- [ ] Foutmelding bij verwijderen type met prompts

### 4. Security & GitHub ✅
**Doel:** Verificeren dat security correct is geconfigureerd

- [ ] Geen tokens in git config
- [ ] Geen tokens in codebestanden
- [ ] Remote URL is standaard (geen token)
- [ ] Git push werkt automatisch via Keychain
- [ ] Token staat in macOS Keychain
- [ ] GitHub backup v1.0 tag bestaat

### 5. Algemene Functionaliteit ✅
**Doel:** Verificeren dat core features werken

- [ ] Login werkt
- [ ] Dashboard laadt
- [ ] Klanten overzicht werkt
- [ ] Organisatie analyse werkt
- [ ] Regio view werkt
- [ ] Kennisbank werkt
- [ ] Chat werkt

## 🧪 Testvolgorde

1. **Start met Settings tabs** (meest recent gewijzigd)
2. **Test Promptbeheer** (kernfunctionaliteit)
3. **Test Typebeheer** (nieuwe functionaliteit)
4. **Test Security** (verificatie)
5. **Test Algemene functionaliteit** (regressie)

## 📝 Testresultaten Template

```
Test: [Naam van test]
Datum: [Datum]
Tester: [Naam]
Resultaat: ✅ Pass / ❌ Fail
Opmerkingen: [Eventuele opmerkingen]
```

## 🐛 Bekende Issues

- Geen bekende issues op dit moment

## ✅ Acceptatiecriteria

- Alle Settings tabs hebben eenduidige structuur
- Prompts worden correct geordend en getoond
- Typebeheer werkt volledig
- Security is correct geconfigureerd
- Geen regressie in bestaande functionaliteit

