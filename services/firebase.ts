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
  apiKey: "AIzaSyBy8CcUGLleucoYt73VtupuIHZllXnv1WA",
  authDomain: "richting-sales.firebaseapp.com",
  projectId: "richting-sales",
  storageBucket: "richting-sales.firebasestorage.app",
  messagingSenderId: "1048315100697",
  appId: "1:1048315100697:web:a053dc84c014107a827488",
  measurementId: "G-RYLL8X9JY0"
};

// --- STAP 2: INITIALISATIE ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, 'richting01'); // HARDE KOPPELING

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

  getAllUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      console.error("Error fetching users:", e);
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