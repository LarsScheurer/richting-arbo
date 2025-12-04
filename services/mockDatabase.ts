import { DocumentSource, User, UserRole, DocType, BackupData, Customer } from '../types';

// --- MOCK FIREBASE IMPLEMENTATION ---
const STORAGE_KEY_DOCS = 'richting_kb_docs_v3'; // Incremented version
const STORAGE_KEY_USER = 'richting_kb_user_v3';
const STORAGE_KEY_USERS_DB = 'richting_kb_users_db_v3';
const STORAGE_KEY_CUSTOMERS = 'richting_kb_customers_v3';

// Initial Mock Users if DB is empty
const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Sanne de Vries', email: 'sanne@richting.nl', role: UserRole.EDITOR, avatarUrl: 'https://ui-avatars.com/api/?name=Sanne+de+Vries&background=F05A28&color=fff', department: 'Management' },
  { id: 'u2', name: 'Mark Janssen', email: 'mark@richting.nl', role: UserRole.READER, avatarUrl: 'https://ui-avatars.com/api/?name=Mark+Janssen&background=1A202C&color=fff', department: 'Sales' },
];

const getStoredUsers = (): User[] => {
  const stored = localStorage.getItem(STORAGE_KEY_USERS_DB);
  return stored ? JSON.parse(stored) : INITIAL_USERS;
};

const saveStoredUsers = (users: User[]) => {
  localStorage.setItem(STORAGE_KEY_USERS_DB, JSON.stringify(users));
};

export const mockAuth = {
  login: async (email: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 600)); // Network delay
    const users = getStoredUsers();
    // Case insensitive match
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) throw new Error("Gebruiker niet gevonden. Heeft u zich al geregistreerd?");
    
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return user;
  },

  register: async (email: string, name: string): Promise<User> => {
    await new Promise(resolve => setTimeout(resolve, 800));
    const users = getStoredUsers();
    
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Dit e-mailadres is al in gebruik.");
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      email,
      name,
      role: UserRole.READER,
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      department: 'General'
    };

    users.push(newUser);
    saveStoredUsers(users);
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser));
    return newUser;
  },

  resetPassword: async (email: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const users = getStoredUsers();
    if (!users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("Geen account gevonden met dit e-mailadres.");
    }
    // In real Firebase: sendPasswordResetEmail(auth, email);
    console.log(`Password reset email sent to ${email}`);
  },

  getCurrentUser: (): User | null => {
    const stored = localStorage.getItem(STORAGE_KEY_USER);
    return stored ? JSON.parse(stored) : null;
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY_USER);
  }
};

export const mockDb = {
  getDocuments: async (): Promise<DocumentSource[]> => {
    const stored = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!stored) return [];
    return JSON.parse(stored);
  },

  addDocument: async (doc: DocumentSource): Promise<void> => {
    const docs = await mockDb.getDocuments();
    docs.unshift(doc);
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
  },

  // Handles Likes (toggle), Views (unique), Archive
  updateDocumentStats: async (docId: string, userId: string, action: 'view' | 'like' | 'archive'): Promise<DocumentSource | null> => {
    const docs = await mockDb.getDocuments();
    const docIndex = docs.findIndex(d => d.id === docId);
    if (docIndex === -1) return null;

    const doc = docs[docIndex];
    
    if (action === 'view') {
      if (!doc.viewedBy.includes(userId)) {
        doc.viewedBy.push(userId);
      }
    } else if (action === 'like') {
      if (doc.likedBy.includes(userId)) {
        doc.likedBy = doc.likedBy.filter(id => id !== userId); // Unlike
      } else {
        doc.likedBy.push(userId); // Like
      }
    } else if (action === 'archive') {
      doc.isArchived = !doc.isArchived; // Toggle archive
    }

    docs[docIndex] = doc;
    localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(docs));
    return doc;
  },

  // --- BACKUP & RESTORE ---
  createBackup: async (): Promise<string> => {
    const users = getStoredUsers();
    const docs = await mockDb.getDocuments();
    
    // Retrieve customers from storage or return empty list
    const storedCustomers = localStorage.getItem(STORAGE_KEY_CUSTOMERS);
    const customers: Customer[] = storedCustomers ? JSON.parse(storedCustomers) : [];

    const backup: BackupData = {
      timestamp: new Date().toISOString(),
      users,
      documents: docs,
      customers
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreBackup: async (jsonString: string): Promise<boolean> => {
    try {
      const backup: BackupData = JSON.parse(jsonString);
      if (!backup.users || !backup.documents) throw new Error("Ongeldig backup bestand");
      
      saveStoredUsers(backup.users);
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(backup.documents));
      
      if (backup.customers) {
        localStorage.setItem(STORAGE_KEY_CUSTOMERS, JSON.stringify(backup.customers));
      }

      return true;
    } catch (e) {
      console.error("Restore failed", e);
      return false;
    }
  },
  
  seed: () => {
    if (!localStorage.getItem(STORAGE_KEY_DOCS)) {
      const dummyDocs: DocumentSource[] = [
        {
          id: 'd1',
          title: 'Strategisch Jaarplan 2025: Digitale Versnelling',
          content: 'De focus voor 2025 ligt op de volledige integratie van AI in onze workflows. We verwachten een efficiëntieslag van 20% in Q3.',
          originalUrl: 'https://richting.nl/strategie-2025.pdf',
          type: DocType.PDF,
          uploadedBy: 'u1',
          uploadedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
          summary: 'Focus op AI integratie en 20% efficiëntie in 2025.',
          mainCategoryId: 'strategy',
          subCategoryId: 'yearplan',
          tags: ['AI', '2025', 'Innovatie'],
          viewedBy: ['u2', 'u3', 'u4', 'u5'],
          likedBy: ['u2', 'u3'],
          isArchived: false
        },
        {
          id: 'd2',
          title: 'Update Thuiswerkbeleid & Vergoedingen',
          content: 'Per 1 maart wijzigt de thuiswerkvergoeding naar €2,35 per dag. Minimaal 2 dagen op kantoor is de norm voor sociale cohesie.',
          originalUrl: 'https://richting.nl/hr/thuiswerk.html',
          type: DocType.TEXT,
          uploadedBy: 'u1',
          uploadedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
          summary: 'Nieuwe vergoeding €2,35 en 60/40 hybride norm.',
          mainCategoryId: 'hr',
          subCategoryId: 'wfh',
          tags: ['HR', 'Vergoeding', 'Hybride'],
          viewedBy: ['u1', 'u2'],
          likedBy: ['u2'],
          isArchived: false
        },
        {
          id: 'd3',
          title: 'Brandbook v3.0 - Huisstijl Richting',
          content: 'Gebruik altijd de officiële HEX codes. Oranje: #F05A28. Donker: #1A202C. Lettertype is Inter of Open Sans.',
          originalUrl: 'https://richting.nl/design/brandbook.pdf',
          type: DocType.PDF,
          uploadedBy: 'u2',
          uploadedAt: new Date(Date.now() - 86400000 * 10).toISOString(),
          summary: 'Officiële kleurcodes en lettertypes voor externe communicatie.',
          mainCategoryId: 'marketing',
          subCategoryId: 'branding',
          tags: ['Design', 'Huisstijl', 'Logo'],
          viewedBy: ['u1', 'u2', 'u3'],
          likedBy: ['u1', 'u2', 'u3'],
          isArchived: false
        }
      ];
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(dummyDocs));
    }
  }
};

mockDb.seed();