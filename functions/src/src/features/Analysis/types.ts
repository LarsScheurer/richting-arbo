// src/features/Analysis/types.ts

// 1. CAO en Bedrijfsgegevens
export interface CaoData {
    naam: string;
    betrokken_partijen: string;
    status_onderhandelingen: string;
    belangrijkste_themas: string[];
    impact_op_bedrijfsvoering: string;
  }
  
  export interface Bedrijfsprofiel {
    naam: string;
    sector_beschrijving: string;
    activiteiten: string;
    actualiteit_arbeidsmarkt: string;
    cao: CaoData;
  }
  
  // 2. SBI en Locatie data
  export interface SbiCode {
    code: string;
    omschrijving: string;
  }
  
  export interface SbiData {
    codes: SbiCode[];
    locaties: {
      regio_activiteit: string;
      aantal_medewerkers_totaal: string; // String omdat AI soms "Onbekend" of "Ca. 50" zegt
      dichtstbijzijnde_richting_vestiging: string;
    };
  }
  
  // 3. Arbo Instrumenten
  export interface ArboInstrument {
    naam: string;
    url: string;
  }
  
  // 4. Risico Analyse (FINE & KINNEY METHODIEK)
  export interface RisicoCategorie {
    hoofdcategorie: 'Psychisch' | 'Fysiek' | 'Overig';
    risico: string;
    waarschijnlijkheid: number; // Factor W (0.2 - 10)
    blootstelling: number;      // Factor B (0.5 - 10)
    ernst: number;              // Factor E (1 - 100)
    score: number;              // Totaal (W * B * E)
  }
  
  export interface RisicoAnalyse {
    totaal_score: number;       // Som van alle scores
    gemiddelde_score: number;
    toelichting_score: string;
    categorieen: RisicoCategorie[];
  }
  
  // 5. Primaire Processen en Functies
  export interface Functie {
    functie_naam: string;
    taken: string;
  }
  
  // 6. Verzuim en Beroepsziekten
  export interface VerzuimEnZiekten {
    analyse_branche_verzuim: string;
    vergelijking_landelijk: string;
    beroepsziekten: string[];
    gevaarlijke_stoffen: string[];
  }
  
  // 7. Advies en Actie (Diensten & Stappenplan)
  export interface RichtingService {
    dienst: string;
    reden: string;
    url: string; // De vaste Richting URL's
  }
  
  export interface Stap {
    stap: number;
    actie: string;
    omschrijving: string;
  }
  
  export interface AdviesEnActie {
    speerpunten_ondernemer: string[];
    verwacht_effect_cao: string;
    voorgestelde_richting_services: RichtingService[];
    stappenplan: Stap[];
  }
  
  // 8. Metadata
  export interface Metadata {
    gegenereerd_op: string;
    copyright: string;
  }
  
  // --- HOOFD INTERFACE ---
  // Dit is het object dat je terugkrijgt van de AI Backend
  export interface CompanyAnalysisResponse {
    bedrijfsprofiel: Bedrijfsprofiel;
    sbi_data: SbiData;
    arbo_instrumenten: {
      arbocatalogus_status: string;
      instrumenten_lijst: ArboInstrument[];
    };
    risico_analyse: RisicoAnalyse;
    primaire_processen: string[];
    functies: Functie[];
    verzuim_en_ziekten: VerzuimEnZiekten;
    advies_en_actie: AdviesEnActie;
    bronnen: string[];
    metadata: Metadata;
  }
