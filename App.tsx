import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, DocumentSource, KNOWLEDGE_STRUCTURE, DocType, GeminiAnalysisResult, ChatMessage, Customer, Location, UserRole, ContactPerson, OrganisatieProfiel, Risico, Proces, Functie } from './types';
import { authService, dbService, customerService } from './services/firebase';
import { Layout, RichtingLogo } from './components/Layout';
import { analyzeContent, askQuestion, analyzeOrganisatieBranche, analyzeCultuur } from './services/geminiService';

// --- ICONS ---
const EyeIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const HeartIcon = ({ filled }: { filled: boolean }) => <svg className={`w-4 h-4 ${filled ? 'fill-richting-orange text-richting-orange' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const ExternalLinkIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const ArchiveIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const SendIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const MapIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const UserIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

// New Document Type Icons
const EmailIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const GoogleDocIcon = () => <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>;
const PdfIcon = () => <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5v1.5H19v2h-1.5V7h2V8.5zm-5 0h1v3h-1v-3zM9 9.5h1v-1H9v1z" transform="translate(0, 1)"/></svg>;

// --- HELPER ---
const getCategoryLabel = (mainId: string, subId?: string) => {
  const main = KNOWLEDGE_STRUCTURE.find(c => c.id === mainId);
  if (!subId) return main?.label || mainId;
  const sub = main?.subCategories.find(s => s.id === subId);
  return sub?.label || subId;
};

// Fine & Kinney conversie functies
// Converteert oude waarden (1-5) naar Fine & Kinney waarden
const convertKansToFineKinney = (oldValue: number): number => {
  // Fine & Kinney Kans (W) waarden: 0.5, 1, 3, 6, 10
  const mapping: Record<number, number> = {
    1: 0.5,
    2: 1,
    3: 3,
    4: 6,
    5: 10
  };
  // Als waarde al > 5, dan is het al een Fine & Kinney waarde
  if (oldValue > 5) return oldValue;
  return mapping[oldValue] || oldValue;
};

const convertEffectToFineKinney = (oldValue: number): number => {
  // Fine & Kinney Effect (E) waarden: 1, 3, 7, 15, 40
  const mapping: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 40
  };
  // Als waarde al > 5, dan is het al een Fine & Kinney waarde
  if (oldValue > 5) return oldValue;
  return mapping[oldValue] || oldValue;
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'ACTIEF';
    case 'churned': return 'Gearchiveerd';
    case 'prospect': return 'PROSPECT';
    case 'rejected': return 'Afgewezen';
    default: return status;
  }
};

const ensureUrl = (url: string) => {
  if (!url) return '';
  url = url.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

const getCompanyLogoUrl = (websiteUrl: string | undefined) => {
  if (!websiteUrl) return null;
  const cleanUrl = ensureUrl(websiteUrl);
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=128`;
};

const getFriendlyErrorMessage = (code: string): string => {
  console.log("Error code:", code);
  if (code.includes('auth/invalid-email')) return "Ongeldig e-mailadres.";
  if (code.includes('auth/user-not-found')) return "Geen account gevonden met dit e-mailadres.";
  if (code.includes('auth/wrong-password')) return "Onjuist wachtwoord.";
  if (code.includes('auth/email-already-in-use')) return "Dit e-mailadres is al in gebruik.";
  if (code.includes('auth/weak-password')) return "Wachtwoord moet minimaal 6 tekens zijn.";
  if (code.includes('auth/operation-not-allowed')) return "Inlogmethode staat uit. Ga naar Firebase Console > Authentication > Sign-in method en zet Email/Password of Google aan.";
  if (code.includes('auth/popup-closed-by-user')) return "Inlogscherm is gesloten voordat het klaar was.";
  if (code.includes('auth/popup-blocked')) return "De inlog pop-up werd geblokkeerd door je browser. Sta pop-ups toe.";
  if (code.includes('auth/unauthorized-domain')) {
    const domain = window.location.hostname || window.location.host || 'unknown';
    return `Domein fout. Voeg '${domain}' toe aan Authorized Domains in Firebase.`;
  }
  if (code.includes('FIREBASE_DB_NOT_FOUND')) return "Database 'richting01' niet gevonden. Maak deze aan in Firestore (Test Mode).";
  return `Er is iets misgegaan (${code}). Probeer het opnieuw.`;
};

const handleBackup = async () => {
  const json = await dbService.createBackup();
  if (!json) { alert("Backup mislukt"); return; }
  
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `richting_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- SUB COMPONENTS ---

const DatabaseErrorView = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border-l-4 border-red-500">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Database 'richting01' Niet Gevonden</h2>
      <p className="text-gray-600 mb-6 leading-relaxed">
        De applicatie probeert te verbinden met Firestore database: <br/>
        <code className="bg-gray-100 px-2 py-1 rounded font-bold text-red-600">richting01</code>
      </p>
      <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-700 space-y-2 border border-gray-200">
        <p className="font-bold text-slate-900">Controleer in Firebase Console:</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Ga naar <strong>Firestore Database</strong>.</li>
          <li>Kijk linksboven naast het kopje "Database".</li>
          <li>Heet de database daar <code>richting01</code>?</li>
          <li>Zo nee, maak hem aan.</li>
          <li>Zorg dat hij in <strong>Test Mode</strong> staat.</li>
        </ol>
      </div>
      <button onClick={() => window.location.reload()} className="mt-8 bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors w-full">
        Ik heb dit gecheckt, herlaad pagina
      </button>
    </div>
  </div>
);

interface AuthViewProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onRegister: (email: string, name: string, pass: string) => Promise<void>;
  onForgot: (email: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: string;
  setAuthError: (msg: string) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGoogleLogin, onRegister, onForgot, loading, error, success, setAuthError }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') onLogin(email, password);
    else if (mode === 'register') onRegister(email, name, password);
    else if (mode === 'forgot') onForgot(email);
  };

  const handleCopyDomain = () => {
    const domain = window.location.hostname || window.location.host || 'localhost';
    navigator.clipboard.writeText(domain);
    alert(`Domein gekopieerd: ${domain}`);
  };

  const detectedDomain = window.location.hostname || window.location.host || 'localhost';

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-8 bg-white">
        <div className="flex flex-col items-center mb-10">
          <RichtingLogo className="h-14 mb-6 w-auto" />
          <p className="mt-2 text-gray-500 uppercase text-xs tracking-widest">Kennis & Inzicht (Firebase Editie)</p>
        </div>

        {mode !== 'forgot' && (
          <div className="flex border-b border-gray-200 mb-6">
            <button 
              onClick={() => { setMode('login'); setAuthError(''); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'login' ? 'text-richting-orange border-b-2 border-richting-orange' : 'text-gray-500'}`}
            >
              Inloggen
            </button>
            <button 
              onClick={() => { setMode('register'); setAuthError(''); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'register' ? 'text-richting-orange border-b-2 border-richting-orange' : 'text-gray-500'}`}
            >
              Registreren
            </button>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Volledige Naam</label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mailadres</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Wachtwoord</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-richting-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-richting-orange transition-colors"
          >
            {loading ? 'Laden...' : mode === 'login' ? 'Inloggen' : mode === 'register' ? 'Account Aanmaken' : 'Stuur Herstel Link'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Of ga verder met</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => onGoogleLogin()}
                type="button"
                className="w-full flex justify-center items-center gap-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-richting-orange transition-colors"
              >
                <div className="flex-shrink-0">
                   <GoogleIcon />
                </div>
                <span>Inloggen met Google</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} className="text-sm text-gray-500 hover:text-richting-orange">Wachtwoord vergeten?</button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-sm text-gray-500 hover:text-richting-orange">Terug naar inloggen</button>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-2">Login werkt niet? Klik hieronder om je domein te kopiëren voor Firebase:</p>
          <div 
            onClick={handleCopyDomain}
            className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1 rounded text-xs text-slate-600 cursor-pointer hover:bg-gray-100 border border-gray-200"
            title="Klik om te kopiëren"
          >
            <code>{detectedDomain}</code>
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerDetailView = ({ 
  customer, 
  user,
  onBack, 
  onUpdate, 
  onDelete,
  onOpenDoc
}: { 
  customer: Customer, 
  user: User,
  onBack: () => void,
  onUpdate: (updated: Customer) => void,
  onDelete: (id: string) => void,
  onOpenDoc: (doc: DocumentSource) => void
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [docs, setDocs] = useState<DocumentSource[]>([]);
  const [organisatieProfiel, setOrganisatieProfiel] = useState<OrganisatieProfiel | null>(null);
  const [selectedProces, setSelectedProces] = useState<Proces | null>(null);
  const [selectedFunctie, setSelectedFunctie] = useState<Functie | null>(null);
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAnalyzingOrganisatie, setIsAnalyzingOrganisatie] = useState(false);
  const [isAnalyzingCultuur, setIsAnalyzingCultuur] = useState(false);
  const [organisatieAnalyseResultaat, setOrganisatieAnalyseResultaat] = useState<string | null>(null);
  const [cultuurAnalyseResultaat, setCultuurAnalyseResultaat] = useState<string | null>(null);
  
  // New Location Form
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');

  // New Contact Form
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('');

  useEffect(() => {
    const loadData = async () => {
       const [locs, conts, documents, profiel] = await Promise.all([
          customerService.getLocations(customer.id),
          customerService.getContactPersons(customer.id),
          dbService.getDocumentsForCustomer(customer.id),
          customerService.getOrganisatieProfiel(customer.id)
       ]);
       setLocations(locs);
       setContacts(conts);
       setDocs(documents);
       setOrganisatieProfiel(profiel);
    };
    loadData();
  }, [customer]);

  const handleAddLocation = async () => {
    if (!locName || !locAddress) return;
    const newLoc: Location = {
      id: `loc_${Date.now()}`,
      customerId: customer.id,
      name: locName,
      address: locAddress,
      city: locCity
    };
    await customerService.addLocation(newLoc);
    setLocations(prev => [...prev, newLoc]);
    setIsAddingLoc(false);
    setLocName(''); setLocAddress(''); setLocCity('');
  };

  const handleAddContact = async () => {
    if (!contactFirst || !contactEmail) return;
    const newContact: ContactPerson = {
        id: `contact_${Date.now()}`,
        customerId: customer.id,
        firstName: contactFirst,
        lastName: contactLast,
        email: contactEmail,
        role: contactRole
    };
    await customerService.addContactPerson(newContact);
    setContacts(prev => [...prev, newContact]);
    setIsAddingContact(false);
    setContactFirst(''); setContactLast(''); setContactEmail(''); setContactRole('');
  };

  const handleChangeStatus = async (newStatus: 'active' | 'prospect' | 'churned' | 'rejected') => {
    await customerService.updateCustomerStatus(customer.id, newStatus);
    onUpdate({ ...customer, status: newStatus });
  };

  const handleDelete = async () => {
    // Harde check op string 'ADMIN' om zeker te zijn
    if (user.role !== 'ADMIN') {
        alert("Geen rechten. Alleen een administrator kan klanten verwijderen."); 
        return;
    }
    
    if (!window.confirm(`LET OP: Weet je zeker dat je '${customer.name}' definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
        return;
    }

    setIsDeleting(true);
    try {
        await customerService.deleteCustomer(customer.id);
        onDelete(customer.id);
    } catch (e: any) {
        console.error("Delete failed:", e);
        setIsDeleting(false);
        alert(`Kon klant niet verwijderen: ${e.message}`);
    }
  };

  const getGoogleMapsLink = (loc: Location) => {
    const query = encodeURIComponent(`${loc.address}, ${loc.city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const displayLogoUrl = customer.logoUrl || getCompanyLogoUrl(customer.website);

  const getDocIcon = (type: DocType) => {
      switch(type) {
          case DocType.EMAIL: return <EmailIcon />;
          case DocType.GOOGLE_DOC: return <GoogleDocIcon />;
          case DocType.PDF: return <PdfIcon />;
          case DocType.URL: return <span className="text-xl">🔗</span>;
          default: return <span className="text-xl">📝</span>;
      }
  };

  return (
    <div className="space-y-6">
       <button onClick={onBack} className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium mb-4">
         ← Terug naar overzicht
       </button>

       <div className="bg-white border-l-4 border-richting-orange rounded-r-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{customer.name}</h2>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {getStatusLabel(customer.status)}
                 </span>
                 <span className="text-gray-500">{customer.industry}</span>
                 {customer.website && (
                   <>
                     <span className="hidden md:inline text-gray-300">|</span>
                     <a href={ensureUrl(customer.website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-richting-orange hover:underline text-sm font-medium">
                        <img 
                          src={getCompanyLogoUrl(customer.website) || ''} 
                          alt="" 
                          className="w-4 h-4 object-contain rounded-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {customer.website.replace(/^https?:\/\//, '')}
                        <ExternalLinkIcon />
                     </a>
                   </>
                 )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2 items-end">
                    <select 
                        value={customer.status}
                        onChange={(e) => handleChangeStatus(e.target.value as any)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-600 focus:ring-richting-orange"
                    >
                        <option value="prospect">Prospect</option>
                        <option value="active">Actief</option>
                        <option value="churned">Archief</option>
                        <option value="rejected">Afgewezen</option>
                    </select>

                    {user.role === 'ADMIN' && (
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={`text-xs flex items-center gap-1 text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <TrashIcon />
                            {isDeleting ? 'Bezig...' : 'Verwijderen'}
                        </button>
                    )}
                </div>

                <div className="w-16 h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {displayLogoUrl ? (
                    <img src={displayLogoUrl} alt={customer.name} className="w-14 h-14 object-contain" />
                ) : (
                    <div className="w-full h-full bg-gray-50"></div>
                )}
                </div>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* LOCATIONS SECTION */}
         <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><MapIcon/> Locaties</h3>
               <button onClick={() => setIsAddingLoc(true)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-slate-700 font-medium">+ Toevoegen</button>
            </div>

            {isAddingLoc && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in">
                 <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Nieuwe Locatie</h4>
                 <div className="space-y-3">
                    <input type="text" placeholder="Naam (bijv. Hoofdkantoor)" className="w-full text-sm border p-2 rounded" value={locName} onChange={e => setLocName(e.target.value)} />
                    <input type="text" placeholder="Adres" className="w-full text-sm border p-2 rounded" value={locAddress} onChange={e => setLocAddress(e.target.value)} />
                    <input type="text" placeholder="Stad" className="w-full text-sm border p-2 rounded" value={locCity} onChange={e => setLocCity(e.target.value)} />
                    <div className="flex gap-2 pt-2">
                       <button onClick={handleAddLocation} className="bg-richting-orange text-white text-xs px-3 py-2 rounded font-bold">Opslaan</button>
                       <button onClick={() => setIsAddingLoc(false)} className="text-gray-500 text-xs px-3 py-2">Annuleren</button>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-3">
               {locations.length === 0 && !isAddingLoc && <p className="text-sm text-gray-400 italic">Nog geen locaties toegevoegd.</p>}
               {locations.map(loc => (
                 <div key={loc.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group">
                    <div>
                       <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                       <p className="text-xs text-gray-500">{loc.address}, {loc.city}</p>
                    </div>
                    <a 
                      href={getGoogleMapsLink(loc)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-gray-400 hover:text-richting-orange p-2"
                      title="Bekijk op kaart"
                    >
                      <MapIcon />
                    </a>
                 </div>
               ))}
            </div>
         </div>

         {/* CONTACTS SECTION */}
         <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon/> Contactpersonen</h3>
               <button onClick={() => setIsAddingContact(true)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-slate-700 font-medium">+ Toevoegen</button>
            </div>

            {isAddingContact && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Nieuw Contact</h4>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Voornaam" className="w-full text-sm border p-2 rounded" value={contactFirst} onChange={e => setContactFirst(e.target.value)} />
                            <input type="text" placeholder="Achternaam" className="w-full text-sm border p-2 rounded" value={contactLast} onChange={e => setContactLast(e.target.value)} />
                        </div>
                        <input type="email" placeholder="Email" className="w-full text-sm border p-2 rounded" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                        <input type="text" placeholder="Rol (bijv. HR Manager)" className="w-full text-sm border p-2 rounded" value={contactRole} onChange={e => setContactRole(e.target.value)} />
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleAddContact} className="bg-richting-orange text-white text-xs px-3 py-2 rounded font-bold">Opslaan</button>
                            <button onClick={() => setIsAddingContact(false)} className="text-gray-500 text-xs px-3 py-2">Annuleren</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
               {contacts.length === 0 && !isAddingContact && <p className="text-sm text-gray-400 italic">Nog geen contactpersonen.</p>}
               {contacts.map(contact => (
                   <div key={contact.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                       <p className="font-bold text-slate-800 text-sm">{contact.firstName} {contact.lastName}</p>
                       <p className="text-xs text-gray-500">{contact.role}</p>
                       <a 
                         href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}`} 
                         target="_blank" 
                         rel="noreferrer"
                         className="text-xs text-richting-orange hover:underline block mt-1 flex items-center gap-1"
                       >
                          {contact.email} <ExternalLinkIcon />
                       </a>
                   </div>
               ))}
            </div>
         </div>
       </div>

       {/* ORGANISATIE ANALYSE SECTION */}
       <div className="pt-8 border-t border-gray-200">
         <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold text-slate-900 text-lg">Organisatie Analyse</h3>
           <div className="flex gap-2">
             <button
               onClick={async () => {
                 setIsAnalyzingOrganisatie(true);
                 setOrganisatieAnalyseResultaat(null);
                 try {
                   const result = await analyzeOrganisatieBranche(
                     customer.name,
                     customer.industry,
                     customer.website,
                     customer.employeeCount
                   );
                   setOrganisatieAnalyseResultaat(result);
                 } catch (error) {
                   console.error("Organisatie analyse error:", error);
                   setOrganisatieAnalyseResultaat("Fout bij analyse. Probeer het opnieuw.");
                 } finally {
                   setIsAnalyzingOrganisatie(false);
                 }
               }}
               disabled={isAnalyzingOrganisatie}
               className="bg-richting-orange text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingOrganisatie ? "⏳ Analyseren..." : "📊 Branche Analyse"}
             </button>
             <button
               onClick={async () => {
                 setIsAnalyzingCultuur(true);
                 setCultuurAnalyseResultaat(null);
                 try {
                   const result = await analyzeCultuur(customer.name, customer.industry, docs);
                   setCultuurAnalyseResultaat(result);
                 } catch (error) {
                   console.error("Cultuur analyse error:", error);
                   setCultuurAnalyseResultaat("Fout bij analyse. Probeer het opnieuw.");
                 } finally {
                   setIsAnalyzingCultuur(false);
                 }
               }}
               disabled={isAnalyzingCultuur}
               className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingCultuur ? "⏳ Analyseren..." : "🎭 Cultuur Analyse"}
             </button>
           </div>
         </div>

         {/* Analyse Resultaten */}
         {organisatieAnalyseResultaat && (
           <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
             <h4 className="font-bold text-richting-orange mb-2 flex items-center gap-2">📊 Branche Analyse Resultaat</h4>
             <p className="text-sm text-gray-700 whitespace-pre-wrap">{organisatieAnalyseResultaat}</p>
           </div>
         )}

         {cultuurAnalyseResultaat && (
           <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
             <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">🎭 Cultuur Analyse Resultaat</h4>
             <p className="text-sm text-gray-700 whitespace-pre-wrap">{cultuurAnalyseResultaat}</p>
           </div>
         )}

         {organisatieProfiel && (
           <>
             <p className="text-sm text-gray-500 mb-4">Analyse datum: {new Date(organisatieProfiel.analyseDatum).toLocaleDateString('nl-NL')}</p>
           
           {/* Processen en Functies Overzicht */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* Processen */}
             <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 mb-3">Processen ({organisatieProfiel.processen?.length || 0})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {organisatieProfiel.processen
                  ?.map(proces => {
                    const risicos = proces.risicos || [];
                    // Bereken prioriteit voor dit proces
                    const risicosMetBerekening = risicos.map(item => {
                      const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                      if (!risico) return null;
                      const blootstelling = item.blootstelling || 3;
                      const kans = convertKansToFineKinney(risico.kans);
                      const effect = convertEffectToFineKinney(risico.effect);
                      const risicogetal = blootstelling * kans * effect;
                      return { risico, blootstelling, kans, effect, risicogetal };
                    }).filter(Boolean);
                    const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                      ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                      : 0;
                    const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                    return { proces, prioriteitNiveau, risicos };
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ proces, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={proces.id} 
                        onClick={() => setSelectedProces(proces)}
                        className="p-3 border border-gray-200 rounded cursor-pointer hover:border-richting-orange transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-bold text-sm text-slate-900">{proces.naam}</h5>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{proces.beschrijving}</p>
                            <p className="text-xs text-gray-400 mt-1">{risicos.length} risico's</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>

             {/* Functies */}
             <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-bold text-slate-900 mb-3">Functies ({organisatieProfiel.functies?.length || 0})</h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {organisatieProfiel.functies
                  ?.map(functie => {
                    const risicos = functie.risicos || [];
                    // Bereken prioriteit voor deze functie
                    const risicosMetBerekening = risicos.map(item => {
                      const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                      if (!risico) return null;
                      const blootstelling = item.blootstelling || 3;
                      const kans = convertKansToFineKinney(risico.kans);
                      const effect = convertEffectToFineKinney(risico.effect);
                      const risicogetal = blootstelling * kans * effect;
                      return { risico, blootstelling, kans, effect, risicogetal };
                    }).filter(Boolean);
                    const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                      ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                      : 0;
                    const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                    return { functie, prioriteitNiveau, risicos };
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ functie, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={functie.id} 
                        onClick={() => setSelectedFunctie(functie)}
                        className="p-3 border border-gray-200 rounded cursor-pointer hover:border-richting-orange transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-bold text-sm text-slate-900">{functie.naam}</h5>
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{functie.beschrijving}</p>
                            {functie.fysiek !== undefined && functie.psychisch !== undefined && (
                              <p className="text-xs text-gray-400 mt-1">
                                Fysiek: {functie.fysiek}/5, Psychisch: {functie.psychisch}/5
                              </p>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{risicos.length} risico's</p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
           </div>

           {/* Detail Modal voor Proces of Functie */}
           {(selectedProces || selectedFunctie) && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                 <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                   <h3 className="font-bold text-slate-800">
                     {selectedProces ? `Proces: ${selectedProces.naam}` : `Functie: ${selectedFunctie?.naam}`}
                   </h3>
                   <button 
                     onClick={() => { setSelectedProces(null); setSelectedFunctie(null); }}
                     className="text-gray-400 hover:text-gray-600"
                   >
                     ✕
                   </button>
                 </div>
                 <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                   {selectedProces && (
                     <>
                       <p className="text-sm text-gray-600 mb-4">{selectedProces.beschrijving}</p>
                       <h4 className="font-bold text-slate-900 mb-3">Risico's ({selectedProces.risicos?.length || 0})</h4>
                       <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50">
                             <tr>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risico</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blootstelling (B)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kans (W)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effect (E)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risicogetal (R)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioriteit</th>
                             </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                             {selectedProces.risicos
                               ?.map((item, idx) => {
                                 const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                 if (!risico) return null;
                                 const blootstelling = item.blootstelling || 3;
                                 const kans = convertKansToFineKinney(risico.kans);
                                 const effect = convertEffectToFineKinney(risico.effect);
                                 const risicogetal = blootstelling * kans * effect;
                                 const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                                 return { item, risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau, idx };
                               })
                               .filter(Boolean)
                               .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                               .map((data) => {
                                 if (!data) return null;
                                 const { risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau } = data;
                                 const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                                 const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                                 const categorieColors = {
                                   'fysiek': 'bg-blue-100 text-blue-700',
                                   'psychisch': 'bg-purple-100 text-purple-700',
                                   'overige': 'bg-gray-100 text-gray-700'
                                 };
                                 
                                 return (
                                   <tr key={data.idx}>
                                     <td className="px-4 py-3 text-sm text-gray-900">{risico.naam}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                                         {risico.categorie}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{blootstelling}</td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{kans}</td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{effect}</td>
                                     <td className="px-4 py-3 text-sm font-bold text-gray-900">{risicogetal}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-bold ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                         {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                       </span>
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                           <tfoot className="bg-gray-50">
                             <tr>
                               <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal:</td>
                               <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                 {selectedProces.risicos
                                   ?.map(item => {
                                     const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                     if (!risico) return 0;
                                     const blootstelling = item.blootstelling || 3;
                                     const kans = convertKansToFineKinney(risico.kans);
                                     const effect = convertEffectToFineKinney(risico.effect);
                                     return blootstelling * kans * effect;
                                   })
                                   .reduce((sum, val) => sum + val, 0) || 0}
                               </td>
                             </tr>
                           </tfoot>
                         </table>
                       </div>
                     </>
                   )}
                   {selectedFunctie && (
                     <>
                       <p className="text-sm text-gray-600 mb-4">{selectedFunctie.beschrijving}</p>
                       <h4 className="font-bold text-slate-900 mb-3">Functiebelasting</h4>
                       <div className="mb-4">
                         <div className="flex gap-4">
                           <div>
                             <span className="text-xs text-gray-500">Fysiek</span>
                             <p className="text-2xl font-bold text-blue-600">{selectedFunctie.fysiek || 0}/5</p>
                           </div>
                           <div>
                             <span className="text-xs text-gray-500">Psychisch</span>
                             <p className="text-2xl font-bold text-purple-600">{selectedFunctie.psychisch || 0}/5</p>
                           </div>
                         </div>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-3">Risico's ({selectedFunctie.risicos?.length || 0})</h4>
                       <div className="overflow-x-auto">
                         <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gray-50">
                             <tr>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risico</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categorie</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Blootstelling (B)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kans (W)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Effect (E)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Risicogetal (R)</th>
                               <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioriteit</th>
                             </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                             {selectedFunctie.risicos
                               ?.map((item, idx) => {
                                 const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                 if (!risico) return null;
                                 const blootstelling = item.blootstelling || 3;
                                 const kans = convertKansToFineKinney(risico.kans);
                                 const effect = convertEffectToFineKinney(risico.effect);
                                 const risicogetal = blootstelling * kans * effect;
                                 const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                                 return { item, risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau, idx };
                               })
                               .filter(Boolean)
                               .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                               .map((data) => {
                                 if (!data) return null;
                                 const { risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau } = data;
                                 const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                                 const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                                 const categorieColors = {
                                   'fysiek': 'bg-blue-100 text-blue-700',
                                   'psychisch': 'bg-purple-100 text-purple-700',
                                   'overige': 'bg-gray-100 text-gray-700'
                                 };
                                 
                                 return (
                                   <tr key={data.idx}>
                                     <td className="px-4 py-3 text-sm text-gray-900">{risico.naam}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                                         {risico.categorie}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{blootstelling}</td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{kans}</td>
                                     <td className="px-4 py-3 text-sm text-gray-900">{effect}</td>
                                     <td className="px-4 py-3 text-sm font-bold text-gray-900">{risicogetal}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-bold ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                         {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                       </span>
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                           <tfoot className="bg-gray-50">
                             <tr>
                               <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal:</td>
                               <td className="px-4 py-3 text-sm font-bold text-gray-900">
                                 {selectedFunctie.risicos
                                   ?.map(item => {
                                     const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                     if (!risico) return 0;
                                     const blootstelling = item.blootstelling || 3;
                                     const kans = convertKansToFineKinney(risico.kans);
                                     const effect = convertEffectToFineKinney(risico.effect);
                                     return blootstelling * kans * effect;
                                   })
                                   .reduce((sum, val) => sum + val, 0) || 0}
                               </td>
                             </tr>
                           </tfoot>
                         </table>
                       </div>
                     </>
                   )}
                 </div>
               </div>
             </div>
           )}
           </>
         )}
       </div>

       {/* DOCUMENTS SECTION */}
       <div className="pt-8 border-t border-gray-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Klant Dossier</h3>
          {docs.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Nog geen documenten gekoppeld aan dit dossier.</p>
          ) : (
              <div className="grid grid-cols-1 gap-3">
                  {docs.map(doc => (
                      <div key={doc.id} onClick={() => onOpenDoc(doc)} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-richting-orange cursor-pointer group">
                          <div className="flex items-center gap-3">
                              <div className="text-gray-600">
                                {getDocIcon(doc.type)}
                              </div>
                              <div>
                                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-richting-orange">{doc.title}</h4>
                                  <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()} - {getCategoryLabel(doc.mainCategoryId)}</p>
                              </div>
                          </div>
                          <button className="text-xs text-richting-orange font-bold uppercase">Openen</button>
                      </div>
                  ))}
              </div>
          )}
       </div>
    </div>
  );
};

// --- CUSTOMERS VIEW ---
const CustomersView = ({ user, onOpenDoc }: { user: User, onOpenDoc: (d: DocumentSource) => void }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState(''); // NEW STATE
  const [newEmployeeCount, setNewEmployeeCount] = useState<number | undefined>(undefined);
  const [newHasRIE, setNewHasRIE] = useState<boolean | undefined>(undefined);
  const [assignedIds, setAssignedIds] = useState<string[]>([user.id]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const custs = await customerService.getCustomersForUser(user.id, user.role);
      const users = await customerService.getAllUsers();
      setCustomers(custs);
      setAllUsers(users);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleAddCustomer = async () => {
    if (!newName) return;
    
    // AUTOMATICALLY ENSURE URLS HAVE HTTPS
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: newName,
      industry: newIndustry,
      website: ensureUrl(newWebsite), // FIX: Auto-prefix https://
      logoUrl: ensureUrl(newLogoUrl), // FIX: Auto-prefix https://
      status: 'active',
      assignedUserIds: assignedIds,
      createdAt: new Date().toISOString(),
      employeeCount: newEmployeeCount,
      hasRIE: newHasRIE
    };

    await customerService.addCustomer(newCustomer);
    setCustomers(prev => [...prev, newCustomer]);
    setShowAddModal(false);
    setNewName('');
    setNewIndustry('');
    setNewWebsite('');
    setNewLogoUrl('');
    setNewEmployeeCount(undefined);
    setNewHasRIE(undefined);
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleCustomerSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = async () => {
    for (const id of selectedCustomerIds) {
       await customerService.updateCustomerStatus(id, 'churned');
    }
    setCustomers(prev => prev.map(c => selectedCustomerIds.includes(c.id) ? { ...c, status: 'churned' } : c));
    setSelectedCustomerIds([]);
  };

  const handleBulkDelete = async () => {
    // Extra veiligheidscheck voor rol
    if (user.role !== 'ADMIN') {
        alert("Alleen beheerders mogen verwijderen.");
        return;
    }

    if (!window.confirm(`Weet je zeker dat je ${selectedCustomerIds.length} klanten definitief wilt verwijderen?`)) return;
    
    try {
        for (const id of selectedCustomerIds) {
           await customerService.deleteCustomer(id);
        }
        setCustomers(prev => prev.filter(c => !selectedCustomerIds.includes(c.id)));
        setSelectedCustomerIds([]);
        alert("Klanten verwijderd.");
    } catch (error) {
        console.error("Verwijderen mislukt:", error);
        alert("Er ging iets mis bij het verwijderen.");
    }
  };

  // Callback for when a customer is updated in the detail view
  const handleCustomerUpdate = (updated: Customer) => {
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
      setSelectedCustomer(updated); // Update the detail view as well
  };

  // Callback for when a customer is deleted
  const handleCustomerDelete = (id: string) => {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelectedCustomer(null); // Go back to list
  };

  if (selectedCustomer) {
    return <CustomerDetailView 
        customer={selectedCustomer} 
        user={user}
        onBack={() => setSelectedCustomer(null)} 
        onUpdate={handleCustomerUpdate}
        onDelete={handleCustomerDelete}
        onOpenDoc={onOpenDoc}
    />;
  }

  // CUSTOM SORT LOGIC: Prospect -> Actief -> Archief (churned) -> Afgewezen (rejected)
  const sortedCustomers = [...customers].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'prospect': 0, 'active': 1, 'churned': 2, 'rejected': 3 };
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;
    
    if (orderA !== orderB) return orderA - orderB;
    // Fallback: Nieuwste eerst
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Klanten & Dossiers</h2>
        
        <div className="flex gap-3">
            {selectedCustomerIds.length > 0 && (
                <>
                   <button 
                     onClick={handleBulkArchive}
                     className="bg-gray-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                   >
                     <ArchiveIcon /> Archiveren ({selectedCustomerIds.length})
                   </button>
                   {user.role === 'ADMIN' && (
                     <button 
                       onClick={handleBulkDelete}
                       className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                     >
                       <TrashIcon /> Verwijderen ({selectedCustomerIds.length})
                     </button>
                   )}
                </>
            )}
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">+</span> Nieuwe Klant
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Laden...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">Je bent nog niet gekoppeld aan klanten.</p>
          <button onClick={() => setShowAddModal(true)} className="text-richting-orange font-bold hover:underline">Maak je eerste klant aan</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCustomers.map(cust => {
             // LOGIC: Manual Logo > Auto Website Logo > Blank
             const logoSrc = cust.logoUrl || getCompanyLogoUrl(cust.website);
             const isSelected = selectedCustomerIds.includes(cust.id);
             // Ensure assignedUserIds is an array to prevent crashes
             const assignedUsers = cust.assignedUserIds || [];

             return (
              <div key={cust.id} onClick={() => setSelectedCustomer(cust)} className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer group relative p-6 hover:shadow-md ${isSelected ? 'border-richting-orange ring-1 ring-richting-orange' : 'border-gray-200'} ${cust.status === 'churned' || cust.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}>
                
                {/* SELECTION CHECKBOX - rechtsboven */}
                <div 
                  className="absolute top-4 right-4 z-10"
                  onClick={(e) => toggleCustomerSelection(cust.id, e)}
                >
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-richting-orange border-richting-orange' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                   </div>
                </div>

                {/* Logo linksboven en Status badge rechtsboven */}
                <div className="flex justify-between items-start mb-4">
                  {/* LOGO - linksboven */}
                  <div className="w-14 h-14 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {logoSrc ? (
                        <img src={logoSrc} alt={cust.name} className="w-full h-full object-contain p-1" />
                    ) : (
                        <div className="w-full h-full bg-gray-50"></div>
                    )}
                  </div>
                  
                  {/* STATUS BADGE - rechtsboven (onder checkbox) */}
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${cust.status === 'active' ? 'bg-green-100 text-green-700' : cust.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {getStatusLabel(cust.status)}
                    </span>
                  </div>
                </div>

                {/* Bedrijfsnaam */}
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-richting-orange">{cust.name}</h3>
                
                {/* Aantal medewerkers */}
                {cust.employeeCount && (
                  <p className="text-sm text-gray-600 mb-2">
                    {cust.employeeCount.toLocaleString('nl-NL')} medewerkers
                  </p>
                )}
                
                {/* Extra info zoals "Geen RIE" */}
                {cust.hasRIE === false && (
                  <p className="text-xs text-gray-500 mb-3">X Geen RIE</p>
                )}
                
              </div>
            );
          })}
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">Nieuwe Klant Aanmaken</h3>
               <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder="Bijv. Jansen Bouw B.V."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branche</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="Bijv. Bouw"
                    value={newIndustry}
                    onChange={e => setNewIndustry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="richting.nl (zonder https://)"
                    value={newWebsite}
                    onChange={e => setNewWebsite(e.target.value)}
                  />
                </div>
              </div>

              {/* MANUAL LOGO URL INPUT */}
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL (Optioneel)</label>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="Link naar afbeelding"
                    value={newLogoUrl}
                    onChange={e => setNewLogoUrl(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Vul hier een link in als het automatische logo niet werkt.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aantal Medewerkers (Optioneel)</label>
                  <input 
                    type="number" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="Bijv. 20000"
                    value={newEmployeeCount || ''}
                    onChange={e => setNewEmployeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RIE Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange bg-white"
                    value={newHasRIE === undefined ? '' : newHasRIE ? 'true' : 'false'}
                    onChange={e => setNewHasRIE(e.target.value === '' ? undefined : e.target.value === 'true')}
                  >
                    <option value="">Niet opgegeven</option>
                    <option value="true">Heeft RIE</option>
                    <option value="false">Geen RIE</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Team Toegang</label>
                <div className="border border-gray-200 rounded-md max-h-40 overflow-y-auto divide-y divide-gray-100">
                  {allUsers.map(u => (
                    <div 
                      key={u.id} 
                      onClick={() => toggleUserAssignment(u.id)}
                      className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-gray-50 ${assignedIds.includes(u.id) ? 'bg-orange-50' : ''}`}
                    >
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${assignedIds.includes(u.id) ? 'bg-richting-orange border-richting-orange' : 'border-gray-300'}`}>
                        {assignedIds.includes(u.id) && <span className="text-white text-xs">✓</span>}
                      </div>
                      <img src={u.avatarUrl} className="w-6 h-6 rounded-full" />
                      <span className="text-sm text-gray-700">{u.name} {u.id === user.id && '(Jij)'}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Geselecteerde collega's krijgen toegang tot dit dossier.</p>
              </div>

              <button 
                onClick={handleAddCustomer}
                className="w-full mt-4 bg-richting-orange text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                Klant Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- DASHBOARD VIEW ---
interface DashboardViewProps {
  documents: DocumentSource[];
  user: User;
  setView: (view: string) => void;
  openDocument: (doc: DocumentSource) => void;
  handleDocumentAction: (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ documents, user, setView, openDocument, handleDocumentAction }) => {
  const activeDocs = useMemo(() => documents.filter(d => !d.isArchived), [documents]);
  const trending = useMemo(() => 
    [...activeDocs].sort((a, b) => ((b.likedBy || []).length * 2 + (b.viewedBy || []).length) - ((a.likedBy || []).length * 2 + (a.viewedBy || []).length)).slice(0, 5),
  [activeDocs]);
  const recent = useMemo(() => activeDocs.slice(0, 6), [activeDocs]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="flex flex-col md:flex-row justify-between items-end border-b-4 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">HET LAATSTE NIEUWS</h2>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-richting-orange uppercase">Kennisbank Editie</p>
          <p className="text-xs text-gray-400">{documents.length} artikelen beschikbaar</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {recent.length > 0 ? (
            <article className="group cursor-pointer" onClick={() => openDocument(recent[0])}>
              <div className="relative h-64 w-full bg-slate-800 rounded-lg overflow-hidden mb-4 shadow-md transition-shadow group-hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-tr from-richting-dark to-gray-600 opacity-90"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="bg-richting-orange text-white text-[10px] font-bold px-2 py-1 uppercase mb-2 inline-block rounded-sm">
                    {getCategoryLabel(recent[0].mainCategoryId)}
                  </span>
                  <h3 className="text-3xl font-bold text-white leading-tight group-hover:underline decoration-richting-orange underline-offset-4">
                    {recent[0].title}
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <p className="text-lg text-slate-700 leading-relaxed font-serif">
                    <span className="text-3xl float-left mr-2 font-bold text-richting-orange leading-none h-8">"</span>
                    {recent[0].summary}
                  </p>
                </div>
                  <div className="flex flex-col justify-end text-sm text-gray-500 border-l border-gray-200 pl-4">
                    <div className="mb-2"><span className="font-semibold text-slate-900">Rubriek:</span> {getCategoryLabel(recent[0].mainCategoryId, recent[0].subCategoryId)}</div>
                    <div><span className="font-semibold text-slate-900">Datum:</span> {new Date(recent[0].uploadedAt).toLocaleDateString()}</div>
                  </div>
              </div>
            </article>
          ) : (
            <div className="text-gray-500 text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed flex flex-col items-center">
              <p className="mb-4">Geen nieuws artikelen gevonden.</p>
              <button onClick={() => setView('upload')} className="text-richting-orange font-bold hover:underline">Voeg het eerste artikel toe</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 border-t border-gray-200 pt-8">
            {recent.slice(1).map(doc => (
              <article key={doc.id} className="flex flex-col h-full group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-richting-orange uppercase tracking-wider">{getCategoryLabel(doc.mainCategoryId)}</span>
                    <span className="text-gray-300 text-[10px]">|</span>
                    <span className="text-[10px] text-gray-500 uppercase">{getCategoryLabel(doc.mainCategoryId, doc.subCategoryId)}</span>
                  </div>
                  <h4 onClick={() => openDocument(doc)} className="text-xl font-bold text-slate-900 mb-2 group-hover:text-richting-orange cursor-pointer line-clamp-2 leading-tight">
                    {doc.title}
                  </h4>
                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{doc.summary}</p>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                     <div className="flex items-center text-xs text-gray-400 gap-4">
                        <span className="flex items-center gap-1"><EyeIcon/> {(doc.viewedBy || []).length}</span>
                        <span className="flex items-center gap-1"><HeartIcon filled={(doc.likedBy || []).includes(user.id)} /> {(doc.likedBy || []).length}</span>
                     </div>
                     <button onClick={() => openDocument(doc)} className="text-xs font-bold text-richting-orange hover:text-slate-900 transition-colors uppercase tracking-wide">Lees meer</button>
                  </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-gray-100 p-6 rounded-lg">
             <h3 className="font-bold text-slate-900 mb-4 border-b border-gray-300 pb-2 uppercase tracking-wide text-sm">Meest Gewaardeerd</h3>
             <ul className="space-y-4">
                {trending.length > 0 ? trending.map((doc, idx) => (
                  <li key={doc.id} className="flex gap-4 group cursor-pointer" onClick={() => openDocument(doc)}>
                    <span className="text-3xl font-black text-gray-300 group-hover:text-richting-orange transition-colors">{idx + 1}</span>
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-richting-orange transition-colors">{doc.title}</h5>
                      <p className="text-xs text-gray-500 mt-1">{(doc.likedBy || []).length} likes</p>
                    </div>
                  </li>
                )) : <p className="text-xs text-gray-400">Nog geen beoordelingen.</p>}
             </ul>
          </div>

          <div className="bg-richting-orange text-white p-6 rounded-lg">
            <h3 className="font-bold mb-2">Heb je kennis om te delen?</h3>
            <p className="text-sm opacity-90 mb-4">Help je collega's en voeg waardevolle documenten toe aan de kennisbank.</p>
            <button onClick={() => setView('upload')} className="w-full bg-white text-richting-orange font-bold py-2 rounded shadow-sm hover:bg-gray-50 transition-colors text-sm uppercase">Nieuwe Bron Toevoegen</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

const KnowledgeView = ({ documents, openDocument }: { documents: DocumentSource[], openDocument: (d: DocumentSource) => void }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (d.isArchived) return false;
      const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.summary.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCat === 'all' || d.mainCategoryId === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [documents, search, filterCat]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <input 
          type="text" 
          placeholder="Zoek in kennisbank..." 
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md bg-white focus:ring-richting-orange focus:border-richting-orange"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="all">Alle Categorieën</option>
          {KNOWLEDGE_STRUCTURE.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel & Samenvatting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actie</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-richting-orange font-bold text-xs">
                      {doc.type}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-richting-orange" onClick={() => openDocument(doc)}>{doc.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{doc.summary}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {getCategoryLabel(doc.mainCategoryId)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openDocument(doc)} className="text-richting-orange hover:text-orange-900">Bekijk</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
               <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Geen documenten gevonden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ChatView = ({ user, documents }: { user: User, documents: DocumentSource[] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hoi ${user.name.split(' ')[0]}, ik ben de AI assistent van Richting. Waarmee kan ik je helpen?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const result = await askQuestion(input, documents);
    
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: result.answer,
      citations: result.citedIds
    }]);
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-richting-orange text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
              <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-richting-orange focus:border-transparent outline-none"
            placeholder="Stel je vraag over interne documenten..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-richting-orange text-white rounded-full p-2 hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadView = ({ user, onUploadComplete }: { user: User, onUploadComplete: () => void }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<DocType>(DocType.TEXT);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);

  useEffect(() => {
    const loadCusts = async () => {
        const c = await customerService.getCustomersForUser(user.id, user.role);
        setCustomers(c);
    };
    loadCusts();
  }, [user]);

  const handleAnalyze = async () => {
    if (!title) { alert("Geef aub een titel op"); return; }
    if (!content && !url) return;
    setAnalyzing(true);
    
    let textToAnalyze = content;
    if (type === DocType.URL || type === DocType.GOOGLE_DOC || type === DocType.PDF) {
        textToAnalyze = `URL: ${url}\n(Inhoud niet direct beschikbaar, genereer op basis van URL of Titel: ${title})`;
    } else if (type === DocType.EMAIL) {
        textToAnalyze = `EMAIL ONDERWERP: ${title}\nINHOUD:\n${content}`;
    }

    const result = await analyzeContent(textToAnalyze);
    setAnalysis(result);
    setAnalyzing(false);
    setStep(2);
  };

  const handleSave = async () => {
    if (!analysis) return;
    const newDoc: DocumentSource = {
      id: `doc_${Date.now()}`,
      title: title || "Nieuwe Bron",
      content: content || url,
      originalUrl: url || "",
      type,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      summary: analysis.summary,
      mainCategoryId: analysis.mainCategoryId,
      subCategoryId: analysis.subCategoryId,
      tags: analysis.tags,
      viewedBy: [],
      likedBy: [],
      isArchived: false,
      customerId: customerId || undefined
    };
    await dbService.addDocument(newDoc);
    onUploadComplete();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
         <h3 className="font-bold text-slate-800">Nieuwe Kennis Toevoegen</h3>
         <div className="flex gap-2">
            <span className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-richting-orange' : 'bg-gray-300'}`}></span>
            <span className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-richting-orange' : 'bg-gray-300'}`}></span>
         </div>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type Bron</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setType(DocType.TEXT)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.TEXT ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <span>📝</span> Tekst
                </button>
                <button onClick={() => setType(DocType.URL)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.URL ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <span>🔗</span> Website
                </button>
                <button onClick={() => setType(DocType.EMAIL)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.EMAIL ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <EmailIcon /> Email
                </button>
                <button onClick={() => setType(DocType.GOOGLE_DOC)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.GOOGLE_DOC ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <GoogleDocIcon /> G-Doc
                </button>
                <button onClick={() => setType(DocType.PDF)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.PDF ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                   <PdfIcon /> PDF (Link)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === DocType.EMAIL ? 'Onderwerp' : 'Titel'}
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                placeholder={type === DocType.EMAIL ? "Onderwerp van de email" : "Titel van het document"}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* CUSTOMER LINK OPTION */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Koppel aan Klant (Optioneel)</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange bg-white"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                 <option value="">-- Geen koppeling --</option>
                 {customers.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
              </select>
            </div>

            {type === DocType.TEXT || type === DocType.EMAIL ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{type === DocType.EMAIL ? 'Inhoud Email' : 'Inhoud'}</label>
                <textarea 
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder="Plak hier de tekst..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                ></textarea>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                <input 
                  type="url" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder={type === DocType.GOOGLE_DOC ? "https://docs.google.com/..." : "https://..."}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
            )}

            <button 
              onClick={handleAnalyze} 
              disabled={analyzing || !title}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {analyzing ? (
                <>Analyzing...</>
              ) : (
                <>✨ Analyseer & Categoriseer</>
              )}
            </button>
          </div>
        )}

        {step === 2 && analysis && (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
              <h4 className="font-bold text-richting-orange mb-2 flex items-center gap-2">✨ AI Analyse Resultaat</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Samenvatting</label>
                  <p className="text-sm text-gray-800">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-gray-500 uppercase font-bold">Categorie</label>
                     <p className="text-sm font-medium">{getCategoryLabel(analysis.mainCategoryId)}</p>
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 uppercase font-bold">Subcategorie</label>
                     <p className="text-sm font-medium">{getCategoryLabel(analysis.mainCategoryId, analysis.subCategoryId)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analysis.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">Terug</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-richting-orange text-white rounded-lg font-bold hover:bg-orange-600">Opslaan in Kennisbank</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSource | null>(null);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
      // Reset errors on successful login
      if (u) {
          setAuthError('');
          setDbError(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
      if (user) {
        try {
          const docs = await dbService.getDocuments();
          setDocuments(docs);
          
          // Seed if empty
          if (docs.length === 0) {
             await dbService.seed();
             const seeded = await dbService.getDocuments();
             setDocuments(seeded);
          }
        } catch (error: any) {
          console.error("Failed to load docs:", error);
          if (error.message === 'FIREBASE_DB_NOT_FOUND') {
            setDbError(true);
          }
        }
      }
    };
    loadDocs();
  }, [user, currentView]);

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.login(email, pass);
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.loginWithGoogle();
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, name: string, pass: string) => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.register(email, name, pass);
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleForgot = async (email: string) => {
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setAuthSuccess('Herstel email verzonden!');
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    
    // Optimistic UI update
    setDocuments(prev => prev.map(d => {
      if (d.id !== docId) return d;
      // SAFEGUARD: Ensure arrays exist
      const viewed = d.viewedBy || [];
      const liked = d.likedBy || [];

      if (action === 'view' && !viewed.includes(user.id)) return { ...d, viewedBy: [...viewed, user.id] };
      if (action === 'like') {
        const hasLiked = liked.includes(user.id);
        return { ...d, likedBy: hasLiked ? liked.filter(id => id !== user.id) : [...liked, user.id] };
      }
      if (action === 'archive') return { ...d, isArchived: !d.isArchived };
      return d;
    }));

    if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(prev => {
            if (!prev) return null;
            if (action === 'like') {
                const likedList = prev.likedBy || [];
                const hasLiked = likedList.includes(user.id);
                return { ...prev, likedBy: hasLiked ? likedList.filter(id => id !== user.id) : [...likedList, user.id] };
            }
            return prev;
        })
    }

    await dbService.updateDocumentStats(docId, user.id, action);
  };

  if (dbError) {
    return <DatabaseErrorView />;
  }

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-richting-orange border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <AuthView 
        onLogin={handleLogin} 
        onGoogleLogin={handleGoogleLogin}
        onRegister={handleRegister} 
        onForgot={handleForgot}
        loading={loading}
        error={authError}
        success={authSuccess}
        setAuthError={setAuthError}
      />
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={() => authService.logout()} 
      currentView={currentView} 
      onNavigate={setCurrentView}
    >
      {currentView === 'dashboard' && (
        <DashboardView 
          documents={documents} 
          user={user} 
          setView={setCurrentView} 
          openDocument={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }}
          handleDocumentAction={handleDocumentAction}
        />
      )}
      {currentView === 'customers' && (
        <CustomersView user={user} onOpenDoc={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }} />
      )}
      {currentView === 'knowledge' && (
        <KnowledgeView 
          documents={documents} 
          openDocument={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }} 
        />
      )}
      {currentView === 'chat' && <ChatView user={user} documents={documents} />}
      {currentView === 'upload' && (
        <UploadView 
           user={user} 
           onUploadComplete={() => { setCurrentView('dashboard'); }} 
        />
      )}

      {/* DOCUMENT MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center z-10">
              <span className="text-xs font-bold uppercase text-richting-orange tracking-widest">{getCategoryLabel(selectedDoc.mainCategoryId)}</span>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{selectedDoc.title}</h1>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={() => handleDocumentAction(selectedDoc.id, 'like')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${(selectedDoc.likedBy || []).includes(user.id) ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <HeartIcon filled={(selectedDoc.likedBy || []).includes(user.id)} />
                  <span className="text-sm font-bold">{(selectedDoc.likedBy || []).length}</span>
                </button>
                
                {selectedDoc.originalUrl && (
                  <a 
                    href={selectedDoc.originalUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors text-sm font-bold"
                  >
                    <ExternalLinkIcon /> Open Origineel
                  </a>
                )}

                {user.role === 'ADMIN' && (
                   <button 
                     onClick={() => handleDocumentAction(selectedDoc.id, 'archive')}
                     className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm"
                   >
                     <ArchiveIcon /> {selectedDoc.isArchived ? 'Dearchiveren' : 'Archiveren'}
                   </button>
                )}
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-600 leading-relaxed font-medium border-l-4 border-richting-orange pl-4 mb-8 italic">
                  "{selectedDoc.summary}"
                </p>
                <div className="bg-gray-50 p-6 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
                  {selectedDoc.content}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                 <div className="flex flex-wrap gap-2">
                    {(selectedDoc.tags || []).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">#{tag}</span>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;