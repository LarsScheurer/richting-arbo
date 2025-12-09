import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  arrayUnion, 
  arrayRemove,
  query,
  orderBy,
  where,
  addDoc
} from 'firebase/firestore';
import { DocumentSource, User, UserRole, DocType, Customer, BackupData, Location, ContactPerson, OrganisatieProfiel } from '../types';

// --- STAP 1: CONFIGURATIE ---
const firebaseConfig = {
  apiKey: "AIzaSyDZh5R0sSQ-T3mnk9XS8WA0GV0t_xjD0pY",
  authDomain: "richting-sales-d764a.firebaseapp.com",
  projectId: "richting-sales-d764a",
  storageBucket: "richting-sales-d764a.firebasestorage.app",
  messagingSenderId: "228500270341",
  appId: "1:228500270341:web:1e2bbafbc609136a581b6c",
  measurementId: "G-6833KTWQ8K"
};

// --- STAP 2: INITIALISATIE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app, 'richting01'); // HARDE KOPPELING

console.log("Firebase geinitialiseerd. Project:", firebaseConfig.projectId, "Database: richting01");

// --- HELPER: DATA CLEANING ---
const cleanData = (data: any) => {
  return JSON.parse(JSON.stringify(data));
};

// --- AUTH SERVICE ---
export const authService = {
  login: async (email: string, pass: string): Promise<User> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return await getUserData(userCredential.user);
  },

  loginWithGoogle: async (): Promise<User> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      return await getUserData(result.user);
    } catch (e: any) {
      if (e.code === 'auth/unauthorized-domain') {
        const domain = window.location.hostname || window.location.host || 'localhost';
        console.error(`DOMEIN ERROR: Voeg '${domain}' toe aan Firebase Console -> Authentication -> Settings.`);
      }
      throw e;
    }
  },

  register: async (email: string, name: string, pass: string): Promise<User> => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const uid = userCredential.user.uid;
    
    const newUser: User = {
      id: uid,
      email,
      name,
      role: UserRole.EDITOR, 
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      department: 'General'
    };

    await setDoc(doc(db, 'users', uid), cleanData(newUser));
    return newUser;
  },

  logout: async () => signOut(auth),

  resetPassword: async (email: string) => sendPasswordResetEmail(auth, email),

  updateUserRole: async (userId: string, role: UserRole): Promise<void> => {
    await updateDoc(doc(db, 'users', userId), { role });
  },

  onAuthStateChange: (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await getUserData(firebaseUser);
        callback(user);
      } else {
        callback(null);
      }
    });
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      console.error("Error fetching users:", e);
      return [];
    }
  },

  deleteUser: async (userId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (e) {
      console.error("Error deleting user:", e);
      throw e;
    }
  },

  createUserByAdmin: async (email: string, name: string, role: UserRole): Promise<User> => {
    try {
      // Generate a temporary password (user will reset it)
      const tempPassword = `Temp${Math.random().toString(36).slice(-12)}!`;
      
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, tempPassword);
      const uid = userCredential.user.uid;
      
      // Create user document in Firestore
      const newUser: User = {
        id: uid,
        email,
        name,
        role,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
        department: 'General'
      };

      await setDoc(doc(db, 'users', uid), cleanData(newUser));
      
      // Send password reset email so user can set their own password
      await sendPasswordResetEmail(auth, email);
      
      return newUser;
    } catch (e: any) {
      console.error("Error creating user:", e);
      if (e.code === 'auth/email-already-in-use') {
        throw new Error('Dit e-mailadres is al in gebruik.');
      }
      throw new Error(`Fout bij aanmaken gebruiker: ${e.message}`);
    }
  },

  updateUser: async (userId: string, updates: { name?: string; email?: string; role?: UserRole }): Promise<void> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const updateData: any = {};
      
      if (updates.name !== undefined) {
        updateData.name = updates.name;
        // Update avatar URL if name changes
        updateData.avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(updates.name)}&background=random`;
      }
      
      if (updates.role !== undefined) {
        updateData.role = updates.role;
      }
      
      // Note: Email changes in Firebase Auth require special handling
      // For now, we only update the Firestore document
      // Email changes in Auth should be done separately if needed
      if (updates.email !== undefined) {
        updateData.email = updates.email;
      }
      
      await updateDoc(userDocRef, cleanData(updateData));
    } catch (e: any) {
      console.error("Error updating user:", e);
      throw new Error(`Fout bij bijwerken gebruiker: ${e.message}`);
    }
  }
};

async function getUserData(firebaseUser: FirebaseUser): Promise<User> {
  const userDocRef = doc(db, 'users', firebaseUser.uid);
  const userSnapshot = await getDoc(userDocRef);

  if (userSnapshot.exists()) {
    return { id: firebaseUser.uid, ...userSnapshot.data() } as User;
  } else {
    const newUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      role: UserRole.EDITOR,
      avatarUrl: firebaseUser.photoURL || undefined,
      department: 'General'
    };
    await setDoc(userDocRef, cleanData(newUser));
    return newUser;
  }
}

// --- DATABASE SERVICE ---
export const dbService = {
  getDocuments: async (): Promise<DocumentSource[]> => {
    try {
      const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          viewedBy: data.viewedBy || [],
          likedBy: data.likedBy || [],
          tags: data.tags || []
        } as DocumentSource;
      });
    } catch (e: any) {
      if (e.code === 'not-found') {
        console.error("CRITISCHE FOUT: Database 'richting01' bestaat niet.");
        throw new Error('FIREBASE_DB_NOT_FOUND');
      }
      throw e;
    }
  },

  // NIEUW: Documenten ophalen voor een specifieke klant (Dossier)
  getDocumentsForCustomer: async (customerId: string): Promise<DocumentSource[]> => {
    try {
      const q = query(collection(db, 'documents'), where('customerId', '==', customerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DocumentSource))
        .sort((a,b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    } catch (e) {
      console.error("Error getting customer docs", e);
      return [];
    }
  },

  addDocument: async (docData: DocumentSource): Promise<void> => {
    await setDoc(doc(db, 'documents', docData.id), cleanData(docData));
  },

  updateDocumentStats: async (docId: string, userId: string, action: 'view' | 'like' | 'archive'): Promise<void> => {
    const docRef = doc(db, 'documents', docId);
    
    if (action === 'view') {
      await updateDoc(docRef, { viewedBy: arrayUnion(userId) });
    } else if (action === 'like') {
      const d = await getDoc(docRef);
      if (d.exists()) {
        const data = d.data() as DocumentSource;
        const likes = data.likedBy || [];
        if (likes.includes(userId)) {
          await updateDoc(docRef, { likedBy: arrayRemove(userId) });
        } else {
          await updateDoc(docRef, { likedBy: arrayUnion(userId) });
        }
      }
    } else if (action === 'archive') {
       const d = await getDoc(docRef);
       if (d.exists()) {
         const current = d.data()?.isArchived || false;
         await updateDoc(docRef, { isArchived: !current });
       }
    }
  },

  createBackup: async (): Promise<string> => {
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const users = usersSnap.docs.map(d => d.data() as User);
      const docsSnap = await getDocs(collection(db, 'documents'));
      const documents = docsSnap.docs.map(d => d.data() as DocumentSource);
      const custSnap = await getDocs(collection(db, 'customers'));
      const customers = custSnap.docs.map(d => d.data() as Customer);
      const locSnap = await getDocs(collection(db, 'locations'));
      const locations = locSnap.docs.map(d => d.data() as Location);
      const contactSnap = await getDocs(collection(db, 'contacts'));
      const contacts = contactSnap.docs.map(d => d.data() as ContactPerson);

      const backup: BackupData & { locations: Location[], contacts: ContactPerson[] } = {
        timestamp: new Date().toISOString(),
        users,
        documents,
        customers,
        locations,
        contacts
      };
      return JSON.stringify(backup, null, 2);
    } catch (e) {
      console.error("Backup failed", e);
      return "";
    }
  },

  seed: async () => {
    try {
      const snapshot = await getDocs(collection(db, 'documents'));
      if (!snapshot.empty) return; 
      // ... seed logic omitted for brevity, keeping existing if needed
      console.log("Seed skipped or done");
    } catch (e) {
      console.error("Seeding failed", e);
    }
  }
};

export const customerService = {
  getCustomersForUser: async (userId: string, role: string): Promise<Customer[]> => {
    try {
      let q;
      if (role === UserRole.ADMIN) {
        q = query(collection(db, 'customers'));
      } else {
        q = query(collection(db, 'customers'), where('assignedUserIds', 'array-contains', userId));
      }
      
      const snapshot = await getDocs(q);
      const customers = snapshot.docs.map(doc => {
        const data = doc.data();
        return { 
          id: doc.id, 
          ...data,
          assignedUserIds: data.assignedUserIds || [] 
        } as Customer;
      });
      return customers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (e) {
      console.error("Error fetching customers:", e);
      return [];
    }
  },

  addCustomer: async (customer: Customer): Promise<void> => {
     await setDoc(doc(db, 'customers', customer.id), cleanData(customer));
  },

  updateCustomerStatus: async (id: string, status: string): Promise<void> => {
     await updateDoc(doc(db, 'customers', id), { status });
  },

  deleteCustomer: async (id: string): Promise<void> => {
     console.log("Deleting customer", id);
     await deleteDoc(doc(db, 'customers', id));
  },

  getLocations: async (customerId: string): Promise<Location[]> => {
    try {
      const q = query(collection(db, 'locations'), where('customerId', '==', customerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Location));
    } catch (e) {
      console.error("Error fetching locations:", e);
      return [];
    }
  },

  addLocation: async (location: Location): Promise<void> => {
    await setDoc(doc(db, 'locations', location.id), cleanData(location));
  },

  // NIEUW: Contactpersonen management
  getContactPersons: async (customerId: string): Promise<ContactPerson[]> => {
    try {
      const q = query(collection(db, 'contacts'), where('customerId', '==', customerId));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactPerson));
    } catch (e) {
      console.error("Error fetching contacts:", e);
      return [];
    }
  },

  addContactPerson: async (contact: ContactPerson): Promise<void> => {
    await setDoc(doc(db, 'contacts', contact.id), cleanData(contact));
  },

  deleteContactPerson: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'contacts', id));
  },

  // Organisatie Profiel
  getOrganisatieProfiel: async (customerId: string): Promise<OrganisatieProfiel | null> => {
    try {
      const q = query(collection(db, 'organisatieProfielen'), where('customerId', '==', customerId), orderBy('analyseDatum', 'desc'));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as OrganisatieProfiel;
    } catch (e) {
      console.error("Error fetching organisatie profiel:", e);
      return null;
    }
  }
};

// Prompt Service
export const promptService = {
  getActivePrompt: async (type: string) => {
    try {
      const promptsRef = collection(db, 'prompts');
      const q = query(
        promptsRef,
        where('type', '==', type),
        where('isActief', '==', true),
        orderBy('versie', 'desc')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() } as Prompt;
      }
      return null;
    } catch (error) {
      console.error('Error getting active prompt:', error);
      return null;
    }
  },
  
  getPrompts: async (): Promise<Prompt[]> => {
    try {
      const promptsRef = collection(db, 'prompts');
      let snapshot;
      
      // Try with orderBy first, fallback to simple query if index missing
      try {
        const q = query(promptsRef, orderBy('versie', 'desc'));
        snapshot = await getDocs(q);
        console.log(`✅ Loaded ${snapshot.size} prompts with orderBy`);
      } catch (orderByError: any) {
        // If orderBy fails (missing index), get all and sort in memory
        console.warn('⚠️ orderBy failed, fetching all prompts and sorting in memory:', orderByError.message);
        try {
          snapshot = await getDocs(promptsRef);
          console.log(`✅ Loaded ${snapshot.size} prompts without orderBy`);
        } catch (getDocsError: any) {
          console.error('❌ Error fetching prompts:', getDocsError);
          // Try one more time with a simple query
          try {
            snapshot = await getDocs(promptsRef);
            console.log(`✅ Loaded ${snapshot.size} prompts (retry)`);
          } catch (retryError: any) {
            console.error('❌ Failed to load prompts after retry:', retryError);
            return [];
          }
        }
      }
      
      if (!snapshot || snapshot.empty) {
        console.log('ℹ️ No prompts found in Firestore');
        return [];
      }
      
      const prompts = await Promise.all(snapshot.docs.map(async doc => {
        const data = doc.data();
        const normalizedType = data.type === 'branche_analyse' ? 'publiek_organisatie_profiel' : (data.type || 'other');

        // Automatisch migreren in Firestore als het nog de oude type naam gebruikt
        if (data.type === 'branche_analyse') {
          try {
            await updateDoc(doc.ref, { type: 'publiek_organisatie_profiel' });
            console.log(`🔄 Migrated prompt ${doc.id} type to publiek_organisatie_profiel`);
          } catch (migrateError) {
            console.error(`❌ Failed to migrate prompt ${doc.id}:`, migrateError);
          }
        }

        return {
          id: doc.id,
          name: data.name || data.naam || `Prompt ${doc.id.substring(0, 8)}`,
          type: normalizedType,
          promptTekst: data.promptTekst || data.prompt || '',
          versie: data.versie || data.version || 1,
          isActief: data.isActief !== undefined ? data.isActief : false,
          createdAt: data.createdAt || data.created || new Date().toISOString(),
          createdBy: data.createdBy || data.created_by || '',
          updatedAt: data.updatedAt || data.updated,
          updatedBy: data.updatedBy || data.updated_by,
          files: data.files || []
        } as Prompt;
      }));
      
      // Sort by versie descending if orderBy didn't work
      if (prompts.length > 0) {
        prompts.sort((a, b) => {
          // First sort by type, then by versie descending
          if (a.type !== b.type) {
            return a.type.localeCompare(b.type);
          }
          return (b.versie || 0) - (a.versie || 0);
        });
      }
      
      console.log(`✅ Returning ${prompts.length} prompts:`, prompts.map(p => `${p.name} (${p.type}, v${p.versie})`).join(', '));
      return prompts;
    } catch (error: any) {
      console.error('❌ Error getting prompts:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return [];
    }
  },
  
  getPrompt: async (promptId: string): Promise<Prompt | null> => {
    try {
      const promptRef = doc(db, 'prompts', promptId);
      const docSnap = await getDoc(promptRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Prompt;
      }
      return null;
    } catch (error) {
      console.error('Error getting prompt:', error);
      return null;
    }
  },
  
  savePrompt: async (promptData: Partial<Prompt>, userId: string) => {
    try {
      if (promptData.id) {
        // Update existing - preserve all existing fields
        const promptRef = doc(db, 'prompts', promptData.id);
        const existingDoc = await getDoc(promptRef);
        if (!existingDoc.exists()) {
          throw new Error('Prompt niet gevonden');
        }
        
        // Merge with existing data to preserve fields like name, files, etc.
        const existingData = existingDoc.data();
        await updateDoc(promptRef, {
          ...existingData,
          ...promptData,
          updatedAt: new Date().toISOString(),
          updatedBy: userId
        });
      } else {
        // Create new
        const promptsRef = collection(db, 'prompts');
        const newPrompt = {
          name: promptData.name || '',
          type: promptData.type || 'publiek_organisatie_profiel',
          promptTekst: promptData.promptTekst || '',
          versie: promptData.versie || 1,
          isActief: false,
          createdAt: new Date().toISOString(),
          createdBy: userId
        };
        await addDoc(promptsRef, newPrompt);
      }
    } catch (error) {
      console.error('Error saving prompt:', error);
      throw error;
    }
  },
  
  activatePrompt: async (promptId: string, type: string) => {
    try {
      const promptsRef = collection(db, 'prompts');
      const q = query(promptsRef, where('type', '==', type));
      const snapshot = await getDocs(q);
      
      // Deactivate all prompts of this type
      const updatePromises = snapshot.docs.map(docSnap => {
        const docRef = doc(db, 'prompts', docSnap.id);
        return updateDoc(docRef, { isActief: false });
      });
      await Promise.all(updatePromises);
      
      // Activate the selected prompt
      const promptRef = doc(db, 'prompts', promptId);
      await updateDoc(promptRef, { isActief: true });
    } catch (error) {
      console.error('Error activating prompt:', error);
      throw error;
    }
  },
  
  deletePrompt: async (promptId: string) => {
    try {
      const promptRef = doc(db, 'prompts', promptId);
      await deleteDoc(promptRef);
    } catch (error) {
      console.error('Error deleting prompt:', error);
      throw error;
    }
  },
  
  // Export prompts to JSON for backup
  exportPrompts: async (): Promise<string> => {
    try {
      const prompts = await promptService.getPrompts();
      const exportData = {
        timestamp: new Date().toISOString(),
        prompts: prompts.map(p => ({
          name: p.name,
          type: p.type,
          promptTekst: p.promptTekst,
          versie: p.versie,
          isActief: p.isActief,
          createdAt: p.createdAt,
          createdBy: p.createdBy
        }))
      };
      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting prompts:', error);
      throw error;
    }
  },
  
  // Import prompts from JSON backup
  importPrompts: async (jsonString: string, userId: string, overwrite: boolean = false) => {
    try {
      const importData = JSON.parse(jsonString);
      if (!importData.prompts || !Array.isArray(importData.prompts)) {
        throw new Error('Ongeldig backup bestand');
      }
      
      const promptsRef = collection(db, 'prompts');
      let imported = 0;
      let skipped = 0;
      
      for (const promptData of importData.prompts) {
        // Check if prompt already exists (by type and versie)
        const existingQuery = query(
          promptsRef,
          where('type', '==', promptData.type),
          where('versie', '==', promptData.versie)
        );
        const existingSnapshot = await getDocs(existingQuery);
        
        if (!existingSnapshot.empty && !overwrite) {
          skipped++;
          continue;
        }
        
        if (existingSnapshot.empty) {
          // Create new
          await addDoc(promptsRef, {
            ...promptData,
            createdAt: promptData.createdAt || new Date().toISOString(),
            createdBy: promptData.createdBy || userId
          });
          imported++;
        } else if (overwrite) {
          // Update existing
          const existingDoc = existingSnapshot.docs[0];
          await updateDoc(doc(db, 'prompts', existingDoc.id), {
            ...promptData,
            updatedAt: new Date().toISOString(),
            updatedBy: userId
          });
          imported++;
        }
      }
      
      return { imported, skipped, message: `${imported} prompt(s) geïmporteerd, ${skipped} overgeslagen` };
    } catch (error) {
      console.error('Error importing prompts:', error);
      throw error;
    }
  },
  
  getPromptTypes: async (): Promise<string[]> => {
    try {
      const typesRef = collection(db, 'promptTypes');
      const snapshot = await getDocs(typesRef);
      if (!snapshot.empty) {
        const types = await Promise.all(snapshot.docs.map(async docSnap => {
          const data = docSnap.data();
          if (data.type === 'branche_analyse') {
            try {
              await updateDoc(docSnap.ref, { type: 'publiek_organisatie_profiel', label: data.label || 'Publiek Organisatie Profiel' });
              console.log(`🔄 Migrated promptType ${docSnap.id} to publiek_organisatie_profiel`);
              return 'publiek_organisatie_profiel';
            } catch (migrateError) {
              console.error(`❌ Failed to migrate promptType ${docSnap.id}:`, migrateError);
              return 'publiek_organisatie_profiel'; // fallback in memory
            }
          }
          return data.type;
        }));
        return types.filter(Boolean);
      }
      // Return default types if none exist
      return ['publiek_organisatie_profiel', 'publiek_cultuur_profiel', 'other'];
    } catch (error) {
      console.error('Error getting prompt types:', error);
      return ['publiek_organisatie_profiel', 'publiek_cultuur_profiel', 'other'];
    }
  },
  
  getPromptTypesWithLabels: async (): Promise<{type: string, label: string}[]> => {
    try {
      const typesRef = collection(db, 'promptTypes');
      const snapshot = await getDocs(typesRef);
      
      // Default labels for standard types
      const defaultLabels: {[key: string]: string} = {
        'publiek_organisatie_profiel': 'Publiek Organisatie Profiel',
        'publiek_cultuur_profiel': 'Publiek Cultuur Profiel',
        'other': 'Andere Prompts'
      };
      
      const typesMap = new Map<string, string>();
      
      // Get types from Firestore
      if (!snapshot.empty) {
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          let type = data.type;
          
          // Migrate old type name
          if (type === 'branche_analyse') {
            try {
              await updateDoc(docSnap.ref, { 
                type: 'publiek_organisatie_profiel', 
                label: data.label || 'Publiek Organisatie Profiel' 
              });
              console.log(`🔄 Migrated promptType ${docSnap.id} to publiek_organisatie_profiel`);
              type = 'publiek_organisatie_profiel';
            } catch (migrateError) {
              console.error(`❌ Failed to migrate promptType ${docSnap.id}:`, migrateError);
              type = 'publiek_organisatie_profiel'; // fallback
            }
          }
          
          const label = data.label || defaultLabels[type] || type;
          typesMap.set(type, label);
        }
      }
      
      // Ensure default types are included even if not in Firestore
      for (const [type, label] of Object.entries(defaultLabels)) {
        if (!typesMap.has(type)) {
          typesMap.set(type, label);
        }
      }
      
      // Convert to array and sort
      const result = Array.from(typesMap.entries()).map(([type, label]) => ({ type, label }));
      result.sort((a, b) => {
        // Sort default types first, then alphabetically
        const aIsDefault = defaultLabels.hasOwnProperty(a.type);
        const bIsDefault = defaultLabels.hasOwnProperty(b.type);
        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;
        return a.label.localeCompare(b.label);
      });
      
      return result;
    } catch (error) {
      console.error('Error getting prompt types with labels:', error);
      // Return defaults on error
      return [
        { type: 'publiek_organisatie_profiel', label: 'Publiek Organisatie Profiel' },
        { type: 'publiek_cultuur_profiel', label: 'Publiek Cultuur Profiel' },
        { type: 'other', label: 'Andere Prompts' }
      ];
    }
  },
  
  addPromptType: async (type: string, label: string, userId: string) => {
    try {
      const typesRef = collection(db, 'promptTypes');
      // Check if type already exists
      const q = query(typesRef, where('type', '==', type));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error('Type bestaat al');
      }
      
      await addDoc(typesRef, {
        type,
        label,
        createdAt: new Date().toISOString(),
        createdBy: userId
      });
    } catch (error) {
      console.error('Error adding prompt type:', error);
      throw error;
    }
  },
  
  updatePromptType: async (type: string, newLabel: string, userId: string) => {
    try {
      const typesRef = collection(db, 'promptTypes');
      const q = query(typesRef, where('type', '==', type));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Type bestaat niet in collection, maak het aan (voor standaard types die nog niet in de collection staan)
        await addDoc(typesRef, {
          type,
          label: newLabel,
          createdAt: new Date().toISOString(),
          createdBy: userId
        });
      } else {
        // Type bestaat, update het
        const typeDoc = snapshot.docs[0];
        await updateDoc(doc(db, 'promptTypes', typeDoc.id), {
          label: newLabel,
          updatedAt: new Date().toISOString(),
          updatedBy: userId
        });
      }
    } catch (error) {
      console.error('Error updating prompt type:', error);
      throw error;
    }
  },
  
  deletePromptType: async (type: string) => {
    try {
      // Check if any prompts use this type
      const promptsRef = collection(db, 'prompts');
      const q = query(promptsRef, where('type', '==', type));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        throw new Error(`Kan type niet verwijderen: er zijn nog ${snapshot.size} prompt(s) met dit type`);
      }
      
      // Delete the type
      const typesRef = collection(db, 'promptTypes');
      const typeQuery = query(typesRef, where('type', '==', type));
      const typeSnapshot = await getDocs(typeQuery);
      if (!typeSnapshot.empty) {
        await deleteDoc(doc(db, 'promptTypes', typeSnapshot.docs[0].id));
      }
    } catch (error) {
      console.error('Error deleting prompt type:', error);
      throw error;
    }
  },
  
  addFileToPrompt: async (promptId: string, fileName: string, fileContent: string) => {
    try {
      const promptRef = doc(db, 'prompts', promptId);
      const promptDoc = await getDoc(promptRef);
      if (!promptDoc.exists()) {
        throw new Error('Prompt niet gevonden');
      }
      
      const existingData = promptDoc.data();
      const existingFiles = existingData.files || [];
      const newFile = {
        id: `file_${Date.now()}`,
        name: fileName,
        content: fileContent,
        addedAt: new Date().toISOString()
      };
      
      await updateDoc(promptRef, {
        files: [...existingFiles, newFile],
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding file to prompt:', error);
      throw error;
    }
  },
  
  deleteFileFromPrompt: async (promptId: string, fileId: string) => {
    try {
      const promptRef = doc(db, 'prompts', promptId);
      const promptDoc = await getDoc(promptRef);
      if (!promptDoc.exists()) {
        throw new Error('Prompt niet gevonden');
      }
      
      const existingData = promptDoc.data();
      const existingFiles = existingData.files || [];
      const updatedFiles = existingFiles.filter((f: any) => f.id !== fileId);
      
      await updateDoc(promptRef, {
        files: updatedFiles,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deleting file from prompt:', error);
      throw error;
    }
  },
  
  restoreDefaultPrompts: async (userId: string) => {
    try {
      const promptsRef = collection(db, 'prompts');
      
      // Check if these specific prompts already exist
      const existingSnapshot = await getDocs(promptsRef);
      const existingPrompts = existingSnapshot.docs.map(d => d.data());
      
      const hasPubliekOrganisatie = existingPrompts.some(p => p.type === 'publiek_organisatie_profiel' && p.isActief);
      const hasCultuur = existingPrompts.some(p => p.type === 'publiek_cultuur_profiel' && p.isActief);
      
      if (hasPubliekOrganisatie && hasCultuur) {
        return { 
          message: 'Default prompts bestaan al en zijn actief', 
          count: existingSnapshot.size 
        };
      }
      
      // Default Branche Analyse Prompt (from functions/lib/index.js)
      const branchePrompt = `Je bent Gemini, geconfigureerd als een deskundige adviseur en brancheanalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande organisatie- en brancheanalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

Je schrijft altijd vanuit de identiteit en expertise van Richting. De toon is persoonlijk, professioneel, proactief en adviserend, gericht aan de directie van de te analyseren organisatie. Het doel is niet alleen te informeren, maar vooral om concrete, op maat gemaakte adviezen en een stappenplan voor samenwerking aan te bieden.

OPDRACHT:

Zodra je de organisatienaam en website hebt, voer je een "deep search" uit en genereer je een volledig analyserapport.

Dit rapport moet strikt de structuur en kwaliteitsnormen volgen zoals vastgelegd in het "Handboek: Kwaliteitsstandaard voor Diepgaande Brancheanalyse". Werk alle onderstaande hoofdstukken volledig en gedetailleerd uit.

DE GOUDEN STANDAARD: RAPPORTSTRUCTUUR

Aanhef: "Geachte directie van [Naam Organisatie],"

Inleiding: Een korte, persoonlijke introductie vanuit Richting, waarin je het doel van dit rapport uitlegt: het bieden van inzicht in de branche-specifieke risico's en het voorstellen van een proactieve aanpak voor een gezonde en veilige werkomgeving. Vermeld bovenaan het rapport de berekende totaalscore en gemiddelde risicoscore van de branche.

Hoofdstuk 1: Introductie en Branche-identificatie
- Geef een algemene beschrijving van de sector en de belangrijkste activiteiten.
- Analyseer de actualiteiten in de branche op het gebied van mens en werk (arbeidsmarkt, trends, vacatures).
- Identificeer de belangrijkste CAO-thema's die relevant zijn voor verzuim en arbeidsomstandigheden. Benoem de betrokken werkgevers- en werknemersorganisaties.

Hoofdstuk 2: SBI-codes en Bedrijfsinformatie
- Toon in een tabel de relevante SBI-codes met omschrijving.
- Analyseer de personele omvang en vestigingslocaties van de organisatie in Nederland.
- Identificeer alle vestigingslocaties met volledige adresgegevens (straat, huisnummer, postcode, stad).
- Voor elke locatie: geef de naam (bijv. "Hoofdkantoor", "Vestiging Amsterdam"), volledig adres, stad, en indien beschikbaar het aantal medewerkers op die locatie.
- Presenteer in een tabel de personele aantallen per regio (Noord, Midden Oost, Midden Zuid, Zuid Nederland). Geef aan als data onbekend is.
- Vermeld in de tabel de dichtstbijzijnde Richting-locatie.

Hoofdstuk 3: Arbocatalogus en Branche-RI&E
- Geef een overzicht van de door de branche erkende arbo-instrumenten (Arbocatalogus, Branche-RI&E), inclusief hun status en directe hyperlinks.

Hoofdstuk 4: Risicocategorieën en Kwantificering
- Presenteer een tabel met de belangrijkste risico's, onderverdeeld in 'Psychische risico's', 'Fysieke risico's', en 'Overige'.
- Gebruik de Fine & Kinney methodiek: Risicogetal (R) = Blootstelling (B) × Kans (W) × Effect (E)
- Blootstelling (B): 1-10 (aantal personen blootgesteld)
- Kans (W): 0.5, 1, 3, 6, of 10 (Fine & Kinney waarden)
- Effect (E): 1, 3, 7, 15, of 40 (Fine & Kinney waarden)
- Risicogetal (R) = B × W × E
- Prioriteit: R >= 400 = 1 (Zeer hoog), R >= 200 = 2 (Hoog), R >= 100 = 3 (Middel), R >= 50 = 4 (Laag), R < 50 = 5 (Zeer laag)
- Toon onderaan de tabel de totaaltelling van alle risicogetallen.

Hoofdstuk 5: Primaire Processen in de Branche
- Beschrijf stapsgewijs de kernprocessen op de werkvloer die typerend zijn voor deze branche.

Hoofdstuk 6: Werkzaamheden en Functies
- Geef een overzicht van de meest voorkomende functies, inclusief een omschrijving en voorbeelden van taken.

Hoofdstuk 7: Verzuim in de Branche
- Analyseer het verzuim in de branche, benoem de belangrijkste oorzaken en vergelijk dit met het landelijk gemiddelde.
- Presenteer een matrix van verzuimrisico's per functie. Gebruik de functies in de rijen en de risico's in de kolommen.

Hoofdstuk 8: Beroepsziekten in de Branche
- Analyseer de meest voorkomende beroepsziekten en koppel deze direct aan de geïdentificeerde risico's uit hoofdstuk 4.

Hoofdstuk 9: Gevaarlijke Stoffen en Risico's
- Indien van toepassing, beschrijf de gevaarlijke stoffen die in de sector worden gebruikt.
- Presenteer een matrix die de risico's bij de hantering van deze stoffen weergeeft.

Hoofdstuk 10: Risicomatrices
- Matrix 1: Risico's per Primair Proces.
- Matrix 2: Risico's per Functie.

Hoofdstuk 11: Vooruitblik en Speerpunten
- Analyseer het verwachte effect van CAO-thema's op o.a. verzuim, verloop en aantrekkingskracht op de arbeidsmarkt.
- Formuleer concrete speerpunten voor de ondernemer om verzuim positief te beïnvloeden en te prioriteren.
- Benoem de gezamenlijke thema's die de ondernemer samen met Richting kan oppakken. Koppel elk speerpunt direct aan een specifieke dienst van Richting met een hyperlink.

Hoofdstuk 12: Stappenplan voor een Preventieve Samenwerking
- Integreer de visuele weergave van het "Stappenplan Samenwerken aan preventie".
- Presenteer een concreet en op maat gemaakt stappenplan voor de organisatie, gebaseerd op de analyse. Begin altijd met Implementatie en Verzuimbegeleiding.
- Doe voorstellen voor specifieke diensten van Richting (RI&E, PMO, Werkplekonderzoek, Het Richtinggevende Gesprek, etc.) met directe hyperlinks naar de relevante webpagina's.
- Indien er thema's zijn waarvoor geen standaarddienst bestaat, stel maatwerk voor en benadruk dat Richting alle expertise in huis heeft.

Hoofdstuk 13: Bronvermeldingen
- Geef een volledige lijst van geraadpleegde bronnen, opgemaakt in APA-stijl, met directe en werkende hyperlinks.

CRUCIALE KWALITEITS- EN FORMATVEREISTEN:
- Visuele Symbolen: Gebruik in alle matrices visuele symbolen (bijv. ● voor 'hoog', ◐ voor 'gemiddeld', ○ voor 'laag') in plaats van tekst om de data visueel en direct interpreteerbaar te maken.
- Geen Google Links: Verifieer dat absoluut geen enkele hyperlink in het rapport begint met https://www.google.com/search?q=. Alle links moeten directe URL's zijn.
- Stijl: Het gehele rapport is geschreven in de 'u'-vorm, persoonlijk gericht aan de directie. De stijl is die van een deskundige partner die meedenkt en concrete oplossingen biedt.
- Afsluiting: Sluit elk rapport af met de datum van generatie en een copyright-vermelding: © [Jaar] Richting. Alle rechten voorbehouden.

BELANGRIJK: Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst. Alleen de JSON object. Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\"). De JSON moet direct parseerbaar zijn zonder enige bewerking.`;

      // Default Cultuur Profiel Prompt (volledige versie uit functions/lib/index.js)
      const cultuurPrompt = `Je bent Gemini, geconfigureerd als een deskundige cultuuranalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande cultuuranalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

BELANGRIJK: Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst. Alleen de JSON object. Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\"). De JSON moet direct parseerbaar zijn zonder enige bewerking.

Analyseer de organisatiecultuur en genereer een volledig CultuurProfiel met de volgende JSON structuur:

{
  "volledigRapport": "Volledig markdown rapport met alle bevindingen...",
  "scores": {
    "cultuurvolwassenheid": 0-100,
    "groeidynamiekScore": 0-100,
    "cultuurfit": 0-100,
    "cultuursterkte": "laag|gemiddeld|hoog|zeer_hoog",
    "dynamiekType": "stagnerend|organisch_groeiend|disruptief_veranderend"
  },
  "gaps": [
    {
      "dimensie": "Naam van dimensie",
      "huidigeScore": 0-100,
      "gewensteScore": 0-100,
      "gap": number,
      "urgentie": "laag|gemiddeld|hoog|urgent"
    }
  ],
  "dna": {
    "dominantType": "adhocratie|clan|hiërarchie|markt|hybride",
    "typeScores": {
      "adhocratie": 0-100,
      "clan": 0-100,
      "hiërarchie": 0-100,
      "markt": 0-100
    },
    "kernwaarden": [
      {
        "waarde": "naam van kernwaarde",
        "score": 0-100,
        "status": "kracht|zwakte|neutraal|gap",
        "beschrijving": "korte beschrijving"
      }
    ],
    "dimensies": [
      {
        "naam": "naam van dimensie",
        "score": 0-100,
        "trend": "stijgend|stabiel|dalend",
        "impact": "hoog|gemiddeld|laag"
      }
    ]
  },
  "performanceData": [
    {
      "metriek": "naam van metriek",
      "waarde": number,
      "trend": "stijgend|stabiel|dalend"
    }
  ],
  "engagementData": [
    {
      "dimensie": "naam van dimensie",
      "score": 0-100,
      "trend": "stijgend|stabiel|dalend"
    }
  ],
  "barrières": [
    {
      "naam": "naam van barrière",
      "impact": "hoog|gemiddeld|laag",
      "urgentie": "urgent|hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ],
  "opportuniteiten": [
    {
      "naam": "naam van opportuniteit",
      "potentieel": "hoog|gemiddeld|laag",
      "prioriteit": "urgent|hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ],
  "themas": [
    {
      "naam": "naam van thema",
      "categorie": "cultuur|leiderschap|processen|technologie",
      "status": "kracht|zwakte|opportuniteit|risico",
      "acties": ["actie 1", "actie 2"]
    }
  ],
  "gedragingen": [
    {
      "naam": "naam van gedraging",
      "type": "positief|negatief|neutraal",
      "frequentie": "vaak|soms|zelden",
      "impact": "hoog|gemiddeld|laag"
    }
  ],
  "interventies": [
    {
      "naam": "naam van interventie",
      "type": "quick_win|strategisch|transformatie",
      "prioriteit": "urgent|hoog|gemiddeld|laag",
      "impact": "hoog|gemiddeld|laag",
      "beschrijving": "korte beschrijving"
    }
  ]
}

Zorg ervoor dat alle numerieke waarden (scores, percentages) daadwerkelijk worden ingevuld op basis van je analyse, niet op 0 blijven staan.`;

      const now = new Date().toISOString();
      let restored = 0;
      
      // Restore publiek_organisatie_profiel prompt if missing or not active
      if (!hasPubliekOrganisatie) {
        // Deactivate any existing publiek_organisatie_profiel prompts first
        const orgQuery = query(promptsRef, where('type', '==', 'publiek_organisatie_profiel'));
        const orgSnapshot = await getDocs(orgQuery);
        for (const docSnap of orgSnapshot.docs) {
          await updateDoc(doc(db, 'prompts', docSnap.id), { isActief: false });
        }
        
        await addDoc(promptsRef, {
          name: 'Publiek Organisatie Profiel',
          type: 'publiek_organisatie_profiel',
          promptTekst: branchePrompt,
          versie: 1,
          isActief: true,
          createdAt: now,
          createdBy: userId
        });
        restored++;
      }
      
      // Restore publiek_cultuur_profiel prompt if missing or not active
      if (!hasCultuur) {
        // Deactivate any existing publiek_cultuur_profiel prompts first
        const cultuurQuery = query(promptsRef, where('type', '==', 'publiek_cultuur_profiel'));
        const cultuurSnapshot = await getDocs(cultuurQuery);
        for (const docSnap of cultuurSnapshot.docs) {
          await updateDoc(doc(db, 'prompts', docSnap.id), { isActief: false });
        }
        
        await addDoc(promptsRef, {
          name: 'Publiek Cultuur Profiel',
          type: 'publiek_cultuur_profiel',
          promptTekst: cultuurPrompt,
          versie: 1,
          isActief: true,
          createdAt: now,
          createdBy: userId
        });
        restored++;
      }
      
      return { 
        message: restored > 0 ? `${restored} default prompt(s) hersteld` : 'Default prompts bestaan al en zijn actief',
        count: restored
      };
    } catch (error) {
      console.error('Error restoring default prompts:', error);
      throw error;
    }
  },
  
  seedDefaultPrompts: async (userId: string) => {
    try {
      const promptsRef = collection(db, 'prompts');
      
      // Check if prompts already exist - if ANY prompts exist, don't seed to preserve them
      const existingSnapshot = await getDocs(promptsRef);
      if (!existingSnapshot.empty) {
        return { 
          message: `Er bestaan al ${existingSnapshot.size} prompt(s). Seed overgeslagen om bestaande prompts te behouden. Gebruik "Herstel Default Prompts" om de standaard prompts te herstellen.`, 
          count: existingSnapshot.size 
        };
      }
      
      // Default Branche Analyse Prompt
      const branchePrompt = `Je bent Gemini, geconfigureerd als een deskundige adviseur en brancheanalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande organisatie- en brancheanalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

Je schrijft altijd vanuit de identiteit en expertise van Richting. De toon is persoonlijk, professioneel, proactief en adviserend, gericht aan de directie van de te analyseren organisatie. Het doel is niet alleen te informeren, maar vooral om concrete, op maat gemaakte adviezen en een stappenplan voor samenwerking aan te bieden.

OPDRACHT:

Zodra je de organisatienaam en website hebt, voer je een "deep search" uit en genereer je een volledig analyserapport.

Dit rapport moet strikt de structuur en kwaliteitsnormen volgen zoals vastgelegd in het "Handboek: Kwaliteitsstandaard voor Diepgaande Brancheanalyse". Werk alle onderstaande hoofdstukken volledig en gedetailleerd uit.

DE GOUDEN STANDAARD: RAPPORTSTRUCTUUR

Aanhef: "Geachte directie van [Naam Organisatie],"

Inleiding: Een korte, persoonlijke introductie vanuit Richting, waarin je het doel van dit rapport uitlegt: het bieden van inzicht in de branche-specifieke risico's en het voorstellen van een proactieve aanpak voor een gezonde en veilige werkomgeving. Vermeld bovenaan het rapport de berekende totaalscore en gemiddelde risicoscore van de branche.

Hoofdstuk 1: Introductie en Branche-identificatie
- Geef een algemene beschrijving van de sector en de belangrijkste activiteiten.
- Analyseer de actualiteiten in de branche op het gebied van mens en werk (arbeidsmarkt, trends, vacatures).
- Identificeer de belangrijkste CAO-thema's die relevant zijn voor verzuim en arbeidsomstandigheden. Benoem de betrokken werkgevers- en werknemersorganisaties.

Hoofdstuk 2: SBI-codes en Bedrijfsinformatie
- Toon in een tabel de relevante SBI-codes met omschrijving.
- Analyseer de personele omvang en vestigingslocaties van de organisatie in Nederland.
- Identificeer alle vestigingslocaties met volledige adresgegevens (straat, huisnummer, postcode, stad).
- Voor elke locatie: geef de naam (bijv. "Hoofdkantoor", "Vestiging Amsterdam"), volledig adres, stad, en indien beschikbaar het aantal medewerkers op die locatie.
- Presenteer in een tabel de personele aantallen per regio (Noord, Midden Oost, Midden Zuid, Zuid Nederland). Geef aan als data onbekend is.
- Vermeld in de tabel de dichtstbijzijnde Richting-locatie.

Hoofdstuk 3: Arbocatalogus en Branche-RI&E
- Geef een overzicht van de door de branche erkende arbo-instrumenten (Arbocatalogus, Branche-RI&E), inclusief hun status en directe hyperlinks.

Hoofdstuk 4: Risicocategorieën en Kwantificering
- Presenteer een tabel met de belangrijkste risico's, onderverdeeld in 'Psychische risico's', 'Fysieke risico's', en 'Overige'.
- Gebruik de Fine & Kinney methodiek: Risicogetal (R) = Blootstelling (B) × Kans (W) × Effect (E)
- Blootstelling (B): 1-10 (aantal personen blootgesteld)
- Kans (W): 0.5, 1, 3, 6, of 10 (Fine & Kinney waarden)
- Effect (E): 1, 3, 7, 15, of 40 (Fine & Kinney waarden)
- Risicogetal (R) = B × W × E
- Prioriteit: R >= 400 = 1 (Zeer hoog), R >= 200 = 2 (Hoog), R >= 100 = 3 (Middel), R >= 50 = 4 (Laag), R < 50 = 5 (Zeer laag)
- Toon onderaan de tabel de totaaltelling van alle risicogetallen.

Hoofdstuk 5: Primaire Processen in de Branche
- Beschrijf stapsgewijs de kernprocessen op de werkvloer die typerend zijn voor deze branche.

Hoofdstuk 6: Werkzaamheden en Functies
- Geef een overzicht van de meest voorkomende functies, inclusief een omschrijving en voorbeelden van taken.

Hoofdstuk 7: Verzuim in de Branche
- Analyseer het verzuim in de branche, benoem de belangrijkste oorzaken en vergelijk dit met het landelijk gemiddelde.
- Presenteer een matrix van verzuimrisico's per functie. Gebruik de functies in de rijen en de risico's in de kolommen.

Hoofdstuk 8: Beroepsziekten in de Branche
- Analyseer de meest voorkomende beroepsziekten en koppel deze direct aan de geïdentificeerde risico's uit hoofdstuk 4.

Hoofdstuk 9: Gevaarlijke Stoffen en Risico's
- Indien van toepassing, beschrijf de gevaarlijke stoffen die in de sector worden gebruikt.
- Presenteer een matrix die de risico's bij de hantering van deze stoffen weergeeft.

Hoofdstuk 10: Risicomatrices
- Matrix 1: Risico's per Primair Proces.
- Matrix 2: Risico's per Functie.

Hoofdstuk 11: Vooruitblik en Speerpunten
- Analyseer het verwachte effect van CAO-thema's op o.a. verzuim, verloop en aantrekkingskracht op de arbeidsmarkt.
- Formuleer concrete speerpunten voor de ondernemer om verzuim positief te beïnvloeden en te prioriteren.
- Benoem de gezamenlijke thema's die de ondernemer samen met Richting kan oppakken. Koppel elk speerpunt direct aan een specifieke dienst van Richting met een hyperlink.

Hoofdstuk 12: Stappenplan voor een Preventieve Samenwerking
- Integreer de visuele weergave van het "Stappenplan Samenwerken aan preventie".
- Presenteer een concreet en op maat gemaakt stappenplan voor de organisatie, gebaseerd op de analyse. Begin altijd met Implementatie en Verzuimbegeleiding.
- Doe voorstellen voor specifieke diensten van Richting (RI&E, PMO, Werkplekonderzoek, Het Richtinggevende Gesprek, etc.) met directe hyperlinks naar de relevante webpagina's.
- Indien er thema's zijn waarvoor geen standaarddienst bestaat, stel maatwerk voor en benadruk dat Richting alle expertise in huis heeft.

Hoofdstuk 13: Bronvermeldingen
- Geef een volledige lijst van geraadpleegde bronnen, opgemaakt in APA-stijl, met directe en werkende hyperlinks.

CRUCIALE KWALITEITS- EN FORMATVEREISTEN:
- Visuele Symbolen: Gebruik in alle matrices visuele symbolen (bijv. ● voor 'hoog', ◐ voor 'gemiddeld', ○ voor 'laag') in plaats van tekst om de data visueel en direct interpreteerbaar te maken.
- Geen Google Links: Verifieer dat absoluut geen enkele hyperlink in het rapport begint met https://www.google.com/search?q=. Alle links moeten directe URL's zijn.
- Stijl: Het gehele rapport is geschreven in de 'u'-vorm, persoonlijk gericht aan de directie. De stijl is die van een deskundige partner die meedenkt en concrete oplossingen biedt.
- Afsluiting: Sluit elk rapport af met de datum van generatie en een copyright-vermelding: © [Jaar] Richting. Alle rechten voorbehouden.

BELANGRIJK: Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst. Alleen de JSON object. Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\"). De JSON moet direct parseerbaar zijn zonder enige bewerking.`;

      // Default Cultuur Profiel Prompt
      const cultuurPrompt = `Je bent Gemini, geconfigureerd als een deskundige cultuuranalist voor Richting, een toonaangevende, gecertificeerde arbodienst in Nederland. Je primaire taak is het uitvoeren van een diepgaande cultuuranalyse op basis van een door de gebruiker opgegeven organisatienaam en website.

BELANGRIJK: Geef het antwoord ALLEEN in puur, geldig JSON formaat. Geen markdown, geen code blocks, geen extra tekst. Alleen de JSON object. Zorg dat alle string waarden correct ge-escaped zijn (newlines als \\n, quotes als \\"). De JSON moet direct parseerbaar zijn zonder enige bewerking.

Analyseer de organisatiecultuur en genereer een volledig CultuurProfiel met de volgende JSON structuur. Zorg ervoor dat alle numerieke waarden (scores, percentages) daadwerkelijk worden ingevuld op basis van je analyse, niet op 0 blijven staan.`;

      const now = new Date().toISOString();
      
      // Add default prompts
      const newPrompts = [];
      
      if (!existingSnapshot.empty) {
        const existingPrompts = existingSnapshot.docs.map(d => d.data());
        const hasPubliekOrganisatie = existingPrompts.some(p => p.type === 'publiek_organisatie_profiel' && p.versie === 1);
        const hasCultuur = existingPrompts.some(p => p.type === 'publiek_cultuur_profiel' && p.versie === 1);
        
        if (!hasPubliekOrganisatie) {
          await addDoc(promptsRef, {
            type: 'publiek_organisatie_profiel',
            promptTekst: branchePrompt,
            versie: 1,
            isActief: true,
            createdAt: now,
            createdBy: userId
          });
          newPrompts.push('publiek_organisatie_profiel');
        }
        
        if (!hasCultuur) {
          await addDoc(promptsRef, {
            type: 'publiek_cultuur_profiel',
            promptTekst: cultuurPrompt,
            versie: 1,
            isActief: true,
            createdAt: now,
            createdBy: userId
          });
          newPrompts.push('publiek_cultuur_profiel');
        }
      } else {
        // No prompts exist, create both
        await addDoc(promptsRef, {
          type: 'publiek_organisatie_profiel',
          promptTekst: branchePrompt,
          versie: 1,
          isActief: true,
          createdAt: now,
          createdBy: userId
        });
        newPrompts.push('publiek_organisatie_profiel');
        
        await addDoc(promptsRef, {
          type: 'publiek_cultuur_profiel',
          promptTekst: cultuurPrompt,
          versie: 1,
          isActief: true,
          createdAt: now,
          createdBy: userId
        });
        newPrompts.push('publiek_cultuur_profiel');
      }
      
      return { 
        message: newPrompts.length > 0 ? `${newPrompts.length} default prompt(s) toegevoegd` : 'Geen nieuwe prompts toegevoegd',
        count: newPrompts.length,
        prompts: newPrompts
      };
    } catch (error) {
      console.error('Error seeding default prompts:', error);
      throw error;
    }
  }
};

// Richting Locaties Service
export const richtingLocatiesService = {
  getAllLocaties: async (): Promise<RichtingLocatie[]> => {
    try {
      const locatiesRef = collection(db, 'richtingLocaties');
      const snapshot = await getDocs(locatiesRef);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as RichtingLocatie));
    } catch (error) {
      console.error('Error getting richting locaties:', error);
      return [];
    }
  },
  
  seedLocaties: async () => {
    // This would seed the 23 Richting locations
    // For now, return a placeholder
    console.log('Seed locaties - implementatie nodig');
    throw new Error('Seed locaties functie moet nog geïmplementeerd worden');
  },

  addLocatie: async (locatie: Omit<RichtingLocatie, 'id'>): Promise<RichtingLocatie> => {
    try {
      const locatiesRef = collection(db, 'richtingLocaties');
      const docRef = await addDoc(locatiesRef, cleanData(locatie));
      return { id: docRef.id, ...locatie };
    } catch (error) {
      console.error('Error adding richting locatie:', error);
      throw error;
    }
  },

  updateLocatie: async (locatieId: string, updates: Partial<RichtingLocatie>): Promise<void> => {
    try {
      const locatieRef = doc(db, 'richtingLocaties', locatieId);
      await updateDoc(locatieRef, cleanData(updates));
    } catch (error) {
      console.error('Error updating richting locatie:', error);
      throw error;
    }
  },

  deleteLocatie: async (locatieId: string): Promise<void> => {
    try {
      const locatieRef = doc(db, 'richtingLocaties', locatieId);
      await deleteDoc(locatieRef);
    } catch (error) {
      console.error('Error deleting richting locatie:', error);
      throw error;
    }
  }
};

// Stub types
export interface Prompt {
  id: string;
  type: string;
  promptTekst: string;
  versie: number;
}

export interface RichtingLocatie {
  id: string;
  vestiging: string;
  stad: string;
  regio?: string;
  adres?: string;
  volledigAdres?: string;
  latitude?: number;
  longitude?: number;
}