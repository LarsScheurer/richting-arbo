# Richting Kennisbank - Documentatie

## 📋 Inhoudsopgave
1. [Overzicht](#overzicht)
2. [Architectuur](#architectuur)
3. [Firebase Setup](#firebase-setup)
4. [Authenticatie & Gebruikersbeheer](#authenticatie--gebruikersbeheer)
5. [Settings & Beheer](#settings--beheer)
6. [Prompt Management](#prompt-management)
7. [Organisatie Analyse](#organisatie-analyse)
8. [GitHub & Security](#github--security)
9. [Development](#development)

---

## 🎯 Overzicht

**Richting Kennisbank** is een webapplicatie voor het beheren van klantgegevens, organisatieanalyses, en kennisbank content voor Richting (arbodienst).

### Hoofdfunctionaliteiten:
- **Dashboard**: Overzicht van documenten en nieuws
- **Klantenbeheer**: CRUD operaties voor klanten en organisatieprofielen
- **Organisatie Analyse**: AI-gestuurde branche- en cultuuranalyses
- **Kennisbank**: Documentbeheer met categorisering
- **Chat**: AI-vragen beantwoorden met Gemini
- **Settings**: Gebruikers-, prompt- en databeheer (Admin only)
- **Regio View**: Locatie matching en medewerkers per regio

---

## 🏗️ Architectuur

### Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Firestore, Auth, Functions)
- **AI**: Google Gemini API
- **Deployment**: Firebase Hosting

### Projectstructuur
```
richting-kennisbank/
├── src/
│   ├── App.tsx              # Hoofdcomponent met routing
│   ├── types.ts             # TypeScript interfaces
│   ├── services/
│   │   ├── firebase.ts      # Firebase services (Auth, Firestore)
│   │   └── geminiService.ts # Gemini API integratie
│   └── components/
│       └── Layout.tsx       # Layout component met navigatie
├── functions/               # Firebase Cloud Functions
│   └── lib/
│       └── index.js         # Compiled functions
└── public/                  # Statische assets
```

### Database Structuur
- **Database**: `richting01` (named database in Firestore)
- **Collections**:
  - `users` - Gebruikers met rollen
  - `customers` - Klantgegevens
  - `organisatieProfielen` - Organisatie analyses
  - `documents` - Kennisbank documenten
  - `prompts` - AI prompts voor analyses
  - `promptTypes` - Prompt type definities
  - `richtingLocaties` - Richting vestigingslocaties
  - `analyseProgress` - Progress tracking voor stapsgewijze analyses

---

## 🔐 Authenticatie & Gebruikersbeheer

### Rollen
- **ADMIN**: Volledige toegang, inclusief Settings
- **EDITOR**: Kan klanten en analyses beheren
- **READER**: Alleen lezen

### Gebruiker Toevoegen (Admin)
1. Ga naar **Instellingen → Autorisatie**
2. Klik op **"+ Toevoegen"**
3. Vul in:
   - **Naam**: Volledige naam
   - **E-mailadres**: Geldig email adres
   - **Rol**: Admin / Editor / Reader
4. Klik **"Gebruiker Aanmaken"**

**Wat gebeurt er:**
- Gebruiker wordt aangemaakt in Firebase Auth
- User document wordt aangemaakt in Firestore
- Automatisch wachtwoord reset email wordt verzonden
- Gebruiker kan eigen wachtwoord instellen via email link

### Gebruiker Bewerken
- **Rol wijzigen**: Gebruik dropdown in gebruikerslijst
- **Verwijderen**: Klik "Verwijderen" knop (verwijdert alleen Firestore document, niet Auth account)

---

## ⚙️ Settings & Beheer

### Tab Structuur
Alle tabs volgen dezelfde eenduidige structuur:
- **Header**: Titel links, actie knoppen rechts
- **Lijst**: Items met "Bewerken" en "Verwijderen" knoppen
- **Toevoegen**: "+ Toevoegen" knop rechtsboven

### 1. Autorisatie Tab
**Functionaliteit:**
- Gebruikerslijst met naam, email, rol
- Rol wijzigen via dropdown
- Gebruiker toevoegen (modal)
- Gebruiker verwijderen

**Zichtbaar voor:** ADMIN only

### 2. Promptbeheer Tab
**Functionaliteit:**
- Prompts lijst (geordend op nummer: 1, 2, 3...)
- Prompts exporteren naar JSON
- Prompts importeren uit JSON
- Prompt toevoegen/bewerken/verwijderen
- Prompt activeren (één actief per type)

**Prompt Types:**
- `publiek_organisatie_profiel` - Organisatie analyse
- `publiek_cultuur_profiel` - Cultuur analyse
- `other` - Overige prompts

**Zichtbaar voor:** ADMIN only

### 3. Databeheer Tab
**Functionaliteit:**
- Imports overzicht (placeholder)
- Richting Locaties seeden
- Locaties beheren

**Zichtbaar voor:** ADMIN only

### 4. Typebeheer Tab
**Functionaliteit:**
- Prompt types lijst
- Type toevoegen (ID + Label)
- Type label bewerken
- Type verwijderen (alleen als geen prompts gebruikt)

**Zichtbaar voor:** ADMIN only

---

## 🤖 Prompt Management

### Prompt Structuur
```typescript
interface Prompt {
  id: string;
  name: string;
  type: string;              // 'publiek_organisatie_profiel' | 'publiek_cultuur_profiel' | 'other'
  promptTekst: string;       // De daadwerkelijke prompt tekst
  versie: number;            // Versie nummer
  isActief: boolean;          // Alleen één actief per type
  createdAt: string;
  createdBy: string;
  files?: Array<{            // Optionele bijlagen
    id: string;
    name: string;
    content: string;
  }>;
}
```

### Prompt Activatie
- Per type kan slechts **één prompt actief** zijn
- Bij activatie worden andere prompts van hetzelfde type automatisch gedeactiveerd
- Alleen voor types: `publiek_organisatie_profiel` en `publiek_cultuur_profiel`

### Prompt Gebruik in Functions
- **analyseBranche**: Gebruikt actieve prompt van type `publiek_organisatie_profiel`
- **analyseBrancheStapsgewijs**: Gebruikt actieve prompt van type `publiek_organisatie_profiel`
- **analyseCultuurTest**: Gebruikt actieve prompt van type `publiek_cultuur_profiel`

### Export/Import
- **Export**: Alle prompts naar JSON bestand
- **Import**: Prompts uit JSON bestand (met optie om bestaande te overschrijven)

---

## 📊 Organisatie Analyse

### Analyse Types

#### 1. Stapsgewijze Analyse (Aanbevolen)
**Functie:** `analyseBrancheStapsgewijs`

**Hoe het werkt:**
1. Frontend start analyse via HTTP call
2. Function initialiseert `analyseProgress` document in Firestore
3. Function verwerkt 13 hoofdstukken sequentieel:
   - Hoofdstukken 1-6: Basis informatie
   - Hoofdstukken 7-9: Verzuim, beroepsziekten, gevaarlijke stoffen
   - Hoofdstukken 10-13: Matrices, speerpunten, stappenplan, bronvermelding
4. Elke hoofdstuk wordt opgeslagen in Firestore met status
5. Frontend pollt `getAnalyseProgress` voor real-time updates
6. Na voltooiing wordt volledig rapport gegenereerd en opgeslagen

**Voordelen:**
- Tussentijdse resultaten zichtbaar
- Betere error handling per hoofdstuk
- Snellere feedback voor gebruiker

#### 2. Klassieke Analyse
**Functie:** `analyseBranche`

**Hoe het werkt:**
1. Frontend start analyse via HTTP call
2. Function haalt actieve prompt op uit Firestore
3. Function genereert volledig rapport in één keer
4. Resultaat wordt teruggestuurd naar frontend
5. Frontend slaat op in `organisatieProfiel`

### Fine & Kinney Risicoberekening
**Formule:** `Risicogetal (R) = Blootstelling (B) × Kans (W) × Effect (E)`

**Waarden:**
- **Blootstelling (B)**: 1-10 (aantal personen)
- **Kans (W)**: 0.5, 1, 3, 6, of 10
- **Effect (E)**: 1, 3, 7, 15, of 40

**Prioriteit:**
- R >= 400 → Prioriteit 1 (Zeer hoog)
- R >= 200 → Prioriteit 2 (Hoog)
- R >= 100 → Prioriteit 3 (Middel)
- R >= 50 → Prioriteit 4 (Laag)
- R < 50 → Prioriteit 5 (Zeer laag)

### Data Structuur
```typescript
interface OrganisatieProfiel {
  customerId: string;
  volledigRapport: string;        // Markdown rapport
  risicos: Risico[];              // Array van risico's
  processen: Proces[];            // Array van processen
  functies: Functie[];            // Array van functies
  analyseDatum: string;
  organisatieNaam: string;
  website: string;
}

interface Risico {
  id: string;
  naam: string;
  categorie: string;               // 'Psychisch' | 'Fysiek' | 'Overige'
  kans: number;                    // 1-5 (wordt omgezet naar Fine & Kinney)
  effect: number;                  // 1-5 (wordt omgezet naar Fine & Kinney)
  blootstelling: number;           // 1-10
  risicogetal: number;             // B × W × E
  prioriteit?: number;             // 1-5
}
```

---

## 🔒 GitHub & Security

### Backup Strategie
- **Versie tags**: `v1.0`, `v1.1`, etc.
- **Commits**: Elke belangrijke wijziging wordt gecommit
- **Remote**: GitHub repository `LarsScheurer/richting-arbo`

### Security Best Practices
1. **Tokens**: Nooit in code of config bestanden
2. **Keychain**: GitHub PAT staat in macOS Keychain
3. **Credential Helper**: `osxkeychain` geconfigureerd
4. **Remote URL**: Standaard (geen token in URL)

### Backup Maken
```bash
# 1. Commit alle wijzigingen
git add .
git commit -m "Beschrijving van wijzigingen"

# 2. Maak tag
git tag v1.1

# 3. Push naar GitHub
git push origin main
git push origin v1.1
```

### Token Beheer
- **Nieuwe token maken**: GitHub → Settings → Developer settings → Personal access tokens
- **Oude token verwijderen**: Verwijder op GitHub na nieuwe token installatie
- **Token in Keychain**: Automatisch opgeslagen bij eerste push

---

## 💻 Development

### Lokaal Starten
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Applicatie draait op: http://localhost:5173
```

### Firebase Functions
```bash
cd functions

# Install dependencies
npm install

# Deploy functions
firebase deploy --only functions

# Deploy specifieke function
firebase deploy --only functions:analyseBrancheStapsgewijs
```

### Environment Variables
- **Frontend**: `.env.local` (niet gecommit)
- **Functions**: `functions/.env` (niet gecommit)
- **Gemini API Key**: Moet geconfigureerd zijn in Firebase Functions config

### Firebase Configuratie
- **Project**: `richting-sales-d764a`
- **Database**: `richting01` (named database)
- **Region**: `europe-west4`

### Belangrijke URLs
- **Development**: `http://localhost:5173`
- **Firebase Console**: https://console.firebase.google.com/
- **GitHub**: https://github.com/LarsScheurer/richting-arbo

---

## 📝 Belangrijke Notities

### Prompt Type Naamgeving
- **Oude naam**: `branche_analyse` (niet meer gebruikt)
- **Nieuwe naam**: `publiek_organisatie_profiel` (eenduidig)
- **Migratie**: Automatisch bij het ophalen van prompts/types

### Stapsgewijze Analyse
- Gebruikt **actieve prompt** uit Firestore
- Context wordt doorgegeven tussen hoofdstukken
- Progress wordt real-time bijgewerkt in Firestore
- Frontend pollt elke 2 seconden voor updates

### Error Handling
- JSON parsing errors worden opgevangen en gerepareerd
- Fallback naar default prompts als Firestore leeg is
- User-friendly error messages in UI

### Performance
- Stapsgewijze analyse voorkomt timeouts
- Progress polling: elke 2 seconden
- Lazy loading van grote datasets

---

## 🐛 Troubleshooting

### "Database 'richting01' niet gevonden"
- Controleer Firebase Console → Firestore → Databases
- Zorg dat named database `richting01` bestaat

### "Prompt niet gevonden"
- Controleer Firestore collection `prompts`
- Zorg dat er een actieve prompt is voor het type
- Gebruik "Herstel Default Prompts" knop

### "Token error" bij Git push
- Controleer Keychain Access → zoek "github.com"
- Verwijder oude credentials en push opnieuw
- Of gebruik: `GIT_SSL_NO_VERIFY=true git push origin main`

### Prompts niet zichtbaar
- Controleer browser console (F12)
- Controleer Firestore collection `prompts` in database `richting01`
- Gebruik "Herstel Default Prompts" knop

---

## 📚 Aanvullende Resources

- **Firebase Docs**: https://firebase.google.com/docs
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com
- **GitHub Repo**: https://github.com/LarsScheurer/richting-arbo

---

**Laatste update**: 9 december 2025  
**Versie**: 1.0

