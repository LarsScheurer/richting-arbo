/**
 * Substance Service - Firestore operations for Hazardous Substances
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
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { Substance } from '../types/firestore';

const cleanData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const substanceService = {
  /**
   * Get all substances for a customer
   */
  getSubstancesByCustomer: async (customerId: string): Promise<Substance[]> => {
    try {
      const q = query(
        collection(db, 'substances'),
        where('customerId', '==', customerId),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Substance));
    } catch (error) {
      console.error('Error getting substances:', error);
      return [];
    }
  },

  /**
   * Get a single substance by ID
   */
  getSubstance: async (substanceId: string): Promise<Substance | null> => {
    try {
      const substanceRef = doc(db, 'substances', substanceId);
      const substanceSnap = await getDoc(substanceRef);
      
      if (!substanceSnap.exists()) {
        return null;
      }
      
      return {
        id: substanceSnap.id,
        ...substanceSnap.data()
      } as Substance;
    } catch (error) {
      console.error('Error getting substance:', error);
      return null;
    }
  },

  /**
   * Add a new substance
   */
  addSubstance: async (substance: Omit<Substance, 'id' | 'createdAt' | 'updatedAt'>): Promise<Substance> => {
    try {
      const substanceData = {
        ...substance,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'substances'), cleanData(substanceData));
      
      return {
        id: docRef.id,
        ...substanceData
      };
    } catch (error) {
      console.error('Error adding substance:', error);
      throw error;
    }
  },

  /**
   * Update an existing substance
   */
  updateSubstance: async (substanceId: string, updates: Partial<Omit<Substance, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const substanceRef = doc(db, 'substances', substanceId);
      await updateDoc(substanceRef, {
        ...cleanData(updates),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating substance:', error);
      throw error;
    }
  },

  /**
   * Delete a substance
   */
  deleteSubstance: async (substanceId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'substances', substanceId));
    } catch (error) {
      console.error('Error deleting substance:', error);
      throw error;
    }
  },

  /**
   * Batch import substances
   */
  batchImportSubstances: async (substances: Omit<Substance, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Substance[]> => {
    const results: Substance[] = [];
    
    for (const substance of substances) {
      try {
        const added = await substanceService.addSubstance(substance);
        results.push(added);
      } catch (error) {
        console.error(`Error importing substance "${substance.name}":`, error);
      }
    }
    
    return results;
  }
};

