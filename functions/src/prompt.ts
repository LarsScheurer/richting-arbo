// functions/src/prompts.ts

export const LEVEL_PROMPTS: Record<number, string> = {
    0: `
  # PROMPT LEVEL 0: Publiek Branche Profiel (PBP)
  **Rol:** Senior Arbeidshygiënist en Sector-specialist.
  **Opdracht:** Voer een diepgaande branche-analyse uit voor de sector van [NAAM ORGANISATIE].
  **Output:**
  1. Wettelijke Kaders (Arbocatalogus, Branche-RI&E, NLA Focus).
  2. Sectorale Risico Top 5 (Fysiek, PSA, Veiligheid).
  3. Gevaarlijke Stoffen (CMR-stoffen check).
  4. Verzuimtrends & Beroepsziekten in de sector.
  
  Genereer een professioneel, visueel sterk rapport in Markdown.
  `,
  
    1: `
  # PROMPT LEVEL 1: Publiek Organisatie Profiel (POP)
  **Rol:** Senior Business Analist en Arbeidsdeskundige.
  **Input:** Gebruik de output van Level 0: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Maak een organisatieanalyse van [NAAM ORGANISATIE].
  **Output:**
  1. Identiteit & Financiële Context (Stabiliteit, Groei/Krimp).
  2. Arbeidsverhoudingen (CAO, Basiscontract check).
  3. Operationele Structuur (Primaire processen, Werktijden).
  4. Locaties & Fysieke Omgeving (Gebouwtype).
  5. Kwetsbare Groepen (Stagiaires, Uitzendkrachten).
  6. Gap-Analyse (Welke brancherisico's uit L0 zijn hier NIET van toepassing?).
  7. Organisatie Score (1-10) en Groeipad.
  `,
  
    2: `
  # PROMPT LEVEL 2: Publiek Cultuur Profiel (PCP)
  **Rol:** Arbeids- en Organisatiepsycholoog (A&O).
  **Input:** Gebruik de output van Level 1: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Analyseer cultuur, leiderschap en PSA risico's.
  **Output:**
  1. Cultuurtype & Kernwaarden (Waarden vs. Realiteit/Reviews).
  2. Leiderschap & Autonomie (Mate van regieruimte).
  3. Psychosociale Arbeidsbelasting (Werkdruk signalen, Sociale veiligheid).
  4. Advies Fase 2: Cultuur & Leiderschap.
  5. Cultuur Score (1-10) en Groeipad.
  `,
  
    3: `
  # PROMPT LEVEL 3: Publiek Arbeidsomstandigheden Profiel (PAP)
  **Rol:** Veiligheidskundige (HVK).
  **Input:** Gebruik de output van Level 2: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Voer de Risico-Inventarisatie uit.
  **Output:**
  1. Gebouw & BHV (Vluchtwegen, Klimaat).
  2. Gevaarlijke Stoffen (Koppeling Stoffen L0 aan Functies L1).
  3. Arbeidsmiddelen & Machineveiligheid.
  4. Fysieke Belasting (Kantoor & Uitvoering).
  5. Organisatie van de Zorg (Gap-Check preventiemedewerker/contract).
  6. Fysieke Veiligheid Score (1-10) en Groeipad.
  `,
  
    4: `
  # PROMPT LEVEL 4: Publiek Risico Profiel (PRP)
  **Rol:** Risico-expert.
  **Input:** Gebruik de output van Level 3: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Voer de Fine & Kinney evaluatie uit conform bedrijfsbeleid.
  **Rekenregels:** R = B x W x E (Effect max 15). Weeg Cultuur (L2) mee in Kans (W).
  **Output:**
  1. Risicoweging & Prioritering (>400 = Stopzetting, >200 = Direct Actie).
  2. Matrices (Procesrisico's & Verzuimrisico's).
  3. Plan van Aanpak (Arbeidshygiënische Strategie).
  4. Koppeling Richting Diensten (Advies voor Top-3 risico's).
  5. Risicobeheersing Score (1-10).
  `,
  
    5: `
  # PROMPT LEVEL 5: Basiscontract & Wettelijke Mitigatie
  **Rol:** Casemanager en Wetgevingsspecialist.
  **Input:** Gebruik de output van Level 4: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Bevestig mitigatie van systeemrisico's door Richting-contract.
  **Output:**
  1. Verzuimbeheersing (Curatie & Poortwachter).
  2. Wettelijke Mitigatie (Preventie: Arts, Second Opinion, Meldingen).
  3. Oplossing Systeemrisico's (Gap-Analyse Herstel).
  4. Compliance Score (1-10).
  `,
  
    6: `
  # PROMPT LEVEL 6: Strategisch Arbobeleid
  **Rol:** Beleidsadviseur.
  **Input:** Gebruik de output van Level 5: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Schrijf het integrale Beleidsdocument Risicobeoordeling.
  **Output:**
  1. Inleiding & Visie.
  2. Methodiek Vastlegging (Rekenregels L4).
  3. Risicoprofiel Management Summary.
  4. Strategie Plan van Aanpak (Integraal).
  5. Borging & Evaluatiecyclus.
  6. Beleidsvolwassenheid Score (1-10).
  `,
  
    7: `
  # PROMPT LEVEL 7: Operationele Samenwerking (OSB)
  **Rol:** Strategisch Adviseur & Partnership Manager.
  **Input:** Gebruik de output van Level 6: {{PREVIOUS_OUTPUT}}
  
  **Opdracht:** Ontwerp de Governance structuur en RACI-matrix.
  **Output:**
  1. Strategisch Kernteam (Samenstelling & Frequentie).
  2. RACI-Matrix (Verantwoordelijkheden Veiligheid/Cultuur/Gezondheid).
  3. Positie Preventiemedewerker.
  4. Uitvoeringsagenda (Jaarcyclus Q1-Q4).
  5. FINAAL DASHBOARD: Richting Vitaliteitsscore (Gemiddelde van alle scores).
  `
  };