/**
 * Firestore Data Model for RI&E (Risico Inventarisatie & Evaluatie) Application
 * 
 * Architecture: Flat Collection Structure
 * - All entities stored as top-level collections
 * - Relationships via foreign keys (customerId, processId, etc.)
 * - Enables flexible querying and cross-organization benchmarking
 */

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Customer - Organization/Company
 */
export interface Customer {
  id: string;
  name: string;
  industry: string;
  website?: string;
  status: 'active' | 'prospect' | 'churned' | 'rejected';
  logoUrl?: string;
  assignedUserIds: string[]; // Users with access
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Process - Work process within an organization
 */
export interface Process {
  id: string;
  customerId: string; // Foreign key to Customer
  name: string;
  description?: string;
  relatedFunctionIds: string[]; // Functions involved in this process
  relatedSubstanceIds: string[]; // Substances used in this process
  createdAt: string;
  updatedAt: string;
}

/**
 * Function - Job function/role within an organization
 */
export interface Function {
  id: string;
  customerId: string; // Foreign key to Customer
  name: string;
  description?: string;
  department?: string;
  fysiek?: number; // Physical load rating (1-5)
  psychisch?: number; // Mental load rating (1-5)
  createdAt: string;
  updatedAt: string;
}

/**
 * Substance - Hazardous substance/material
 */
export interface Substance {
  id: string;
  customerId: string; // Foreign key to Customer
  name: string;
  casNumber?: string; // Chemical Abstracts Service number
  hazardPhrases: string[]; // e.g., ["H300", "H315", "H319"]
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * RiskAssessment - Central entity for risk calculations
 * 
 * Fine & Kinney Method:
 * - Probability (W): 0.5, 1, 3, 6, 10
 * - Effect (E): 1, 3, 7, 15, 40
 * - Exposure (B): 1-10 (number of people exposed)
 * - Calculated Score: P × E × B
 * 
 * Relationships:
 * - Can be linked to Process, Function, Substance, or combinations
 * - processId, functionId, substanceId are nullable
 */
export interface RiskAssessment {
  id: string;
  customerId: string; // Always required - which organization
  
  // Core risk data
  riskName: string;
  description?: string;
  category: 'psychisch' | 'fysiek' | 'overige';
  
  // Fine & Kinney values
  probability: number; // 0.5, 1, 3, 6, or 10 (Waarschijnlijkheid/W)
  effect: number; // 1, 3, 7, 15, or 40 (Effect/E)
  exposure: number; // 1-10 (Blootstelling/B - number of people)
  
  // Calculated field (auto-calculated: probability × effect × exposure)
  calculatedScore: number;
  
  // Priority level based on calculatedScore
  // 1 = Zeer hoog (≥400), 2 = Hoog (≥200), 3 = Middel (≥100), 4 = Laag (≥50), 5 = Zeer laag (<50)
  priority: number;
  
  // Relational fields (nullable - risk can be linked to one or more)
  processId?: string; // Foreign key to Process
  functionId?: string; // Foreign key to Function
  substanceId?: string; // Foreign key to Substance
  
  // Metadata
  createdBy: string; // User ID
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Risk Assessment with populated relations
 * Used for display purposes when you need full entity data
 */
export interface RiskAssessmentWithRelations extends RiskAssessment {
  process?: Process;
  function?: Function;
  substance?: Substance;
}

/**
 * Process with populated relations
 */
export interface ProcessWithRelations extends Process {
  relatedFunctions?: Function[];
  relatedSubstances?: Substance[];
  risks?: RiskAssessment[];
}

/**
 * Function with populated relations
 */
export interface FunctionWithRelations extends Function {
  risks?: RiskAssessment[];
  relatedProcesses?: Process[];
}

/**
 * Substance with populated relations
 */
export interface SubstanceWithRelations extends Substance {
  risks?: RiskAssessment[];
  relatedProcesses?: Process[];
}

// ============================================================================
// QUERY FILTERS
// ============================================================================

export interface RiskFilter {
  customerId?: string;
  processId?: string;
  functionId?: string;
  substanceId?: string;
  category?: RiskAssessment['category'];
  minScore?: number;
  maxScore?: number;
  priority?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate priority level from Fine & Kinney score
 */
export function calculatePriority(score: number): number {
  if (score >= 400) return 1; // Zeer hoog
  if (score >= 200) return 2; // Hoog
  if (score >= 100) return 3; // Middel
  if (score >= 50) return 4; // Laag
  return 5; // Zeer laag
}

/**
 * Calculate risk score using Fine & Kinney formula
 */
export function calculateRiskScore(probability: number, effect: number, exposure: number): number {
  return probability * effect * exposure;
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: number): string {
  const labels = ['', 'Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
  return labels[priority] || 'Onbekend';
}

/**
 * Get priority color (for UI)
 */
export function getPriorityColor(priority: number): string {
  const colors = ['', 'red', 'orange', 'yellow', 'blue', 'green'];
  return colors[priority] || 'gray';
}

