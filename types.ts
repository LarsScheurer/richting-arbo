

export enum UserRole {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  READER = 'READER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  department?: string;
}

// --- CRM STRUCTURES ---
export interface ContactPerson {
  id: string;
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string; // e.g., "HR Manager"
}

export interface Location {
  id: string;
  customerId: string;
  name: string; // e.g. "Hoofdkantoor"
  address: string;
  city: string;
}

export interface Customer {
  id: string;
  name: string;
  industry: string;
  website?: string;
  status: 'active' | 'prospect' | 'churned' | 'rejected';
  logoUrl?: string;
  assignedUserIds: string[]; // List of users who have access to this client
  createdAt: string;
  employeeCount?: number; // Aantal medewerkers
  hasRIE?: boolean; // Heeft Risico Inventarisatie & Evaluatie
  notes?: string; // Extra notities/info
}

export enum DocType {
  PDF = 'PDF',
  URL = 'URL',
  TEXT = 'TEXT',
  EMAIL = 'EMAIL',
  GOOGLE_DOC = 'GOOGLE_DOC'
}

// Hierarchical Category Structure
export interface SubCategory {
  id: string;
  label: string;
}

export interface MainCategory {
  id: string;
  label: string;
  subCategories: SubCategory[];
}

export const KNOWLEDGE_STRUCTURE: MainCategory[] = [
  { 
    id: 'strategy', 
    label: 'Strategie & Visie', 
    subCategories: [
      { id: 'yearplan', label: 'Jaarplannen' },
      { id: 'management', label: 'Directie' },
      { id: 'market', label: 'Marktontwikkeling' }
    ] 
  },
  { 
    id: 'hr', 
    label: 'HR & Organisatie', 
    subCategories: [
      { id: 'handbook', label: 'Handboek' },
      { id: 'leave', label: 'Verlof & Verzuim' },
      { id: 'onboarding', label: 'Onboarding' },
      { id: 'wfh', label: 'Thuiswerken' }
    ] 
  },
  { 
    id: 'marketing', 
    label: 'Marketing & Sales', 
    subCategories: [
      { id: 'branding', label: 'Branding' },
      { id: 'campaigns', label: 'Campagnes' },
      { id: 'products', label: 'Productsheets' },
      { id: 'scripts', label: 'Sales Scripts' }
    ] 
  },
  { 
    id: 'tech', 
    label: 'IT & Development', 
    subCategories: [
      { id: 'security', label: 'Security' },
      { id: 'manuals', label: 'Handleidingen' },
      { id: 'stack', label: 'Tech Stack' },
      { id: 'protocols', label: 'Protocollen' }
    ] 
  },
  { 
    id: 'projects', 
    label: 'Projecten', 
    subCategories: [
      { id: 'active', label: 'Lopend' },
      { id: 'finished', label: 'Afgerond' },
      { id: 'cases', label: 'Case Studies' }
    ] 
  }
];

export interface DocumentSource {
  id: string;
  title: string;
  content: string; // Extracted text content for Gemini
  originalUrl?: string; // Link to original file or web URL
  type: DocType;
  uploadedBy: string; // User ID
  uploadedAt: string; // ISO Date
  
  // Link to CRM
  customerId?: string; // Optional link to a specific customer

  // AI Generated
  summary: string;
  mainCategoryId: string; // ID from KNOWLEDGE_STRUCTURE
  subCategoryId: string;  // ID from subCategories
  tags: string[];
  
  // Stats & Analytics
  viewedBy: string[]; // List of User IDs
  likedBy: string[];  // List of User IDs
  isArchived: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  citations?: string[]; // IDs of documents referenced
}

export interface GeminiAnalysisResult {
  summary: string;
  mainCategoryId: string;
  subCategoryId: string;
  tags: string[];
}

export interface BackupData {
  timestamp: string;
  users: User[];
  documents: DocumentSource[];
  customers: Customer[];
}

// --- ORGANISATIE ANALYSE STRUCTURES ---
export interface Risico {
  id: string;
  naam: string;
  categorie: 'psychisch' | 'fysiek' | 'overige';
  kans: number; // Fine & Kinney: 0.5, 1, 3, 6, 10 (Waarschijnlijkheid)
  effect: number; // Fine & Kinney: 1, 3, 7, 15, 40 (Effect)
  totaalScore?: number; // Oude berekening (niet meer gebruikt)
  blootstelling?: number; // Blootstelling (B) waarde
}

export interface Proces {
  id: string;
  naam: string;
  beschrijving: string;
  risicos?: Array<{
    risicoId: string;
    risico?: Risico;
    blootstelling?: number;
  }>;
}

export interface Functie {
  id: string;
  naam: string;
  beschrijving: string;
  fysiek?: number; // 1-5
  psychisch?: number; // 1-5
  risicos?: Array<{
    risicoId: string;
    risico?: Risico;
    blootstelling?: number;
  }>;
}

export interface OrganisatieProfiel {
  id: string;
  customerId: string;
  analyseDatum: string;
  geanalyseerdDoor: string;
  organisatieNaam: string;
  website: string;
  risicos: Risico[];
  processen: Proces[];
  functies: Functie[];
  volledigRapport: string;
  createdAt: string;
  updatedAt: string;
}