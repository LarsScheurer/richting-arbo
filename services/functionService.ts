/**
 * Function Service - Firestore operations for Functions (Job Functions/Roles)
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
import { Function } from '../types/firestore';

const cleanData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const functionService = {
  /**
   * Get all functions for a customer
   */
  getFunctionsByCustomer: async (customerId: string): Promise<Function[]> => {
    try {
      const q = query(
        collection(db, 'functions'),
        where('customerId', '==', customerId),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Function));
    } catch (error) {
      console.error('Error getting functions:', error);
      return [];
    }
  },

  /**
   * Get a single function by ID
   */
  getFunction: async (functionId: string): Promise<Function | null> => {
    try {
      const functionRef = doc(db, 'functions', functionId);
      const functionSnap = await getDoc(functionRef);
      
      if (!functionSnap.exists()) {
        return null;
      }
      
      return {
        id: functionSnap.id,
        ...functionSnap.data()
      } as Function;
    } catch (error) {
      console.error('Error getting function:', error);
      return null;
    }
  },

  /**
   * Add a new function
   */
  addFunction: async (function_: Omit<Function, 'id' | 'createdAt' | 'updatedAt'>): Promise<Function> => {
    try {
      const functionData = {
        ...function_,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'functions'), cleanData(functionData));
      
      return {
        id: docRef.id,
        ...functionData
      };
    } catch (error) {
      console.error('Error adding function:', error);
      throw error;
    }
  },

  /**
   * Update an existing function
   */
  updateFunction: async (functionId: string, updates: Partial<Omit<Function, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const functionRef = doc(db, 'functions', functionId);
      await updateDoc(functionRef, {
        ...cleanData(updates),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating function:', error);
      throw error;
    }
  },

  /**
   * Delete a function
   */
  deleteFunction: async (functionId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'functions', functionId));
    } catch (error) {
      console.error('Error deleting function:', error);
      throw error;
    }
  },

  /**
   * Batch import functions
   */
  batchImportFunctions: async (functions: Omit<Function, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Function[]> => {
    const results: Function[] = [];
    
    for (const function_ of functions) {
      try {
        const added = await functionService.addFunction(function_);
        results.push(added);
      } catch (error) {
        console.error(`Error importing function "${function_.name}":`, error);
      }
    }
    
    return results;
  }
};

