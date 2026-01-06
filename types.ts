
// Update Customer interface met driveFolderId
export interface Customer {
  id: string;
  name: string;
  industry: string;
  website?: string;
  driveFolderId?: string; // Toegevoegd voor Google Drive integratie
  status: 'active' | 'prospect' | 'churned' | 'rejected';
  statusDetails?: {
    date: string; // ISO Date of status change
    reason: string;
    updatedBy?: string;
  };
  satisfaction?: {
    trust: number; // 1-10
    attention: number; // 1-10
    equality: number; // 1-10
    notes?: string;
    lastUpdated: string;
    previousAverage?: number; // To calculate trend
  };
  satisfactionHistory?: {
    date: string;
    trust: number;
    attention: number;
    equality: number;
    average: number;
    notes?: string;
  }[];
  logoUrl?: string;
  assignedUserIds: string[]; // List of users who have access to this client
  createdAt: string;
  employeeCount?: number; // Aantal medewerkers bij de klant
  hasRIE?: boolean; // Heeft de klant al een RIE?
  klantreis?: {
    levels: KlantreisLevel[];
    socialControlsScore?: number; // Final score (0-100)
    lastUpdated?: string;
  };
}
