/**
 * Process Service - Firestore operations for Processes
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
import { Process } from '../types/firestore';

const cleanData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

export const processService = {
  /**
   * Get all processes for a customer
   */
  getProcessesByCustomer: async (customerId: string): Promise<Process[]> => {
    try {
      const q = query(
        collection(db, 'processes'),
        where('customerId', '==', customerId),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Process));
    } catch (error) {
      console.error('Error getting processes:', error);
      return [];
    }
  },

  /**
   * Get a single process by ID
   */
  getProcess: async (processId: string): Promise<Process | null> => {
    try {
      const processRef = doc(db, 'processes', processId);
      const processSnap = await getDoc(processRef);
      
      if (!processSnap.exists()) {
        return null;
      }
      
      return {
        id: processSnap.id,
        ...processSnap.data()
      } as Process;
    } catch (error) {
      console.error('Error getting process:', error);
      return null;
    }
  },

  /**
   * Add a new process
   */
  addProcess: async (process: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>): Promise<Process> => {
    try {
      const processData = {
        ...process,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const docRef = await addDoc(collection(db, 'processes'), cleanData(processData));
      
      return {
        id: docRef.id,
        ...processData
      };
    } catch (error) {
      console.error('Error adding process:', error);
      throw error;
    }
  },

  /**
   * Update an existing process
   */
  updateProcess: async (processId: string, updates: Partial<Omit<Process, 'id' | 'createdAt'>>): Promise<void> => {
    try {
      const processRef = doc(db, 'processes', processId);
      await updateDoc(processRef, {
        ...cleanData(updates),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating process:', error);
      throw error;
    }
  },

  /**
   * Delete a process
   */
  deleteProcess: async (processId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'processes', processId));
    } catch (error) {
      console.error('Error deleting process:', error);
      throw error;
    }
  },

  /**
   * Batch import processes
   */
  batchImportProcesses: async (processes: Omit<Process, 'id' | 'createdAt' | 'updatedAt'>[]): Promise<Process[]> => {
    const results: Process[] = [];
    
    for (const process of processes) {
      try {
        const added = await processService.addProcess(process);
        results.push(added);
      } catch (error) {
        console.error(`Error importing process "${process.name}":`, error);
      }
    }
    
    return results;
  }
};


