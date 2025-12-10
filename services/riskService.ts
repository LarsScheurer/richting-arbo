/**
 * Risk Service - Firestore operations for Risk Assessments
 * 
 * Uses Firebase v9 Modular SDK
 * Implements Fine & Kinney risk calculation method
 */

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  RiskAssessment, 
  RiskFilter, 
  calculateRiskScore, 
  calculatePriority 
} from '../types/firestore';

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Add a new risk assessment
 * Automatically calculates score and priority before saving
 */
export async function addRiskAssessment(
  risk: Omit<RiskAssessment, 'id' | 'calculatedScore' | 'priority' | 'createdAt' | 'updatedAt'>
): Promise<RiskAssessment> {
  try {
    // Calculate score using Fine & Kinney formula: P × E × B
    const calculatedScore = calculateRiskScore(
      risk.probability,
      risk.effect,
      risk.exposure
    );
    
    // Calculate priority based on score
    const priority = calculatePriority(calculatedScore);
    
    // Prepare document data
    const riskData: Omit<RiskAssessment, 'id'> = {
      ...risk,
      calculatedScore,
      priority,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Add to Firestore
    const docRef = await addDoc(collection(db, 'riskAssessments'), riskData);
    
    return {
      id: docRef.id,
      ...riskData
    };
  } catch (error) {
    console.error('Error adding risk assessment:', error);
    throw error;
  }
}

/**
 * Update an existing risk assessment
 * Recalculates score and priority if probability, effect, or exposure changed
 */
export async function updateRiskAssessment(
  riskId: string,
  updates: Partial<Omit<RiskAssessment, 'id' | 'createdAt' | 'calculatedScore' | 'priority'>>
): Promise<void> {
  try {
    const riskRef = doc(db, 'riskAssessments', riskId);
    const currentRisk = await getDoc(riskRef);
    
    if (!currentRisk.exists()) {
      throw new Error('Risk assessment not found');
    }
    
    const currentData = currentRisk.data() as RiskAssessment;
    
    // Recalculate if risk values changed
    let calculatedScore = currentData.calculatedScore;
    let priority = currentData.priority;
    
    if (updates.probability !== undefined || 
        updates.effect !== undefined || 
        updates.exposure !== undefined) {
      const probability = updates.probability ?? currentData.probability;
      const effect = updates.effect ?? currentData.effect;
      const exposure = updates.exposure ?? currentData.exposure;
      
      calculatedScore = calculateRiskScore(probability, effect, exposure);
      priority = calculatePriority(calculatedScore);
    }
    
    // Prepare update data
    const updateData: any = {
      ...updates,
      calculatedScore,
      priority,
      updatedAt: new Date().toISOString()
    };
    
    await updateDoc(riskRef, updateData);
  } catch (error) {
    console.error('Error updating risk assessment:', error);
    throw error;
  }
}

/**
 * Delete a risk assessment
 */
export async function deleteRiskAssessment(riskId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'riskAssessments', riskId));
  } catch (error) {
    console.error('Error deleting risk assessment:', error);
    throw error;
  }
}

/**
 * Get a single risk assessment by ID
 */
export async function getRiskAssessment(riskId: string): Promise<RiskAssessment | null> {
  try {
    const riskRef = doc(db, 'riskAssessments', riskId);
    const riskSnap = await getDoc(riskRef);
    
    if (!riskSnap.exists()) {
      return null;
    }
    
    return {
      id: riskSnap.id,
      ...riskSnap.data()
    } as RiskAssessment;
  } catch (error) {
    console.error('Error getting risk assessment:', error);
    throw error;
  }
}

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get all risks for a specific customer
 */
export async function getRisksByCustomer(customerId: string): Promise<RiskAssessment[]> {
  try {
    const q = query(
      collection(db, 'riskAssessments'),
      where('customerId', '==', customerId),
      orderBy('calculatedScore', 'desc') // Highest risk first
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
  } catch (error) {
    console.error('Error getting risks by customer:', error);
    throw error;
  }
}

/**
 * Get all risks linked to a specific process
 */
export async function getRisksByProcess(processId: string): Promise<RiskAssessment[]> {
  try {
    const q = query(
      collection(db, 'riskAssessments'),
      where('processId', '==', processId),
      orderBy('calculatedScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
  } catch (error) {
    console.error('Error getting risks by process:', error);
    throw error;
  }
}

/**
 * Get all risks linked to a specific function
 */
export async function getRisksByFunction(functionId: string): Promise<RiskAssessment[]> {
  try {
    const q = query(
      collection(db, 'riskAssessments'),
      where('functionId', '==', functionId),
      orderBy('calculatedScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
  } catch (error) {
    console.error('Error getting risks by function:', error);
    throw error;
  }
}

/**
 * Get all risks linked to a specific substance
 */
export async function getRisksBySubstance(substanceId: string): Promise<RiskAssessment[]> {
  try {
    const q = query(
      collection(db, 'riskAssessments'),
      where('substanceId', '==', substanceId),
      orderBy('calculatedScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
  } catch (error) {
    console.error('Error getting risks by substance:', error);
    throw error;
  }
}

/**
 * Get high-impact risks (score above threshold)
 */
export async function getHighImpactRisks(
  customerId: string, 
  threshold: number = 200
): Promise<RiskAssessment[]> {
  try {
    // Note: Firestore doesn't support > operator directly in queries
    // We fetch all and filter in memory, or use a compound index
    const q = query(
      collection(db, 'riskAssessments'),
      where('customerId', '==', customerId),
      orderBy('calculatedScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const allRisks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
    
    // Filter by threshold
    return allRisks.filter(risk => risk.calculatedScore >= threshold);
  } catch (error) {
    console.error('Error getting high-impact risks:', error);
    throw error;
  }
}

/**
 * Get risks with complex filters
 * Supports multiple filter criteria
 */
export async function getRisksByFilter(filter: RiskFilter): Promise<RiskAssessment[]> {
  try {
    const constraints: any[] = [];
    
    // Build query constraints
    if (filter.customerId) {
      constraints.push(where('customerId', '==', filter.customerId));
    }
    if (filter.processId) {
      constraints.push(where('processId', '==', filter.processId));
    }
    if (filter.functionId) {
      constraints.push(where('functionId', '==', filter.functionId));
    }
    if (filter.substanceId) {
      constraints.push(where('substanceId', '==', filter.substanceId));
    }
    if (filter.category) {
      constraints.push(where('category', '==', filter.category));
    }
    if (filter.priority) {
      constraints.push(where('priority', '==', filter.priority));
    }
    
    // Always order by score
    constraints.push(orderBy('calculatedScore', 'desc'));
    
    const q = query(collection(db, 'riskAssessments'), ...constraints);
    const snapshot = await getDocs(q);
    
    let risks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
    
    // Apply score filters (must be done in memory)
    if (filter.minScore !== undefined) {
      risks = risks.filter(r => r.calculatedScore >= filter.minScore!);
    }
    if (filter.maxScore !== undefined) {
      risks = risks.filter(r => r.calculatedScore <= filter.maxScore!);
    }
    
    return risks;
  } catch (error) {
    console.error('Error getting risks by filter:', error);
    throw error;
  }
}

/**
 * Get risks linked to BOTH a process AND a substance
 * This handles the complex relationship where a risk is caused by a substance during a process
 */
export async function getRisksByProcessAndSubstance(
  processId: string,
  substanceId: string
): Promise<RiskAssessment[]> {
  try {
    // Firestore doesn't support AND queries on different fields easily
    // We need to fetch and filter, or use a compound query
    const q = query(
      collection(db, 'riskAssessments'),
      where('processId', '==', processId),
      where('substanceId', '==', substanceId),
      orderBy('calculatedScore', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as RiskAssessment));
  } catch (error) {
    console.error('Error getting risks by process and substance:', error);
    // If compound query fails, fallback to fetching and filtering
    const processRisks = await getRisksByProcess(processId);
    return processRisks.filter(r => r.substanceId === substanceId);
  }
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Batch import risk assessments
 * Useful for importing from AI analysis
 */
export async function batchImportRiskAssessments(
  risks: Omit<RiskAssessment, 'id' | 'calculatedScore' | 'priority' | 'createdAt' | 'updatedAt'>[]
): Promise<RiskAssessment[]> {
  const results: RiskAssessment[] = [];
  
  for (const risk of risks) {
    try {
      const added = await addRiskAssessment(risk);
      results.push(added);
    } catch (error) {
      console.error(`Error importing risk "${risk.riskName}":`, error);
      // Continue with next risk
    }
  }
  
  return results;
}


