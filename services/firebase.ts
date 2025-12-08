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
  initializeFirestore,
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
import { DocumentSource, User, UserRole, DocType, Customer, BackupData, Location, ContactPerson, OrganisatieProfiel, RichtingLocatie } from '../types';

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

// Firestore Database
// LET OP: In je code wordt specifiek verbinding gemaakt met database id "richting01"
// Dit is NIET de default database, dus we moeten hem specifiek zo initialiseren.
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
}, "richting01"); // Gebruik initializeFirestore voor named database

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

  getAllUsers: async (): Promise<User[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'users'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    } catch (e) {
      console.error("Error getting all users:", e);
      return [];
    }
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

  deleteLocation: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'locations', id));
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
      // Probeer eerst met orderBy (als index bestaat)
      try {
        const q = query(collection(db, 'organisatieProfielen'), where('customerId', '==', customerId), orderBy('analyseDatum', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as OrganisatieProfiel;
      } catch (orderByError: any) {
        // Als orderBy faalt (index ontbreekt), probeer zonder orderBy
        if (orderByError.code === 'failed-precondition') {
          console.warn("Index missing for organisatieProfielen query, fetching without orderBy");
          const q = query(collection(db, 'organisatieProfielen'), where('customerId', '==', customerId));
          const snapshot = await getDocs(q);
          if (snapshot.empty) return null;
          // Sorteer handmatig op analyseDatum
          const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganisatieProfiel & { analyseDatum?: any }));
          docs.sort((a, b) => {
            const dateA = a.analyseDatum?.toDate?.() || new Date(0);
            const dateB = b.analyseDatum?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
          });
          return docs[0] as OrganisatieProfiel;
        }
        throw orderByError;
      }
    } catch (e) {
      console.error("Error fetching organisatie profiel:", e);
      return null;
    }
  },

  saveOrganisatieProfiel: async (customerId: string, profielData: any): Promise<void> => {
    try {
      const profielId = `profiel_${Date.now()}`;
      const profiel: OrganisatieProfiel = {
        id: profielId,
        customerId,
        analyseDatum: new Date().toISOString(),
        ...profielData
      };
      await setDoc(doc(db, 'organisatieProfielen', profielId), cleanData(profiel));
    } catch (e) {
      console.error("Error saving organisatie profiel:", e);
      throw e;
    }
  }
};

// --- RICHTING LOCATIES SERVICE ---
export const richtingLocatiesService = {
  // Haal alle Richting locaties op
  getAllLocaties: async (): Promise<RichtingLocatie[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'richtingLocaties'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RichtingLocatie));
    } catch (e) {
      console.error("Error fetching richting locaties:", e);
      return [];
    }
  },

  // Seed de Richting locaties data (eenmalig uitvoeren)
  seedLocaties: async (): Promise<void> => {
    const locaties: Omit<RichtingLocatie, 'id'>[] = [
      { vestiging: 'Groningen', regio: 'Noord', volledigAdres: 'Van Ketwich Verschuurlaan 98, 9721 SW Groningen, Nederland', latitude: 53.1926921, longitude: 6.5689307 },
      { vestiging: 'Amersfoort', regio: 'West', volledigAdres: 'Ruimtevaart 24, 3824 MX Amersfoort, Nederland', latitude: 52.1957367, longitude: 5.3982116 },
      { vestiging: 'Zwolle', regio: 'Oost', volledigAdres: 'Hanzelaan 198, 8017 JG Zwolle', latitude: 52.5037589, longitude: 6.0871051 },
      { vestiging: 'Breda', regio: 'Zuid West', volledigAdres: 'Bijster 11, 4817 HZ Breda, Nederland', latitude: 51.58312129999999, longitude: 4.8044974 },
      { vestiging: 'Waalre', regio: 'Zuid Oost', volledigAdres: 'Burgemeester Mollaan 90, 5582 CK Waalre', latitude: 51.40121449999999, longitude: 5.4777508 },
      { vestiging: 'Venlo', regio: 'Zuid Oost', volledigAdres: 'Noorderpoort 9, 5916 PJ Venlo', latitude: 51.3927543, longitude: 6.1747741 },
      { vestiging: 'Zoetermeer', regio: 'Zuid West', volledigAdres: 'Boerhaavelaan 40, 2713 H Zoetermeer', latitude: 52.0487212, longitude: 4.4770099 },
      { vestiging: 'Urmond', regio: 'Zuid Oost', volledigAdres: 'Mauritslaan 49, 6129 EL Urmond', latitude: 50.98915539999999, longitude: 5.778275499999999 },
      { vestiging: 'Nijmegen', regio: 'Zuid Oost', volledigAdres: 'Kerkenbos 1077b, 6546 BB Nijmegen', latitude: 51.8254254, longitude: 5.7774944 },
      { vestiging: 'Nieuwegein', regio: 'West', volledigAdres: 'Nevelgaarde 20, 3436 ZZ Nieuwegein', latitude: 52.02700489999999, longitude: 5.0654463 },
      { vestiging: 'Lelystad', regio: 'Oost', volledigAdres: 'Plaats 9, 8224 AB Lelystad', latitude: 52.5190434, longitude: 5.4853216 },
      { vestiging: 'Leeuwarden', regio: 'Noord', volledigAdres: 'James Wattstraat 4, 8912 AR Leeuwarden', latitude: 53.192288, longitude: 5.7708977 },
      { vestiging: 'Heerhugowaard', regio: 'West', volledigAdres: 'Stationsplein 57, 1703 WE Heerhugowaard', latitude: 52.6690345, longitude: 4.822707900000001 },
      { vestiging: 'Goes', regio: 'Zuid West', volledigAdres: 'Stationspark 45, 4462 DZ Goes', latitude: 51.4965371, longitude: 3.8928287 },
      { vestiging: 'Enschede', regio: 'Oost', volledigAdres: 'Wethouder Beversstraat 185, 7543 BK Enschede', latitude: 52.20672010000001, longitude: 6.891583 },
      { vestiging: 'Emmen', regio: 'Noord', volledigAdres: 'Hoenderkamp 20, 7812 VZ Emmen', latitude: 52.7720902, longitude: 6.8983212 },
      { vestiging: 'Den Bosch', regio: 'Zuid Oost', volledigAdres: 'Werfpad 6, 5212 VJ Den Bosch', latitude: 51.6966, longitude: 5.3015019 },
      { vestiging: 'Capelle aan den Ijssel', regio: 'Zuid West', volledigAdres: 'Rivium Quadrant 241, 2909 LC Capelle aan den IJssel', latitude: 51.9143589, longitude: 4.5407378 },
      { vestiging: 'Badhoevedorp', regio: 'West', volledigAdres: 'Prins Mauritslaan 1, 1171 LP Badhoevedorp', latitude: 52.34155639999999, longitude: 4.7654893 },
      { vestiging: 'Assen', regio: 'Noord', volledigAdres: 'Balkendwarsweg 5, 9405 PT Assen', latitude: 52.9954845, longitude: 6.5206287 },
      { vestiging: 'Arnhem', regio: 'Oost', volledigAdres: 'Delta 1-F, 6825 ML Arnhem', latitude: 51.9786827, longitude: 5.9747155 },
      { vestiging: 'Apeldoorn', regio: 'Oost', volledigAdres: 'Beatrijsgaarde 1, 7329 BK Apeldoorn, Nederland', latitude: 52.1925101, longitude: 6.001603500000001 },
      { vestiging: 'Almere', regio: 'Midden', volledigAdres: 'Koninginneweg 1, 1312 AW Almere, Nederland', latitude: 52.374984, longitude: 5.2078947 }
    ];

    const ids = [
      '36d500ec', 'a54776c5', '586b4230', 'f83336ac', 'c4ce4a2c', 'e16692e4', '6e95b809', '00389e7c',
      'b2768a20', 'eda76f60', '9ec6aaff', '3a207f68', 'ba33d36b', 'cc13044f', '270118f5', '42b42612',
      '298ebb42', '1c5c23ae', '7cf9f89f', 'b744ef62', '81fd7dd6', '6f1e4b76', '215b3f92'
    ];

    try {
      for (let i = 0; i < locaties.length; i++) {
        await setDoc(doc(db, 'richtingLocaties', ids[i]), {
          id: ids[i],
          ...locaties[i]
        });
      }
      console.log(`✅ Seeded ${locaties.length} Richting locaties`);
    } catch (e) {
      console.error("Error seeding richting locaties:", e);
      throw e;
    }
  },

  // Vind de dichtstbijzijnde Richting locatie op basis van coördinaten (Haversine formule)
  findNearestLocatie: async (latitude: number, longitude: number): Promise<RichtingLocatie | null> => {
    try {
      const allLocaties = await richtingLocatiesService.getAllLocaties();
      if (allLocaties.length === 0) return null;

      // Haversine formule om afstand te berekenen
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
      };

      let nearest: RichtingLocatie | null = null;
      let minDistance = Infinity;

      for (const locatie of allLocaties) {
        const distance = calculateDistance(latitude, longitude, locatie.latitude, locatie.longitude);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = locatie;
        }
      }

      return nearest;
    } catch (e) {
      console.error("Error finding nearest richting locatie:", e);
      return null;
    }
  }
};

// --- PROMPT SERVICE ---
export interface Prompt {
  id: string;
  name: string;
  type: 'branche_analyse' | 'publiek_cultuur_profiel' | 'other';
  promptTekst: string; // Inhoud van de prompt
  versie: number; // Versie nummer
  isActief: boolean; // Actief status (Nederlandse naam zoals in functions)
  files?: Array<{
    id: string;
    name: string;
    content: string;
    uploadedAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string; // User ID die de prompt heeft aangemaakt
}

export const promptService = {
  getPrompts: async (): Promise<Prompt[]> => {
    try {
      const snapshot = await getDocs(collection(db, 'prompts'));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Prompt));
    } catch (e) {
      console.error("Error getting prompts:", e);
      return [];
    }
  },

  getPrompt: async (promptId: string): Promise<Prompt | null> => {
    try {
      const docRef = doc(db, 'prompts', promptId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      return { id: docSnap.id, ...docSnap.data() } as Prompt;
    } catch (e) {
      console.error("Error getting prompt:", e);
      return null;
    }
  },

  getActivePrompt: async (type: 'branche_analyse' | 'publiek_cultuur_profiel'): Promise<Prompt | null> => {
    try {
      const q = query(
        collection(db, 'prompts'), 
        where('type', '==', type), 
        where('isActief', '==', true),
        orderBy('versie', 'desc')
      );
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Prompt;
    } catch (e) {
      // Fallback: get all active and sort in memory
      try {
        const q = query(
          collection(db, 'prompts'), 
          where('type', '==', type), 
          where('isActief', '==', true)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty) return null;
        const sorted = snapshot.docs.sort((a, b) => {
          const versieA = a.data().versie || 0;
          const versieB = b.data().versie || 0;
          return versieB - versieA;
        });
        return { id: sorted[0].id, ...sorted[0].data() } as Prompt;
      } catch (e2) {
        console.error("Error getting active prompt:", e2);
        return null;
      }
    }
  },

  savePrompt: async (prompt: Omit<Prompt, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }, userId?: string): Promise<string> => {
    try {
      const now = new Date().toISOString();
      
      if (prompt.id) {
        // Update existing prompt
        const docRef = doc(db, 'prompts', prompt.id);
        await updateDoc(docRef, {
          name: prompt.name,
          type: prompt.type,
          promptTekst: prompt.promptTekst,
          versie: prompt.versie,
          isActief: prompt.isActief,
          files: prompt.files || [],
          updatedAt: now
        });
        return prompt.id;
      } else {
        // Create new prompt - get next version number
        const existingPrompts = await getDocs(
          query(collection(db, 'prompts'), where('type', '==', prompt.type))
        );
        const maxVersie = existingPrompts.docs.reduce((max, d) => {
          const v = d.data().versie || 0;
          return v > max ? v : max;
        }, 0);
        
        const promptData = {
          name: prompt.name,
          type: prompt.type,
          promptTekst: prompt.promptTekst,
          versie: maxVersie + 1,
          isActief: prompt.isActief ?? false,
          files: prompt.files || [],
          createdAt: now,
          updatedAt: now,
          createdBy: userId
        };
        
        const docRef = await addDoc(collection(db, 'prompts'), promptData);
        return docRef.id;
      }
    } catch (e) {
      console.error("Error saving prompt:", e);
      throw e;
    }
  },

  deletePrompt: async (promptId: string): Promise<void> => {
    try {
      const docRef = doc(db, 'prompts', promptId);
      await deleteDoc(docRef);
    } catch (e) {
      console.error("Error deleting prompt:", e);
      throw e;
    }
  },

  activatePrompt: async (promptId: string, type: 'branche_analyse' | 'publiek_cultuur_profiel'): Promise<void> => {
    try {
      // Deactivate all prompts of THIS SPECIFIC TYPE only
      // Different types can be active at the same time
      const allPromptsOfType = await getDocs(
        query(collection(db, 'prompts'), where('type', '==', type))
      );
      
      const deactivatePromises = allPromptsOfType.docs
        .filter(d => d.id !== promptId) // Don't deactivate the one we're activating
        .map(d => updateDoc(doc(db, 'prompts', d.id), { isActief: false }));
      
      await Promise.all(deactivatePromises);
      
      // Activate the selected prompt
      await updateDoc(doc(db, 'prompts', promptId), { 
        isActief: true,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error activating prompt:", e);
      throw e;
    }
  },

  addFileToPrompt: async (promptId: string, fileName: string, fileContent: string): Promise<void> => {
    try {
      const prompt = await promptService.getPrompt(promptId);
      if (!prompt) throw new Error("Prompt not found");
      
      const files = prompt.files || [];
      const newFile = {
        id: `file_${Date.now()}`,
        name: fileName,
        content: fileContent,
        uploadedAt: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'prompts', promptId), {
        files: [...files, newFile],
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error adding file to prompt:", e);
      throw e;
    }
  },

  deleteFileFromPrompt: async (promptId: string, fileId: string): Promise<void> => {
    try {
      const prompt = await promptService.getPrompt(promptId);
      if (!prompt) throw new Error("Prompt not found");
      
      const files = (prompt.files || []).filter(f => f.id !== fileId);
      await updateDoc(doc(db, 'prompts', promptId), {
        files,
        updatedAt: new Date().toISOString()
      });
    } catch (e) {
      console.error("Error deleting file from prompt:", e);
      throw e;
    }
  }
};