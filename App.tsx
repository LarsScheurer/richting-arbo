import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, DocumentSource, KNOWLEDGE_STRUCTURE, DocType, GeminiAnalysisResult, ChatMessage, Customer, Location, UserRole, ContactPerson, OrganisatieProfiel, Risico, Proces, Functie } from './types';
import { authService, dbService, customerService, promptService, richtingLocatiesService, Prompt, RichtingLocatie, processService, functionService, substanceService, logoService } from './services/firebase';
import { addRiskAssessment, getRisksByCustomer, getRisksByProcess, getRisksByFunction, getRisksBySubstance } from './services/riskService';
import { Process, Function as FunctionType, Substance, RiskAssessment } from './types/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from './services/firebase';
import { Layout, RichtingLogo } from './components/Layout';
import { analyzeContent, askQuestion, analyzeOrganisatieBranche, analyzeCultuur } from './services/geminiService';
import ReactMarkdown from 'react-markdown';
import { generateOrganisatieProfielPDF } from './utils/pdfGenerator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ORGANISATIE_ANALYSE_HOOFDSTUKKEN, ORGANISATIE_ANALYSE_HOOFDSTUKKEN_ARRAY } from './utils/organisatieAnalyseConstants';

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

// Fine & Kinney is nu de norm - geen conversie meer nodig
// Fine & Kinney Kans (W) waarden: 0.5, 1, 3, 6, 10
// Fine & Kinney Effect (E) waarden: 1, 3, 7, 15, 40

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Actief';
    case 'churned': return 'Gearchiveerd';
    case 'prospect': return 'Prospect';
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

// KlantreisView Component
const KlantreisView = ({
  customer,
  user,
  onBack,
  onUpdate,
  onComplete
}: {
  customer: Customer;
  user: User;
  onBack: () => void;
  onUpdate: (updated: Customer) => void;
  onComplete: () => void;
}) => {
  const [klantreis, setKlantreis] = useState(customer.klantreis || {
    levels: [
      { level: 1, name: 'Publiek Organisatie Profiel', status: 'not_started' as const },
      { level: 2, name: 'Publiek Risico Profiel', status: 'not_started' as const },
      { level: 3, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
    ],
    lastUpdated: new Date().toISOString()
  });
  
  const [analyzingLevel, setAnalyzingLevel] = useState<1 | 2 | 3 | null>(null);
  const [levelResults, setLevelResults] = useState<{[key: number]: any}>({});
  // Progress tracking for Level 1 (Publiek Organisatie Profiel)
  const [analyseStap, setAnalyseStap] = useState(0);
  const [hoofdstukkenResultaten, setHoofdstukkenResultaten] = useState<{[key: string]: string}>({});
  
  // Initialize klantreis if it doesn't exist
  useEffect(() => {
    if (!customer.klantreis) {
      const initialKlantreis = {
        levels: [
          { level: 1 as const, name: 'Publiek Organisatie Profiel', status: 'not_started' as const },
          { level: 2 as const, name: 'Publiek Risico Profiel', status: 'not_started' as const },
          { level: 3 as const, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
        ],
        lastUpdated: new Date().toISOString()
      };
      setKlantreis(initialKlantreis);
      // Save to customer
      customerService.updateCustomer(customer.id, { klantreis: initialKlantreis }).then(() => {
        onUpdate({ ...customer, klantreis: initialKlantreis });
      });
    }
  }, [customer]);

  const updateLevelStatus = async (level: 1 | 2 | 3, status: 'not_started' | 'in_progress' | 'completed', resultData?: any) => {
    const updatedLevels = klantreis.levels.map(l => 
      l.level === level 
        ? { ...l, status, completedAt: status === 'completed' ? new Date().toISOString() : l.completedAt, resultData }
        : l
    );
    
    const updatedKlantreis = {
      ...klantreis,
      levels: updatedLevels,
      lastUpdated: new Date().toISOString()
    };
    
    setKlantreis(updatedKlantreis);
    
    // Save to customer
    const updatedCustomer = { ...customer, klantreis: updatedKlantreis };
    await customerService.updateCustomer(customer.id, { klantreis: updatedKlantreis });
    onUpdate(updatedCustomer);
    
    if (resultData) {
      setLevelResults(prev => ({ ...prev, [level]: resultData }));
    }
  };

  const startLevel1 = async () => {
    setAnalyzingLevel(1);
    await updateLevelStatus(1, 'in_progress');
    setAnalyseStap(0);
    setHoofdstukkenResultaten({});
    
    try {
      const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseBrancheStapsgewijs';
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organisatieNaam: customer.name,
          website: customer.website || '',
          customerId: customer.id,
          userId: user.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const analyseId = data.analyseId;
      // Poll for completion and progress (per hoofdstuk)
      const progressUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/getAnalyseProgress';
      const pollInterval = setInterval(async () => {
        try {
          const progressResponse = await fetch(`${progressUrl}?analyseId=${analyseId}`);
          if (!progressResponse.ok) {
            clearInterval(pollInterval);
            return;
          }
          
          const progress = await progressResponse.json();
          
          // Update stap en tussentijdse hoofdstukken
          setAnalyseStap(progress.progress.huidigeStap || 0);
          const nieuweResultaten: {[key: string]: string} = {};
          Object.keys(progress.hoofdstukken || {}).forEach(key => {
            const hoofdstuk = progress.hoofdstukken[key];
            if (hoofdstuk.status === 'completed' && hoofdstuk.content) {
              nieuweResultaten[key] = hoofdstuk.content;
            }
          });
          setHoofdstukkenResultaten(nieuweResultaten);
          
          if (progress.progress.status === 'completed') {
            clearInterval(pollInterval);
            setAnalyzingLevel(null);
            await updateLevelStatus(1, 'completed', progress.progress);
            setLevelResults(prev => ({ ...prev, 1: progress.progress }));
            alert('✅ Level 1 voltooid!');
          } else if (progress.progress.status === 'failed') {
            clearInterval(pollInterval);
            setAnalyzingLevel(null);
            await updateLevelStatus(1, 'not_started');
            alert('❌ Level 1 mislukt. Probeer het opnieuw.');
          }
        } catch (error) {
          console.error('Error polling progress:', error);
        }
      }, 1000); // snellere polling voor voortgang
      
      // Timeout na 10 minuten
      setTimeout(() => {
        clearInterval(pollInterval);
        if (analyzingLevel === 1) {
          setAnalyzingLevel(null);
          alert('⏱️ Analyse duurt langer dan verwacht. Check later opnieuw.');
        }
      }, 600000);
      
    } catch (error: any) {
      console.error('Error starting Level 1:', error);
      setAnalyzingLevel(null);
      await updateLevelStatus(1, 'not_started');
      alert(`❌ Fout bij starten Level 1: ${error.message || 'Onbekende fout'}`);
    }
  };

  const startLevel2 = async () => {
    setAnalyzingLevel(2);
    await updateLevelStatus(2, 'in_progress');
    
    try {
      const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseRisicoProfiel';
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organisatieNaam: customer.name,
          website: customer.website || '',
          customerId: customer.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalyzingLevel(null);
      await updateLevelStatus(2, 'completed', data);
      alert('✅ Level 2 voltooid!');
    } catch (error: any) {
      console.error('Error starting Level 2:', error);
      setAnalyzingLevel(null);
      await updateLevelStatus(2, 'not_started');
      alert(`❌ Fout bij starten Level 2: ${error.message || 'Onbekende fout'}`);
    }
  };

  const startLevel3 = async () => {
    setAnalyzingLevel(3);
    await updateLevelStatus(3, 'in_progress');
    
    try {
      const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseCultuurTest';
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          organisatieNaam: customer.name,
          website: customer.website || '',
          customerId: customer.id
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAnalyzingLevel(null);
      await updateLevelStatus(3, 'completed', data);
      alert('✅ Level 3 voltooid!');
    } catch (error: any) {
      console.error('Error starting Level 3:', error);
      setAnalyzingLevel(null);
      await updateLevelStatus(3, 'not_started');
      alert(`❌ Fout bij starten Level 3: ${error.message || 'Onbekende fout'}`);
    }
  };

  const getLevelStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      default: return '⭕';
    }
  };

  const getLevelStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 border-green-300';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const allLevelsCompleted = klantreis.levels.every(l => l.status === 'completed');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <button onClick={onBack} className="text-richting-orange hover:underline mb-2 flex items-center gap-2">
            ← Terug
          </button>
          <h1 className="text-3xl font-bold text-slate-900">Klantreis: {customer.name}</h1>
          <p className="text-gray-600 mt-1">Verzamel informatie over de organisatie in 3 stappen</p>
        </div>
        {allLevelsCompleted && (
          <button
            onClick={onComplete}
            className="bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors"
          >
            Naar Detail Overzicht →
          </button>
        )}
      </div>

      {/* Levels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {klantreis.levels.map((level) => (
          <div
            key={level.level}
            className={`bg-white rounded-xl shadow-lg border-2 p-6 ${
              level.status === 'completed' ? 'border-green-300' : 
              level.status === 'in_progress' ? 'border-yellow-300' : 
              'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold ${
                  level.status === 'completed' ? 'bg-green-100 text-green-700' :
                  level.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {level.level}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{level.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded border ${getLevelStatusColor(level.status)}`}>
                    {getLevelStatusIcon(level.status)} {level.status === 'completed' ? 'Voltooid' : level.status === 'in_progress' ? 'Bezig...' : 'Niet gestart'}
                  </span>
                </div>
              </div>
            </div>

            {/* Level 1 voortgang per hoofdstuk */}
            {level.level === 1 && (level.status === 'in_progress' || Object.keys(hoofdstukkenResultaten).length > 0) && (
              <div className="mb-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>Voortgang: {analyseStap} / 13</span>
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-richting-orange h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(analyseStap / 13) * 100}%` }}
                    ></div>
                  </div>
                </div>
                {Object.keys(hoofdstukkenResultaten).length > 0 && (
                  <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-slate-800 mb-2">Hoofdstukken gereed:</p>
                    <div className="space-y-2">
                      {Object.keys(hoofdstukkenResultaten).sort().map(key => (
                        <div key={key} className="bg-white border border-green-200 rounded p-2">
                          <div className="text-xs font-bold text-green-700">
                            ✅ Hoofdstuk {key}: {ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}
                          </div>
                          <div className="text-[11px] text-gray-600 line-clamp-2">
                            {hoofdstukkenResultaten[key].substring(0, 160)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {level.status === 'completed' && level.resultData && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-2">Resultaten beschikbaar</p>
                <button
                  onClick={() => {
                    // Show results in a modal or expand
                    alert('Resultaten worden getoond (nog te implementeren)');
                  }}
                  className="text-xs text-richting-orange hover:underline"
                >
                  Bekijk resultaten →
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (level.level === 1) startLevel1();
                else if (level.level === 2) startLevel2();
                else if (level.level === 3) startLevel3();
              }}
              disabled={level.status === 'in_progress' || analyzingLevel !== null}
              className={`w-full py-3 rounded-lg font-bold transition-colors ${
                level.status === 'completed'
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  : level.status === 'in_progress' || analyzingLevel !== null
                  ? 'bg-yellow-100 text-yellow-700 cursor-wait'
                  : 'bg-richting-orange text-white hover:bg-orange-600'
              }`}
            >
              {level.status === 'completed' ? 'Voltooid' : 
               level.status === 'in_progress' || analyzingLevel === level.level ? 'Bezig...' : 
               'Start Analyse'}
            </button>

            {level.completedAt && (
              <p className="text-xs text-gray-500 mt-2 text-center">
                Voltooid: {new Date(level.completedAt).toLocaleDateString('nl-NL')}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-richting-orange to-orange-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold mb-4">Voortgang</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span>Voltooide levels</span>
              <span className="font-bold">
                {klantreis.levels.filter(l => l.status === 'completed').length} / {klantreis.levels.length}
              </span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-500"
                style={{
                  width: `${(klantreis.levels.filter(l => l.status === 'completed').length / klantreis.levels.length) * 100}%`
                }}
              />
            </div>
          </div>
        </div>
        {allLevelsCompleted && (
          <div className="mt-4 p-3 bg-white/20 rounded-lg">
            <p className="font-bold">🎉 Alle levels voltooid!</p>
            <p className="text-sm mt-1">Je kunt nu naar het detail overzicht om alle informatie te bekijken.</p>
          </div>
        )}
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
  onOpenDoc,
  onShowKlantreis,
  onRefresh
}: { 
  customer: Customer, 
  user: User,
  onBack: () => void,
  onUpdate: (updated: Customer) => void,
  onDelete: (id: string) => void,
  onOpenDoc: (doc: DocumentSource) => void,
  onShowKlantreis?: () => void,
  onRefresh?: () => void
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [docs, setDocs] = useState<DocumentSource[]>([]);
  const [organisatieProfiel, setOrganisatieProfiel] = useState<OrganisatieProfiel | null>(null);
  const [selectedProces, setSelectedProces] = useState<Proces | null>(null);
  const [selectedFunctie, setSelectedFunctie] = useState<Functie | null>(null);
  const [selectedFunctieRisicos, setSelectedFunctieRisicos] = useState<RiskAssessment[]>([]);
  const [functieRisicoCounts, setFunctieRisicoCounts] = useState<{[functionId: string]: number}>({});
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [isAnalyzingOrganisatie, setIsAnalyzingOrganisatie] = useState(false);
  const [isAnalyzingCultuur, setIsAnalyzingCultuur] = useState(false);
  const [organisatieAnalyseResultaat, setOrganisatieAnalyseResultaat] = useState<string | null>(null);
  const [cultuurAnalyseResultaat, setCultuurAnalyseResultaat] = useState<string | null>(null);
  const [analyseStap, setAnalyseStap] = useState(0); // 0 = niet gestart, 1-13 = huidige stap
  const [cultuurAnalyseStap, setCultuurAnalyseStap] = useState(0); // 0 = niet gestart, 1-12 = huidige stap
  const [analyseId, setAnalyseId] = useState<string | null>(null);
  const [hoofdstukkenResultaten, setHoofdstukkenResultaten] = useState<{[key: string]: string}>({});
  
  // Risico Profiel state
  const [isAnalyzingRisico, setIsAnalyzingRisico] = useState(false);
  const [risicoProfielData, setRisicoProfielData] = useState<{
    processen: Process[];
    functies: FunctionType[];
    stoffen: Substance[];
    risicos: RiskAssessment[];
  } | null>(null);
  const [activeRisicoTab, setActiveRisicoTab] = useState<'overview' | 'processen' | 'functies' | 'stoffen' | 'risicos'>('overview');
  
  // New Location Form
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locEmployeeCount, setLocEmployeeCount] = useState<number | undefined>(undefined);
  
  // Edit Location Form
  const [editLocEmployeeCount, setEditLocEmployeeCount] = useState<number | undefined>(undefined);

  // New Contact Form
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('');

  const loadData = async () => {
    try {
      console.log(`🔄 Loading data for customer: ${customer.id}`);
      const [locs, conts, documents, profiel] = await Promise.all([
        customerService.getLocations(customer.id),
        customerService.getContactPersons(customer.id),
        dbService.getDocumentsForCustomer(customer.id),
        customerService.getOrganisatieProfiel(customer.id)
      ]);
      console.log(`✅ Loaded ${locs.length} locations for customer ${customer.id}:`, locs);
      setLocations(locs);
      setContacts(conts);
      setDocs(documents);
      setOrganisatieProfiel(profiel);
      
      // Haal risico counts op voor alle functies (in achtergrond, niet blokkerend)
      // Doe dit asynchroon zodat het de loadData niet blokkeert
      if (profiel && profiel.functies && Array.isArray(profiel.functies) && profiel.functies.length > 0) {
        // Start async, maar wacht niet op completion
        Promise.all(
          profiel.functies.map(async (functie) => {
            try {
              if (functie && functie.id) {
                const risicos = await getRisksByFunction(functie.id);
                setFunctieRisicoCounts(prev => ({
                  ...prev,
                  [functie.id]: risicos.length
                }));
              }
            } catch (error) {
              console.error(`Error loading risks for function ${functie?.id}:`, error);
              if (functie && functie.id) {
                setFunctieRisicoCounts(prev => ({
                  ...prev,
                  [functie.id]: 0
                }));
              }
            }
          })
        ).catch(error => {
          console.error('Error loading function risk counts:', error);
        });
      }
       
      // Update locaties zonder coordinaten of richtingLocatieId
      const locatiesTeUpdaten = locs.filter(loc => 
        (!loc.latitude || !loc.longitude || !loc.richtingLocatieId) && loc.address && loc.city
      );
       
      if (locatiesTeUpdaten.length > 0) {
        // Update in achtergrond (niet blokkerend)
        Promise.all(locatiesTeUpdaten.map(async (loc) => {
          try {
            // Geocodeer adres
            const coordinates = await geocodeAddress(loc.address, loc.city);
            if (!coordinates) return;
             
            // Vind dichtstbijzijnde Richting locatie
            const nearest = await findNearestRichtingLocation(coordinates.latitude, coordinates.longitude);
             
            // Update locatie
            const updatedLoc: Location = {
              ...loc,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              richtingLocatieId: nearest?.id || loc.richtingLocatieId,
              richtingLocatieNaam: nearest?.naam || loc.richtingLocatieNaam,
              richtingLocatieAfstand: nearest?.distance || loc.richtingLocatieAfstand
            };
             
            await customerService.addLocation(updatedLoc);
             
            // Update state
            setLocations(prev => prev.map(l => l.id === loc.id ? updatedLoc : l));
          } catch (error) {
            console.error(`Error updating location ${loc.id}:`, error);
          }
        })).catch(error => {
          console.error('Error updating locations:', error);
        });
      }
    } catch (error) {
      console.error('❌ Error loading customer data:', error);
      // Zorg dat de app niet crasht - toon lege state maar geen error
      setLocations([]);
      setContacts([]);
      setDocs([]);
      setOrganisatieProfiel(null);
      setFunctieRisicoCounts({});
    }
  };

  useEffect(() => {
    loadData();
  }, [customer.id]);

  const handleAddLocation = async () => {
    if (!locName || !locAddress || !locCity) {
      alert('Vul naam, adres en stad in');
      return;
    }
    
    // Toon loading state
    setIsAddingLoc(false); // Sluit form tijdelijk
    
    try {
      // Stap 1: Geocodeer het adres om GPS coordinaten te krijgen
      const coordinates = await geocodeAddress(locAddress, locCity);
      
      const newLoc: Location = {
        id: `loc_${Date.now()}`,
        customerId: customer.id,
        name: locName,
        address: locAddress,
        city: locCity,
        employeeCount: locEmployeeCount,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude
      };
      
      // Stap 2: Vind dichtstbijzijnde Richting locatie op basis van GPS coordinaten
      if (coordinates) {
        const nearest = await findNearestRichtingLocation(coordinates.latitude, coordinates.longitude);
        if (nearest) {
          newLoc.richtingLocatieId = nearest.id;
          newLoc.richtingLocatieNaam = nearest.naam;
          newLoc.richtingLocatieAfstand = nearest.distance;
          console.log(`📍 Dichtstbijzijnde Richting locatie: ${nearest.naam} (${nearest.distance.toFixed(1)} km)`);
        }
      } else {
        // Fallback: probeer op basis van stad naam te matchen
        console.warn('Geocoding mislukt, probeer stad naam matching');
        const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
        const matchingLocatie = allRichtingLocaties.find(rl => {
          const cityLower = locCity.toLowerCase();
          const stadLower = rl.stad?.toLowerCase() || '';
          const vestigingLower = rl.vestiging.toLowerCase();
          return cityLower === stadLower || 
                 vestigingLower.includes(cityLower) ||
                 cityLower.includes(vestigingLower);
        });
        
        if (matchingLocatie) {
          newLoc.richtingLocatieId = matchingLocatie.id;
          newLoc.richtingLocatieNaam = matchingLocatie.vestiging;
        }
      }
      
      // Stap 3: Sla locatie op
      await customerService.addLocation(newLoc);
      setLocations(prev => [...prev, newLoc]);
      setIsAddingLoc(false);
      setLocName(''); 
      setLocAddress(''); 
      setLocCity(''); 
      setLocEmployeeCount(undefined);
      
      if (newLoc.richtingLocatieNaam) {
        const afstandText = newLoc.richtingLocatieAfstand !== undefined ? ` (${newLoc.richtingLocatieAfstand.toFixed(1)} km)` : '';
        alert(`✅ Locatie toegevoegd!\n📍 Richtingvestiging: ${newLoc.richtingLocatieNaam}${afstandText}`);
      } else {
        alert('✅ Locatie toegevoegd!\n⚠️ Geen Richting locatie gevonden - controleer handmatig.');
      }
    } catch (error: any) {
      console.error('Error adding location:', error);
      alert(`❌ Fout bij toevoegen locatie: ${error.message || 'Onbekende fout'}`);
      setIsAddingLoc(true); // Heropen form bij fout
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setEditLocEmployeeCount(location.employeeCount);
  };

  const handleSaveLocationEdit = async () => {
    if (!editingLocation) return;
    
    const updatedLoc: Location = {
      ...editingLocation,
      employeeCount: editLocEmployeeCount
    };
    
    await customerService.addLocation(updatedLoc); // setDoc werkt ook voor updates
    setLocations(prev => prev.map(loc => loc.id === editingLocation.id ? updatedLoc : loc));
    setEditingLocation(null);
    setEditLocEmployeeCount(undefined);
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    
    try {
      await customerService.deleteLocation(deletingLocation.id);
      setLocations(prev => prev.filter(loc => loc.id !== deletingLocation.id));
      setDeletingLocation(null);
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("Kon locatie niet verwijderen. Probeer het opnieuw.");
    }
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
    try {
      console.log(`🔄 Changing status for customer ${customer.id} to ${newStatus}`);
      await customerService.updateCustomerStatus(customer.id, newStatus);
      console.log(`✅ Status updated successfully`);
      onUpdate({ ...customer, status: newStatus });
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      alert(`Fout bij aanpassen status: ${error.message || 'Onbekende fout'}`);
    }
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

  // Geocoding functie: haal latitude/longitude op van een adres
  const geocodeAddress = async (address: string, city: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const fullAddress = `${address}, ${city}, Nederland`;
      // Gebruik een gratis geocoding service (Nominatim OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=nl`,
        {
          headers: {
            'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)' // Vereist door Nominatim - specifiekere User-Agent
          }
        }
      );
      
      if (!response.ok) {
        console.warn('Geocoding service response niet OK:', response.status);
        // Probeer alleen met stad als fallback
        if (city) {
          const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
            {
              headers: {
                'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
              }
            }
          );
          if (cityResponse.ok) {
            const cityData = await cityResponse.json();
            if (cityData && cityData.length > 0) {
              return {
                latitude: parseFloat(cityData[0].lat),
                longitude: parseFloat(cityData[0].lon)
              };
            }
          }
        }
        return null;
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      
      // Fallback: probeer alleen met stad
      if (city) {
        const cityResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
          {
            headers: {
              'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
            }
          }
        );
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          if (cityData && cityData.length > 0) {
            return {
              latitude: parseFloat(cityData[0].lat),
              longitude: parseFloat(cityData[0].lon)
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Haversine formule: bereken afstand tussen twee GPS coordinaten in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Vind dichtstbijzijnde Richting locatie op basis van GPS coordinaten
  const findNearestRichtingLocation = async (
    latitude: number, 
    longitude: number
  ): Promise<{ id: string; naam: string; distance: number } | null> => {
    try {
      const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
      
      // Filter locaties met coordinaten
      const locatiesMetCoordinaten = allRichtingLocaties.filter(
        rl => rl.latitude !== undefined && rl.longitude !== undefined
      );
      
      if (locatiesMetCoordinaten.length === 0) {
        return null;
      }
      
      // Bereken afstand naar alle locaties en vind de dichtstbijzijnde
      let nearest: { id: string; naam: string; distance: number } | null = null;
      let minDistance = Infinity;
      
      for (const rl of locatiesMetCoordinaten) {
        if (rl.latitude && rl.longitude) {
          const distance = calculateDistance(latitude, longitude, rl.latitude, rl.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = {
              id: rl.id,
              naam: rl.vestiging,
              distance: distance
            };
          }
        }
      }
      
      return nearest;
    } catch (error) {
      console.error('Error finding nearest Richting location:', error);
      return null;
    }
  };

  // Automatisch een standaardlocatie aanmaken voor een klant op basis van bedrijfsnaam (fallback)
  const autoCreateDefaultLocationForCustomer = async (cust: Customer) => {
    try {
      const query = `${cust.name}, Nederland`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Richting-Kennisbank/1.0'
          }
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (!data || data.length === 0) return;

      const result = data[0];
      const addr = result.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.state ||
        '';
      const addressLine = result.display_name || '';

      const newLoc: Location = {
        id: `loc_${Date.now()}`,
        customerId: cust.id,
        name: 'Hoofdkantoor',
        address: addressLine,
        city: city || 'Onbekend',
        employeeCount: undefined,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      };

      // Vind dichtstbijzijnde Richting locatie
      const nearest = await findNearestRichtingLocation(newLoc.latitude!, newLoc.longitude!);
      if (nearest) {
        newLoc.richtingLocatieId = nearest.id;
        newLoc.richtingLocatieNaam = nearest.naam;
        newLoc.richtingLocatieAfstand = nearest.distance;
      }

      await customerService.addLocation(newLoc);
      setLocations(prev => [...prev, newLoc]);

      if (newLoc.richtingLocatieNaam) {
        console.log(`✅ Automatische locatie toegevoegd: ${newLoc.address} (${newLoc.city}) → Richting: ${newLoc.richtingLocatieNaam}`);
      } else {
        console.log(`✅ Automatische locatie toegevoegd: ${newLoc.address} (${newLoc.city})`);
      }
    } catch (error) {
      console.warn('Automatisch locatie ophalen mislukt:', error);
    }
  };

  const displayLogoUrl = customer.logoUrl || getCompanyLogoUrl(customer.website);

  // Functie om PDF te genereren en toe te voegen aan Klantdossier
  const handleGeneratePDF = async () => {
    if (!organisatieProfiel) return;
    
    try {
      // Toon loading state
      const loadingAlert = alert('PDF wordt gegenereerd...');
      
      // Genereer PDF
      const pdfBlob = await generateOrganisatieProfielPDF(
        organisatieProfiel.organisatieNaam || customer.name,
        organisatieProfiel.analyseDatum,
        hoofdstukkenResultaten,
        organisatieProfiel.volledigRapport
      );

      // Upload naar Firebase Storage
      const fileName = `organisatie-profiel-${customer.id}-${Date.now()}.pdf`;
      const storageRef = ref(storage, `documents/${customer.id}/${fileName}`);
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // Maak document aan in Firestore
      const documentId = `doc_${Date.now()}`;
      const documentData: DocumentSource = {
        id: documentId,
        title: `Publiek Organisatie Profiel - ${organisatieProfiel.organisatieNaam || customer.name}`,
        content: organisatieProfiel.volledigRapport || Object.values(hoofdstukkenResultaten).join('\n\n'),
        originalUrl: downloadURL,
        type: DocType.PDF,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        customerId: customer.id,
        summary: `Publiek Organisatie Profiel analyse voor ${organisatieProfiel.organisatieNaam || customer.name}`,
        mainCategoryId: 'strategy',
        subCategoryId: 'management',
        tags: ['organisatie-profiel', 'analyse', 'publiek'],
        viewedBy: [],
        likedBy: [],
        isArchived: false
      };

      await dbService.addDocument(documentData);

      // Refresh documenten
      const refreshedDocs = await dbService.getDocumentsForCustomer(customer.id);
      setDocs(refreshedDocs);

      alert(`✅ PDF succesvol toegevoegd aan Klantdossier!\n\nBestand: ${fileName}`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`❌ Fout bij genereren PDF: ${error.message || 'Onbekende fout'}`);
    }
  };

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
       <div className="flex items-center justify-between mb-4">
         <button onClick={onBack} className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium">
           ← Terug naar overzicht
         </button>
         <button 
           onClick={loadData}
           className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium"
           title="Ververs data (locaties, contactpersonen, etc.)"
         >
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
           </svg>
           Ververs
         </button>
       </div>

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
                        value={customer.status || 'active'}
                        onChange={(e) => {
                          const newStatus = e.target.value as 'active' | 'prospect' | 'churned' | 'rejected';
                          handleChangeStatus(newStatus);
                        }}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-600 focus:ring-richting-orange focus:border-richting-orange cursor-pointer"
                    >
                        <option value="active">Actief</option>
                        <option value="prospect">Prospect</option>
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
                    <input 
                      type="number" 
                      placeholder="Aantal medewerkers (optioneel)" 
                      className="w-full text-sm border p-2 rounded" 
                      value={locEmployeeCount || ''} 
                      onChange={e => setLocEmployeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                      min="0"
                    />
                    <div className="flex gap-2 pt-2">
                       <button onClick={handleAddLocation} className="bg-richting-orange text-white text-xs px-3 py-2 rounded font-bold">Opslaan</button>
                       <button onClick={() => {
                         setIsAddingLoc(false);
                         setLocName(''); setLocAddress(''); setLocCity(''); setLocEmployeeCount(undefined);
                       }} className="text-gray-500 text-xs px-3 py-2">Annuleren</button>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-3">
               {locations.length === 0 && !isAddingLoc && (
                 <div className="text-sm text-gray-400 italic">
                   <p>Nog geen locaties toegevoegd.</p>
                   <p className="text-xs mt-1 text-gray-300">Tip: Start de Klantreis om automatisch locaties te vinden.</p>
                 </div>
               )}
               {locations.map(loc => (
                 <div key={loc.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm group hover:border-richting-orange transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex-1">
                          <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                          <p className="text-xs text-gray-500">{loc.address}, {loc.city}</p>
                          {loc.employeeCount ? (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-gray-600">👥</span>
                              <span className="text-xs font-semibold text-richting-orange">{loc.employeeCount.toLocaleString('nl-NL')} medewerkers</span>
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-gray-400 italic">👥 Geen medewerkersaantal opgegeven</span>
                            </div>
                          )}
                          {loc.richtingLocatieNaam && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs text-richting-orange font-medium">📍 Richtingvestiging:</span>
                              <span className="text-xs text-slate-700 font-semibold">{loc.richtingLocatieNaam}</span>
                              {loc.richtingLocatieAfstand !== undefined && (
                                <span className="text-xs text-gray-500">({loc.richtingLocatieAfstand.toFixed(1)} km)</span>
                              )}
                            </div>
                          )}
                       </div>
                       <div className="flex items-center gap-1">
                         <button
                           onClick={() => handleEditLocation(loc)}
                           className="text-gray-400 hover:text-richting-orange p-2 flex-shrink-0 transition-colors"
                           title="Bewerk locatie"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                           </svg>
                         </button>
                         <button
                           onClick={() => setDeletingLocation(loc)}
                           className="text-gray-400 hover:text-red-500 p-2 flex-shrink-0 transition-colors"
                           title="Verwijder locatie"
                         >
                           <TrashIcon />
                         </button>
                         <a 
                           href={getGoogleMapsLink(loc)} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-gray-400 hover:text-richting-orange p-2 flex-shrink-0 transition-colors"
                           title="Bekijk op kaart"
                         >
                           <MapIcon />
                         </a>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            
            {/* Edit Location Modal */}
            {editingLocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
                setEditingLocation(null);
                setEditLocEmployeeCount(undefined);
              }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Bewerk Locatie</h3>
                      <button
                        onClick={() => {
                          setEditingLocation(null);
                          setEditLocEmployeeCount(undefined);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm mb-1">{editingLocation.name}</p>
                        <p className="text-xs text-gray-500 mb-4">{editingLocation.address}, {editingLocation.city}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aantal medewerkers
                        </label>
                        <input
                          type="number"
                          placeholder="Voer aantal medewerkers in"
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-richting-orange focus:border-richting-orange"
                          value={editLocEmployeeCount || ''}
                          onChange={e => setEditLocEmployeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                          min="0"
                        />
                        {editingLocation.employeeCount && (
                          <p className="text-xs text-gray-500 mt-1">
                            Huidig: {editingLocation.employeeCount.toLocaleString('nl-NL')} medewerkers
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSaveLocationEdit}
                          className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={() => {
                            setEditingLocation(null);
                            setEditLocEmployeeCount(undefined);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Location Confirmation Modal */}
            {deletingLocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingLocation(null)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Locatie Verwijderen</h3>
                      <button
                        onClick={() => setDeletingLocation(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">
                          Weet je zeker dat je deze locatie wilt verwijderen?
                        </p>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-bold text-slate-800 text-sm">{deletingLocation.name}</p>
                          <p className="text-xs text-gray-500">{deletingLocation.address}, {deletingLocation.city}</p>
                          {deletingLocation.employeeCount && (
                            <p className="text-xs text-gray-500 mt-1">
                              {deletingLocation.employeeCount.toLocaleString('nl-NL')} medewerkers
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Deze actie kan niet ongedaan worden gemaakt.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleDeleteLocation}
                          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                        >
                          Verwijderen
                        </button>
                        <button
                          onClick={() => setDeletingLocation(null)}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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

       {/* KLANTREIS SECTION - Always visible, prominent call-to-action */}
       {onShowKlantreis && (
         <div className="pt-8 border-t border-gray-200 mt-8">
           <div className="bg-gradient-to-r from-richting-orange to-orange-600 rounded-xl p-6 text-white shadow-lg">
             <div className="flex items-start justify-between">
               <div className="flex-1">
                 <h3 className="font-bold text-xl mb-2">🚀 Klantreis</h3>
                 <p className="text-sm mb-4 opacity-90">
                   Verzamel informatie over de organisatie in 3 stappen: Organisatie Profiel, Risico Profiel en Cultuur Profiel.
                 </p>
                 {customer.klantreis && (
                   <div className="mb-4">
                     <p className="text-xs mb-2 opacity-90">Voortgang:</p>
                     <div className="flex gap-2 mb-2">
                       {customer.klantreis.levels.map((level) => (
                         <div
                           key={level.level}
                           className={`flex-1 h-2 rounded ${
                             level.status === 'completed' ? 'bg-white' :
                             level.status === 'in_progress' ? 'bg-yellow-200' :
                             'bg-white/30'
                           }`}
                           title={`Level ${level.level}: ${level.status === 'completed' ? 'Voltooid' : level.status === 'in_progress' ? 'Bezig' : 'Niet gestart'}`}
                         />
                       ))}
                     </div>
                     <div className="flex gap-2 text-xs">
                       {customer.klantreis.levels.map((level) => (
                         <span
                           key={level.level}
                           className={`px-2 py-1 rounded ${
                             level.status === 'completed' ? 'bg-white/20' :
                             level.status === 'in_progress' ? 'bg-yellow-200/20' :
                             'bg-white/10'
                           }`}
                         >
                           {level.level}: {level.status === 'completed' ? '✓' : level.status === 'in_progress' ? '...' : '○'}
                         </span>
                       ))}
                     </div>
                     <p className="text-xs mt-2 opacity-75">
                       {customer.klantreis.levels.filter(l => l.status === 'completed').length} / {customer.klantreis.levels.length} levels voltooid
                     </p>
                   </div>
                 )}
               </div>
               <button
                 onClick={onShowKlantreis}
                 className="ml-4 bg-white text-richting-orange px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors shadow-md flex-shrink-0"
               >
                 {customer.klantreis?.levels.some(l => l.status === 'in_progress' || l.status === 'completed') 
                   ? 'Ga naar Klantreis →' 
                   : 'Start Klantreis →'}
               </button>
             </div>
           </div>
         </div>
       )}

       {/* ORGANISATIE ANALYSE SECTION */}
       <div className="pt-8 border-t border-gray-200">
         <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold text-slate-900 text-lg">Organisatie Analyse</h3>
           <div className="flex gap-2">
             <button
               onClick={async () => {
                 setIsAnalyzingOrganisatie(true);
                 setOrganisatieAnalyseResultaat(null);
                 setAnalyseStap(0);
                 setHoofdstukkenResultaten({});
                 
                 try {
                   // Start stapsgewijze analyse
                   const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseBrancheStapsgewijs';
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       organisatieNaam: customer.name,
                       website: customer.website || '',
                       customerId: customer.id
                     })
                   });

                   if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                     throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
                   }

                   const data = await response.json();
                   const newAnalyseId = data.analyseId;
                   if (!newAnalyseId) {
                     throw new Error('Geen analyseId ontvangen van server');
                   }
                   setAnalyseId(newAnalyseId);
                   
                   // Poll for progress
                   const progressUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/getAnalyseProgress';
                   const pollInterval = setInterval(async () => {
                     try {
                       const progressResponse = await fetch(`${progressUrl}?analyseId=${newAnalyseId}`);
                       if (!progressResponse.ok) {
                         clearInterval(pollInterval);
                         return;
                       }
                       
                       const progress = await progressResponse.json();
                       
                       // Update progress
                       setAnalyseStap(progress.progress.huidigeStap || 0);
                       
                       // Update hoofdstukken resultaten
                       const nieuweResultaten: {[key: string]: string} = {};
                       Object.keys(progress.hoofdstukken || {}).forEach(key => {
                         const hoofdstuk = progress.hoofdstukken[key];
                         if (hoofdstuk.status === 'completed' && hoofdstuk.content) {
                           nieuweResultaten[key] = hoofdstuk.content;
                         }
                       });
                       setHoofdstukkenResultaten(nieuweResultaten);
                       
                       // Check if completed
                       if (progress.status === 'completed') {
                         clearInterval(pollInterval);
                         setIsAnalyzingOrganisatie(false);
                         
                         // AUTOMATISCH: Refresh documenten in Klantdossier
                         // Het document wordt automatisch aangemaakt door de backend
                         // We moeten de documenten opnieuw ophalen
                         try {
                           const refreshedDocs = await dbService.getDocumentsForCustomer(customer.id);
                           setDocs(refreshedDocs);
                           console.log('✅ Documenten gerefresht na voltooide analyse');
                         } catch (error) {
                           console.error('❌ Error refreshing documents:', error);
                         }
                         
                         // Show volledig rapport if available
                         if (progress.volledigRapport) {
                           setOrganisatieAnalyseResultaat(progress.volledigRapport);
                         } else {
                           // Combine all hoofdstukken
                           const combined = Object.keys(nieuweResultaten).sort().map(key => {
                             return `## Hoofdstuk ${key}: ${ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}\n\n${nieuweResultaten[key]}\n\n`;
                           }).join('');
                           setOrganisatieAnalyseResultaat(combined);
                         }
                         
                         // Reload organisatie profiel
                         const profiel = await customerService.getOrganisatieProfiel(customer.id);
                         if (profiel) {
                           setOrganisatieProfiel(profiel);
                         }
                       } else if (progress.status === 'failed') {
                         clearInterval(pollInterval);
                         setIsAnalyzingOrganisatie(false);
                         setOrganisatieAnalyseResultaat(`Fout bij analyse: ${progress.error || 'Onbekende fout'}`);
                       }
                     } catch (pollError) {
                       console.error("Error polling progress:", pollError);
                     }
                   }, 2000); // Poll every 2 seconds
                   
                   // Cleanup on unmount
                   return () => clearInterval(pollInterval);
                 } catch (error: any) {
                   console.error("Organisatie analyse error:", error);
                   setOrganisatieAnalyseResultaat(`Fout bij starten analyse: ${error.message || 'Onbekende fout'}`);
                   setIsAnalyzingOrganisatie(false);
                 }
               }}
               disabled={isAnalyzingOrganisatie}
               className="bg-richting-orange text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingOrganisatie ? "⏳ Analyseren..." : "📊 Publiek Organisatie Profiel"}
             </button>
             <button
               onClick={async () => {
                 setIsAnalyzingCultuur(true);
                 setCultuurAnalyseResultaat(null);
                 setCultuurAnalyseStap(0);
                 
                 // Start progress steps for cultuur analyse
                 const cultuurStappen = [
                   "CultuurDNA Analyse",
                   "Cultuurvolwassenheid Assessment",
                   "Performance & Engagement Analyse",
                   "Gaps & Barrières Identificatie",
                   "Opportuniteiten & Thema's",
                   "Gedragingen Analyse",
                   "Interventies & Actieplan",
                   "Risico's Psychosociale Arbeidsbelasting",
                   "Aanbevelingen Formulering",
                   "Prioriteitsmatrix Opstellen",
                   "Rapportage Genereren",
                   "Resultaat Opslaan"
                 ];
                 
                 // Simulate progress through steps
                 const stepInterval = setInterval(() => {
                   setCultuurAnalyseStap(prev => {
                     if (prev >= 12) {
                       clearInterval(stepInterval);
                       return 12;
                     }
                     return prev + 1;
                   });
                 }, 2000); // Update every 2 seconds
                 
                 try {
                   // Use Firebase Function to get active prompt from Firestore
                   const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseCultuurTest';
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       organisatieNaam: customer.name,
                       website: customer.website || ''
                     })
                   });

                   if (!response.ok) {
                     throw new Error(`HTTP error! status: ${response.status}`);
                   }

                   const data = await response.json();
                   
                   // The Firebase Function returns JSON with the full cultuur profiel
                   // Use volledigRapport if available, otherwise format the JSON
                   let result = '';
                   if (data.volledigRapport) {
                     result = data.volledigRapport;
                   } else {
                     // Format as markdown
                     result = `# Cultuur Analyse Resultaat\n\n`;
                     if (data.scores) {
                       result += `## The Executive Pulse\n\n`;
                       result += `- Cultuurvolwassenheid: ${data.scores.cultuurvolwassenheid || 0}/100\n`;
                       result += `- Groeidynamiek: ${data.scores.groeidynamiekScore || 0}/100\n`;
                       result += `- Cultuurfit: ${data.scores.cultuurfit || 0}/100\n`;
                       result += `- Cultuursterkte: ${data.scores.cultuursterkte || 'gemiddeld'}\n`;
                       result += `- Dynamiek Type: ${data.scores.dynamiekType || 'organisch_groeiend'}\n\n`;
                     }
                     if (data.dna) {
                       result += `## Het Cultuur DNA\n\n`;
                       result += `- Dominant Type: ${data.dna.dominantType || 'hybride'}\n`;
                       if (data.dna.kernwaarden && data.dna.kernwaarden.length > 0) {
                         result += `\n### Kernwaarden:\n`;
                         data.dna.kernwaarden.forEach((kw: any) => {
                           result += `- ${kw.waarde}: ${kw.score || 0}/100 (${kw.status || 'neutraal'})\n`;
                         });
                       }
                     }
                     if (data.gaps && data.gaps.length > 0) {
                       result += `\n## Gaps & Barrières\n\n`;
                       data.gaps.forEach((gap: any) => {
                         result += `- ${gap.dimensie}: Gap van ${gap.gap || 0} (Urgentie: ${gap.urgentie || 'gemiddeld'})\n`;
                       });
                     }
                     if (data.interventies && data.interventies.length > 0) {
                       result += `\n## Interventies & Actieplan\n\n`;
                       data.interventies.forEach((int: any) => {
                         result += `- ${int.naam} (${int.type || 'strategisch'}): ${int.beschrijving || ''}\n`;
                       });
                     }
                   }
                   
                   clearInterval(stepInterval);
                   setCultuurAnalyseStap(12); // Mark all steps as complete
                   setCultuurAnalyseResultaat(result);
                   
                   // Save to Firestore as CultuurProfiel (if we have a collection for this)
                   // Note: This might need to be added to customerService if not already present
                 } catch (error) {
                   clearInterval(stepInterval);
                   console.error("Cultuur analyse error:", error);
                   setCultuurAnalyseResultaat("Fout bij analyse. Probeer het opnieuw.");
                   setCultuurAnalyseStap(0);
                 } finally {
                   setIsAnalyzingCultuur(false);
                 }
               }}
               disabled={isAnalyzingCultuur}
               className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingCultuur ? "⏳ Analyseren..." : "🎭 Cultuur Analyse"}
             </button>
             <button
               onClick={async () => {
                 setIsAnalyzingRisico(true);
                 setRisicoProfielData(null);
                 
                 try {
                   const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseRisicoProfiel';
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       customerId: customer.id,
                       organisatieNaam: customer.name,
                       website: customer.website || '',
                       userId: user.id
                     })
                   });

                   if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                     throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                   }

                   const data = await response.json();
                   
                   if (data.success) {
                     // Reload data from Firestore
                     const [processen, functies, stoffen, risicos] = await Promise.all([
                       processService.getProcessesByCustomer(customer.id),
                       functionService.getFunctionsByCustomer(customer.id),
                       substanceService.getSubstancesByCustomer(customer.id),
                       getRisksByCustomer(customer.id)
                     ]);
                     
                     setRisicoProfielData({
                       processen,
                       functies,
                       stoffen,
                       risicos
                     });
                     
                     alert(`✅ Risico profiel analyse voltooid!\n\n${data.summary.processen} processen\n${data.summary.functies} functies\n${data.summary.stoffen} stoffen\n${data.summary.risicos} risico's`);
                   } else {
                     throw new Error(data.error || 'Onbekende fout');
                   }
                 } catch (error: any) {
                   console.error("Risico analyse error:", error);
                   alert(`❌ Fout bij risico analyse: ${error.message || 'Onbekende fout'}`);
                 } finally {
                   setIsAnalyzingRisico(false);
                 }
               }}
               disabled={isAnalyzingRisico}
               className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingRisico ? "⏳ Analyseren..." : "⚠️ Risico Profiel"}
             </button>
           </div>
         </div>

         {/* Analyse Progress Steps */}
         {isAnalyzingOrganisatie && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <span className="animate-spin">⏳</span> Analyse in uitvoering...
             </h4>
             <div className="space-y-3">
               {ORGANISATIE_ANALYSE_HOOFDSTUKKEN_ARRAY.map((stap, index) => {
                 const stapNummer = index + 1;
                 const isVoltooid = analyseStap > stapNummer;
                 const isHuidige = analyseStap === stapNummer;
                 
                 return (
                   <div 
                     key={index}
                     className={`flex items-center gap-3 p-2 rounded transition-colors ${
                       isHuidige ? 'bg-orange-50 border border-orange-200' : ''
                     }`}
                   >
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                       isVoltooid 
                         ? 'bg-green-500 text-white' 
                         : isHuidige 
                         ? 'bg-richting-orange text-white animate-pulse' 
                         : 'bg-gray-200 text-gray-400'
                     }`}>
                       {isVoltooid ? (
                         <span className="text-xs font-bold">✓</span>
                       ) : isHuidige ? (
                         <span className="text-xs font-bold animate-spin">⟳</span>
                       ) : (
                         <span className="text-xs font-bold">{stapNummer}</span>
                       )}
                     </div>
                     <span className={`text-sm ${
                       isVoltooid 
                         ? 'text-gray-600 line-through' 
                         : isHuidige 
                         ? 'text-richting-orange font-bold' 
                         : 'text-gray-400'
                     }`}>
                       {stapNummer}. {stap}
                     </span>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>Voortgang: {analyseStap} van 13 stappen</span>
                 <div className="w-32 bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-richting-orange h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(analyseStap / 13) * 100}%` }}
                   ></div>
                 </div>
               </div>
             </div>
             
             {/* Tussentijds Resultaten per Hoofdstuk */}
             {Object.keys(hoofdstukkenResultaten).length > 0 && (
               <div className="mt-4 pt-4 border-t border-gray-200">
                 <h5 className="text-sm font-bold text-slate-900 mb-3">Tussentijds Resultaten:</h5>
                 <div className="space-y-3 max-h-96 overflow-y-auto">
                   {Object.keys(hoofdstukkenResultaten).sort().map(key => {
                     return (
                       <div key={key} className="bg-green-50 border border-green-200 rounded p-3">
                         <h6 className="text-xs font-bold text-green-700 mb-1">
                           ✅ Hoofdstuk {key}: {ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}
                         </h6>
                         <p className="text-xs text-gray-600 line-clamp-3">
                           {hoofdstukkenResultaten[key].substring(0, 200)}...
                         </p>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
           </div>
         )}

         {/* Analyse Resultaten - Verbeterde Layout */}
         {organisatieAnalyseResultaat && (
           <div className="bg-white border border-orange-200 rounded-xl shadow-lg p-6 mb-4">
             <div className="flex items-center justify-between mb-4">
               <h4 className="font-bold text-richting-orange text-xl flex items-center gap-2">📊 Publiek Organisatie Profiel Resultaat</h4>
               {organisatieProfiel && (
                 <button
                   onClick={handleGeneratePDF}
                   className="px-4 py-2 bg-richting-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                 >
                   📄 PDF Toevoegen aan Dossier
                 </button>
               )}
             </div>
             
             {/* Per Hoofdstuk Weergave */}
             {Object.keys(hoofdstukkenResultaten).length > 0 ? (
               <div className="space-y-6">
                 {Object.keys(hoofdstukkenResultaten).sort((a, b) => parseInt(a) - parseInt(b)).map((key) => {
                   return (
                     <div key={key} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200 shadow-sm">
                       <h5 className="text-xl font-bold text-richting-orange mb-4 pb-2 border-b-2 border-richting-orange">
                         Hoofdstuk {key}: {ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}
                       </h5>
                       <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                         <ReactMarkdown>{hoofdstukkenResultaten[key]}</ReactMarkdown>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border-2 border-gray-200">
                 <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                   <ReactMarkdown>{organisatieAnalyseResultaat}</ReactMarkdown>
                 </div>
               </div>
             )}
           </div>
         )}

         {/* Cultuur Analyse Progress Steps */}
         {isAnalyzingCultuur && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <span className="animate-spin">⏳</span> Cultuur Analyse in uitvoering...
             </h4>
             <div className="space-y-3">
               {[
                 "CultuurDNA Analyse",
                 "Cultuurvolwassenheid Assessment",
                 "Performance & Engagement Analyse",
                 "Gaps & Barrières Identificatie",
                 "Opportuniteiten & Thema's",
                 "Gedragingen Analyse",
                 "Interventies & Actieplan",
                 "Risico's Psychosociale Arbeidsbelasting",
                 "Aanbevelingen Formulering",
                 "Prioriteitsmatrix Opstellen",
                 "Rapportage Genereren",
                 "Resultaat Opslaan"
               ].map((stap, index) => {
                 const stapNummer = index + 1;
                 const isVoltooid = cultuurAnalyseStap > stapNummer;
                 const isHuidige = cultuurAnalyseStap === stapNummer;
                 
                 return (
                   <div 
                     key={index}
                     className={`flex items-center gap-3 p-2 rounded transition-colors ${
                       isHuidige ? 'bg-slate-50 border border-slate-200' : ''
                     }`}
                   >
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                       isVoltooid 
                         ? 'bg-green-500 text-white' 
                         : isHuidige 
                         ? 'bg-slate-700 text-white animate-pulse' 
                         : 'bg-gray-200 text-gray-400'
                     }`}>
                       {isVoltooid ? (
                         <span className="text-xs font-bold">✓</span>
                       ) : isHuidige ? (
                         <span className="text-xs font-bold animate-spin">⟳</span>
                       ) : (
                         <span className="text-xs font-bold">{stapNummer}</span>
                       )}
                     </div>
                     <span className={`text-sm ${
                       isVoltooid 
                         ? 'text-gray-600 line-through' 
                         : isHuidige 
                         ? 'text-slate-700 font-bold' 
                         : 'text-gray-400'
                     }`}>
                       {stapNummer}. {stap}
                     </span>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>Voortgang: {cultuurAnalyseStap} van 12 stappen</span>
                 <div className="w-32 bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-slate-700 h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(cultuurAnalyseStap / 12) * 100}%` }}
                   ></div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {cultuurAnalyseResultaat && (
           <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
             <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">🎭 Cultuur Analyse Resultaat</h4>
             <p className="text-sm text-gray-700 whitespace-pre-wrap">{cultuurAnalyseResultaat}</p>
           </div>
         )}

         {/* Risico Profiel Data Display */}
         {risicoProfielData && (
           <div className="bg-white border border-red-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-red-700 mb-4 flex items-center gap-2">⚠️ Risico Profiel</h4>
             
             {/* Tabs */}
             <div className="flex gap-2 mb-4 border-b border-gray-200">
               {(['overview', 'processen', 'functies', 'stoffen', 'risicos'] as const).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveRisicoTab(tab)}
                   className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                     activeRisicoTab === tab
                       ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                       : 'text-gray-600 hover:text-red-600'
                   }`}
                 >
                   {tab === 'overview' ? '📊 Overzicht' : 
                    tab === 'processen' ? `⚙️ Processen (${risicoProfielData.processen.length})` :
                    tab === 'functies' ? `👥 Functies (${risicoProfielData.functies.length})` :
                    tab === 'stoffen' ? `🧪 Stoffen (${risicoProfielData.stoffen.length})` :
                    `⚠️ Risico's (${risicoProfielData.risicos.length})`}
                 </button>
               ))}
             </div>
             
             {/* Tab Content */}
             <div className="mt-4">
               {activeRisicoTab === 'overview' && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-blue-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Processen</p>
                     <p className="text-2xl font-bold text-blue-700">{risicoProfielData.processen.length}</p>
                   </div>
                   <div className="bg-green-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Functies</p>
                     <p className="text-2xl font-bold text-green-700">{risicoProfielData.functies.length}</p>
                   </div>
                   <div className="bg-yellow-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Stoffen</p>
                     <p className="text-2xl font-bold text-yellow-700">{risicoProfielData.stoffen.length}</p>
                   </div>
                   <div className="bg-red-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Risico's</p>
                     <p className="text-2xl font-bold text-red-700">{risicoProfielData.risicos.length}</p>
                   </div>
                 </div>
               )}
               
               {activeRisicoTab === 'processen' && (
                 <div className="space-y-3">
                   {risicoProfielData.processen.map(proc => (
                     <div key={proc.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{proc.name}</h5>
                       {proc.description && <p className="text-sm text-gray-600 mt-1">{proc.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'functies' && (
                 <div className="space-y-3">
                   {risicoProfielData.functies.map(func => (
                     <div key={func.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{func.name}</h5>
                       {func.department && <p className="text-xs text-gray-500">{func.department}</p>}
                       {func.description && <p className="text-sm text-gray-600 mt-1">{func.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'stoffen' && (
                 <div className="space-y-3">
                   {risicoProfielData.stoffen.map(stof => (
                     <div key={stof.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{stof.name}</h5>
                       {stof.casNumber && <p className="text-xs text-gray-500">CAS: {stof.casNumber}</p>}
                       {stof.hazardPhrases && stof.hazardPhrases.length > 0 && (
                         <p className="text-xs text-red-600 mt-1">H-zinnen: {stof.hazardPhrases.join(', ')}</p>
                       )}
                       {stof.description && <p className="text-sm text-gray-600 mt-1">{stof.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'risicos' && (
                 <div className="space-y-3">
                   {risicoProfielData.risicos.map(risico => (
                     <div key={risico.id} className={`border rounded-lg p-4 ${
                       risico.calculatedScore >= 400 ? 'border-red-500 bg-red-50' :
                       risico.calculatedScore >= 200 ? 'border-orange-500 bg-orange-50' :
                       risico.calculatedScore >= 100 ? 'border-yellow-500 bg-yellow-50' :
                       'border-gray-200 bg-gray-50'
                     }`}>
                       <div className="flex items-start justify-between">
                         <div>
                           <h5 className="font-bold text-gray-800">{risico.riskName}</h5>
                           <p className="text-xs text-gray-500 mt-1">
                             Score: {risico.calculatedScore} | 
                             Prioriteit: {risico.prioriteit} | 
                             Kans: {risico.probability} | 
                             Effect: {risico.effect} | 
                             Blootstelling: {risico.exposure}
                           </p>
                         </div>
                         <span className={`px-2 py-1 rounded text-xs font-bold ${
                           risico.prioriteit === 'Zeer hoog' ? 'bg-red-600 text-white' :
                           risico.prioriteit === 'Hoog' ? 'bg-orange-500 text-white' :
                           risico.prioriteit === 'Middel' ? 'bg-yellow-500 text-white' :
                           'bg-gray-400 text-white'
                         }`}>
                           {risico.prioriteit}
                         </span>
                       </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
         )}

         {organisatieProfiel && (
           <>
             {/* Header met Organisatie Info */}
             <div className="bg-gradient-to-r from-richting-orange to-orange-600 rounded-xl shadow-lg p-6 mb-6 text-white">
               <div className="flex items-center justify-between mb-4">
                 <div>
                   <h3 className="text-2xl font-bold mb-1">Publiek Organisatie Profiel</h3>
                   <p className="text-orange-100 text-sm">{organisatieProfiel.organisatieNaam || customer.name}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-orange-100 mb-1">Analyse Datum</p>
                   <p className="text-sm font-bold">{new Date(organisatieProfiel.analyseDatum).toLocaleDateString('nl-NL')}</p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-400/30">
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Risico's</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.risicos?.length || 0}</p>
                 </div>
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Processen</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.processen?.length || 0}</p>
                 </div>
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Functies</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.functies?.length || 0}</p>
                 </div>
               </div>
             </div>

           {/* Risico's Overzicht */}
           {organisatieProfiel.risicos && organisatieProfiel.risicos.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
               <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <span className="text-2xl">⚠️</span> Risico Overzicht
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 {['psychisch', 'fysiek', 'overige'].map(cat => {
                   const risicosInCat = organisatieProfiel.risicos.filter(r => r.categorie === cat);
                   const gemiddeldeRisico = risicosInCat.length > 0
                     ? risicosInCat.reduce((sum, r) => {
                         // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                         const kans = r.kans;
                         const effect = r.effect;
                         return sum + (kans * effect);
                       }, 0) / risicosInCat.length
                     : 0;
                   const categorieLabels = { 'psychisch': 'Psychisch', 'fysiek': 'Fysiek', 'overige': 'Overige' };
                   const categorieColors = {
                     'psychisch': 'bg-purple-100 text-purple-700 border-purple-200',
                     'fysiek': 'bg-blue-100 text-blue-700 border-blue-200',
                     'overige': 'bg-gray-100 text-gray-700 border-gray-200'
                   };
                   return (
                     <div key={cat} className={`p-4 rounded-lg border-2 ${categorieColors[cat as keyof typeof categorieColors]}`}>
                       <p className="text-sm font-bold mb-2">{categorieLabels[cat as keyof typeof categorieLabels]}</p>
                       <p className="text-3xl font-bold mb-1">{risicosInCat.length}</p>
                       <p className="text-xs opacity-75">Gemiddeld risico: {Math.round(gemiddeldeRisico)}</p>
                     </div>
                   );
                 })}
               </div>
               <div className="space-y-2 max-h-64 overflow-y-auto">
                 {organisatieProfiel.risicos
                   .map(risico => {
                     // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                     const kans = risico.kans;
                     const effect = risico.effect;
                     const risicogetal = kans * effect;
                     const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                     return { risico, kans, effect, risicogetal, prioriteitNiveau };
                   })
                   .sort((a, b) => b.risicogetal - a.risicogetal)
                   .slice(0, 10)
                   .map(({ risico, kans, effect, risicogetal, prioriteitNiveau }) => {
                     const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                     const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                     const categorieColors = {
                       'psychisch': 'bg-purple-50 text-purple-700',
                       'fysiek': 'bg-blue-50 text-blue-700',
                       'overige': 'bg-gray-50 text-gray-700'
                     };
                     return (
                       <div key={risico.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-richting-orange transition-colors">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                               {risico.categorie}
                             </span>
                             <span className="text-sm font-bold text-slate-900">{risico.naam}</span>
                           </div>
                           <div className="flex items-center gap-4 text-xs text-gray-500">
                             <span>Kans: {kans}</span>
                             <span>Effect: {effect}</span>
                             <span className="font-bold text-slate-700">Risico: {risicogetal}</span>
                           </div>
                         </div>
                         <span className={`px-3 py-1 rounded text-xs font-bold border ${prioriteitColors[prioriteitNiveau - 1]}`}>
                           {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                         </span>
                       </div>
                     );
                   })}
               </div>
             </div>
           )}

           {/* Processen en Functies Overzicht */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* Processen */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚙️</span> Processen ({organisatieProfiel.processen?.length || 0})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(organisatieProfiel.processen || [])
                  .map(proces => {
                    try {
                      const risicos = proces.risicos || [];
                      // Bereken prioriteit voor dit proces
                      const risicosMetBerekening = risicos.map(item => {
                        const risico = item.risico || (organisatieProfiel.risicos || []).find(r => r.id === item.risicoId);
                        if (!risico) return null;
                        const blootstelling = item.blootstelling || 3;
                        // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                        const kans = risico.kans;
                        const effect = risico.effect;
                        const risicogetal = blootstelling * kans * effect;
                        return { risico, blootstelling, kans, effect, risicogetal };
                      }).filter(Boolean);
                      const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                        ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                        : 0;
                      const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                      return { proces, prioriteitNiveau, risicos };
                    } catch (error) {
                      console.error(`Error processing proces ${proces.id}:`, error);
                      return { proces, prioriteitNiveau: 5, risicos: [] };
                    }
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ proces, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={proces.id} 
                        onClick={() => setSelectedProces(proces)}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-richting-orange hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-base text-slate-900 group-hover:text-richting-orange transition-colors">{proces.naam}</h5>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{proces.beschrijving}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ml-3 flex-shrink-0 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-richting-orange">⚠️</span> {risicos.length} risico{risicos.length !== 1 ? "'s" : ""}
                          </span>
                          <span className="text-xs text-richting-orange font-medium group-hover:underline">Details bekijken →</span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>

             {/* Functies */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span> Functies ({organisatieProfiel.functies?.length || 0})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(organisatieProfiel.functies || [])
                  .map(functie => {
                    try {
                      const risicos = functie.risicos || [];
                      // Bereken prioriteit voor deze functie
                      const risicosMetBerekening = risicos.map(item => {
                        const risico = item.risico || (organisatieProfiel.risicos || []).find(r => r.id === item.risicoId);
                        if (!risico) return null;
                        const blootstelling = item.blootstelling || 3;
                        // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                        const kans = risico.kans;
                        const effect = risico.effect;
                        const risicogetal = blootstelling * kans * effect;
                        return { risico, blootstelling, kans, effect, risicogetal };
                      }).filter(Boolean);
                      const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                        ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                        : 0;
                      const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                      return { functie, prioriteitNiveau, risicos };
                    } catch (error) {
                      console.error(`Error processing functie ${functie.id}:`, error);
                      return { functie, prioriteitNiveau: 5, risicos: [] };
                    }
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ functie, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={functie.id} 
                        onClick={async () => {
                          setSelectedFunctie(functie);
                          // Haal risico's op voor deze functie
                          try {
                            const functieRisicos = await getRisksByFunction(functie.id);
                            setSelectedFunctieRisicos(functieRisicos);
                            console.log(`✅ ${functieRisicos.length} risico's opgehaald voor functie ${functie.naam}`);
                          } catch (error) {
                            console.error('❌ Error loading risks for function:', error);
                            setSelectedFunctieRisicos([]);
                          }
                        }}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-richting-orange hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-base text-slate-900 group-hover:text-richting-orange transition-colors">{functie.naam}</h5>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{functie.beschrijving}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ml-3 flex-shrink-0 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                        {functie.fysiek !== undefined && functie.psychisch !== undefined && (
                          <div className="flex items-center gap-4 mt-2 mb-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">💪 Fysiek:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={`w-3 h-3 rounded-full ${i <= functie.fysiek ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-blue-600 ml-1">{functie.fysiek}/5</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">🧠 Psychisch:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={`w-3 h-3 rounded-full ${i <= functie.psychisch ? 'bg-purple-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-purple-600 ml-1">{functie.psychisch}/5</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-richting-orange">⚠️</span> {functieRisicoCounts[functie.id] ?? risicos.length} risico{(functieRisicoCounts[functie.id] ?? risicos.length) !== 1 ? "'s" : ""}
                          </span>
                          <span className="text-xs text-richting-orange font-medium group-hover:underline">Details bekijken →</span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
           </div>

           {/* Volledig Rapport - Verbeterde Layout met Markdown */}
           {organisatieProfiel.volledigRapport && (
             <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
               <div className="flex items-center justify-between mb-6">
                 <h4 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                   <span className="text-3xl">📄</span> Volledig Rapport
                 </h4>
                 <div className="flex gap-2">
                   <button
                     onClick={handleGeneratePDF}
                     className="px-4 py-2 bg-richting-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                   >
                     📄 PDF Toevoegen aan Dossier
                   </button>
                   <button
                     onClick={() => {
                       const printWindow = window.open('', '_blank');
                       if (printWindow) {
                         printWindow.document.write(`
                           <!DOCTYPE html>
                           <html>
                             <head>
                               <title>Organisatie Profiel - ${organisatieProfiel.organisatieNaam || customer.name}</title>
                               <style>
                                 body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #1a202c; }
                                 h1 { color: #F36F21; border-bottom: 3px solid #F36F21; padding-bottom: 10px; }
                                 h2 { color: #2d3748; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                                 h3 { color: #4a5568; margin-top: 20px; }
                                 table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                                 th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                 th { background-color: #f7fafc; font-weight: bold; }
                                 .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                               </style>
                             </head>
                             <body>
                               ${organisatieProfiel.volledigRapport.replace(/\n/g, '<br>')}
                             </body>
                           </html>
                         `);
                         printWindow.document.close();
                         setTimeout(() => printWindow.print(), 250);
                       }
                     }}
                     className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                   >
                     🖨️ Print / Export
                   </button>
                 </div>
               </div>
               <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 border-2 border-gray-200 shadow-inner">
                 <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                   <ReactMarkdown>{organisatieProfiel.volledigRapport}</ReactMarkdown>
                 </div>
               </div>
             </div>
           )}

           {/* Detail Modal voor Proces of Functie */}
           {(selectedProces || selectedFunctie) && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                 <div className="bg-gradient-to-r from-richting-orange to-orange-600 px-6 py-4 flex justify-between items-center">
                   <h3 className="font-bold text-white text-lg">
                     {selectedProces ? `⚙️ Proces: ${selectedProces.naam}` : `👥 Functie: ${selectedFunctie?.naam}`}
                   </h3>
                   <button 
                     onClick={() => { 
                       setSelectedProces(null); 
                       setSelectedFunctie(null);
                       setSelectedFunctieRisicos([]);
                     }}
                     className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                   >
                     ✕
                   </button>
                 </div>
                 <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                   {selectedProces && (
                     <>
                       <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                         <p className="text-sm text-gray-700 leading-relaxed">{selectedProces.beschrijving}</p>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                         <span>⚠️</span> Risico's ({selectedProces.risicos?.length || 0})
                       </h4>
                       <div className="overflow-x-auto border border-gray-200 rounded-lg">
                         <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                             <tr>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risico</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Categorie</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Blootstelling (B)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kans (W)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Effect (E)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risicogetal (R)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Prioriteit</th>
                             </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                             {selectedProces.risicos
                               ?.map((item, idx) => {
                                 const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                 if (!risico) return null;
                                 const blootstelling = item.blootstelling || 3;
                                 // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                 const kans = risico.kans;
                                 const effect = risico.effect;
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
                                 const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                                 const categorieColors = {
                                   'fysiek': 'bg-blue-50 text-blue-700',
                                   'psychisch': 'bg-purple-50 text-purple-700',
                                   'overige': 'bg-gray-50 text-gray-700'
                                 };
                                 
                                 return (
                                   <tr key={data.idx} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-4 py-3 text-sm font-medium text-gray-900">{risico.naam}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                                         {risico.categorie}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{blootstelling}</td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{kans}</td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{effect}</td>
                                     <td className="px-4 py-3 text-sm font-bold text-richting-orange">{risicogetal}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                         {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                       </span>
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                           <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50">
                             <tr>
                               <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal Risicogetal:</td>
                               <td className="px-4 py-3 text-sm font-bold text-richting-orange text-lg">
                                 {selectedProces.risicos
                                   ?.map(item => {
                                     const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                     if (!risico) return 0;
                                     const blootstelling = item.blootstelling || 3;
                                     // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                     const kans = risico.kans;
                                     const effect = risico.effect;
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
                       <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded mb-6">
                         <p className="text-sm text-gray-700 leading-relaxed">{selectedFunctie.beschrijving}</p>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                         <span>📊</span> Functiebelasting
                       </h4>
                       <div className="mb-6 grid grid-cols-2 gap-4">
                         <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                           <span className="text-xs text-gray-600 font-medium block mb-2">💪 Fysieke Belasting</span>
                           <div className="flex items-center gap-3">
                             <div className="flex gap-1">
                               {[1, 2, 3, 4, 5].map(i => (
                                 <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= (selectedFunctie.fysiek || 0) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                   {i}
                                 </div>
                               ))}
                             </div>
                             <p className="text-3xl font-bold text-blue-600">{selectedFunctie.fysiek || 0}/5</p>
                           </div>
                         </div>
                         <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                           <span className="text-xs text-gray-600 font-medium block mb-2">🧠 Psychische Belasting</span>
                           <div className="flex items-center gap-3">
                             <div className="flex gap-1">
                               {[1, 2, 3, 4, 5].map(i => (
                                 <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= (selectedFunctie.psychisch || 0) ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                   {i}
                                 </div>
                               ))}
                             </div>
                             <p className="text-3xl font-bold text-purple-600">{selectedFunctie.psychisch || 0}/5</p>
                           </div>
                         </div>
                       </div>
                      {(() => {
                        const risicoRows =
                          (selectedFunctieRisicos.length > 0
                            ? selectedFunctieRisicos.map((risk, idx) => ({
                                key: risk.id || idx,
                                naam: risk.riskName,
                                categorie: risk.category || 'Overige',
                                blootstelling: risk.exposure ?? 3,
                                kans: risk.probability ?? 3,
                                effect: risk.effect ?? 3,
                                score: risk.calculatedScore ?? ((risk.exposure ?? 3) * (risk.probability ?? 3) * (risk.effect ?? 3))
                              }))
                            : (selectedFunctie?.risicos || []).map((item, idx) => {
                                const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                if (!risico) return null;
                                const blootstelling = item.blootstelling || 3;
                                // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                const kans = risico.kans;
                                const effect = risico.effect;
                                const score = blootstelling * kans * effect;
                                return {
                                  key: risico.id || idx,
                                  naam: risico.naam,
                                  categorie: risico.categorie || 'Overige',
                                  blootstelling,
                                  kans,
                                  effect,
                                  score
                                };
                              }).filter(Boolean)) as Array<{
                                key: string | number;
                                naam: string;
                                categorie: string;
                                blootstelling: number;
                                kans: number;
                                effect: number;
                                score: number;
                              }>;

                        const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                        const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                        const categorieColors: {[key: string]: string} = {
                          'Fysiek': 'bg-blue-100 text-blue-700',
                          'Psychisch': 'bg-purple-100 text-purple-700',
                          'Chemisch': 'bg-orange-100 text-orange-700',
                          'Biologisch': 'bg-green-100 text-green-700',
                          'Ergonomisch': 'bg-yellow-100 text-yellow-700',
                          'Overige': 'bg-gray-100 text-gray-700'
                        };

                        return (
                          <>
                            <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                              <span>⚠️</span> Risico's ({risicoRows.length})
                            </h4>
                            {risicoRows.length === 0 ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                <p className="text-gray-500 text-sm">Geen risico's gekoppeld aan deze functie.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risico</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Categorie</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Blootstelling (B)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kans (W)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Effect (E)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risicogetal (R)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Prioriteit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {risicoRows.map((risk, idx) => {
                                      const prioriteitNiveau = risk.score >= 400 ? 1 : risk.score >= 200 ? 2 : risk.score >= 100 ? 3 : risk.score >= 50 ? 4 : 5;
                                      return (
                                        <tr key={risk.key ?? idx} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{risk.naam}</td>
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risk.categorie] || categorieColors['Overige']}`}>
                                              {risk.categorie}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.blootstelling}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.kans}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.effect}</td>
                                          <td className="px-4 py-3 text-sm font-bold text-richting-orange">{risk.score}</td>
                                          <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                              {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50">
                                    <tr>
                                      <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal Risicogetal:</td>
                                      <td className="px-4 py-3 text-sm font-bold text-richting-orange text-lg">
                                        {risicoRows.reduce((sum, risk) => sum + (risk.score || 0), 0)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </>
                        );
                      })()}
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
  const [newWebsite, setNewWebsite] = useState('');
  
  // Website Search State
  const [isSearchingWebsite, setIsSearchingWebsite] = useState(false);
  const [websiteResults, setWebsiteResults] = useState<Array<{url: string, title: string, snippet: string, confidence: string}>>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const custs = await customerService.getCustomersForUser(user.id, user.role);
      const users = await authService.getAllUsers();
      setCustomers(custs);
      setAllUsers(users);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const searchWebsite = useCallback(async (companyName: string) => {
    if (!companyName.trim()) {
      return;
    }

    setIsSearchingWebsite(true);
    setWebsiteResults([]);
    setSelectedWebsite('');
    setHasSearched(false);

    try {
      // Call Firebase Function to search for website
      const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/searchCompanyWebsite';
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const websites = data.websites || [];
      
      setWebsiteResults(websites);
      setHasSearched(true);
      
      // Auto-select best match (first result)
      if (websites.length > 0) {
        setSelectedWebsite(websites[0].url);
        setNewWebsite(websites[0].url.replace(/^https?:\/\//, ''));
      }
    } catch (error) {
      console.error("Error searching website:", error);
      setHasSearched(true);
      setWebsiteResults([]);
    } finally {
      setIsSearchingWebsite(false);
    }
  }, []);

  // Auto-search when name changes (with debounce)
  useEffect(() => {
    if (!newName.trim() || !showAddModal) {
      setWebsiteResults([]);
      setSelectedWebsite('');
      setNewWebsite('');
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchWebsite(newName);
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newName, showAddModal, searchWebsite]);

  const handleAddCustomer = async () => {
    if (!newName) {
      alert("Voer een bedrijfsnaam in");
      return;
    }
    
    if (!selectedWebsite && !newWebsite) {
      alert("Selecteer een website of voer handmatig een website in");
      return;
    }
    
    // Use selected website or manually entered website
    const websiteToUse = selectedWebsite || newWebsite;
    
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: newName,
      industry: '', // Empty by default
      website: websiteToUse ? ensureUrl(websiteToUse) : undefined,
      logoUrl: undefined,
      status: 'prospect', // Start as prospect
      assignedUserIds: [user.id], // Only current user by default
      createdAt: new Date().toISOString(),
      klantreis: {
        levels: [
          { level: 1 as const, name: 'Publiek Organisatie Profiel', status: 'not_started' as const },
          { level: 2 as const, name: 'Publiek Risico Profiel', status: 'not_started' as const },
          { level: 3 as const, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
        ],
        lastUpdated: new Date().toISOString()
      }
    };

    await customerService.addCustomer(newCustomer);
    setCustomers(prev => [...prev, newCustomer]);
    setShowAddModal(false);
    
    // Show customer detail view first (not Klantreis view)
    // User can start Klantreis manually from the detail view
    setSelectedCustomer(newCustomer);
    setShowKlantreis(false); // Don't auto-show Klantreis, show detail view instead
    
    // Reset all form state
    setNewName('');
    setNewWebsite('');
    setWebsiteResults([]);
    setSelectedWebsite('');
    setHasSearched(false);
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

  // State for Klantreis view
  const [showKlantreis, setShowKlantreis] = useState(false);
  
  // When customer is selected, check if we should show Klantreis view
  useEffect(() => {
    if (selectedCustomer) {
      // If customer has no klantreis, initialize it but don't auto-show
      // User can navigate to Klantreis view manually
      if (!selectedCustomer.klantreis) {
        // Initialize klantreis silently in background
        const initialKlantreis = {
          levels: [
            { level: 1 as const, name: 'Publiek Organisatie Profiel', status: 'not_started' as const },
            { level: 2 as const, name: 'Publiek Risico Profiel', status: 'not_started' as const },
            { level: 3 as const, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
          ],
          lastUpdated: new Date().toISOString()
        };
        customerService.updateCustomer(selectedCustomer.id, { klantreis: initialKlantreis }).then(() => {
          setSelectedCustomer({ ...selectedCustomer, klantreis: initialKlantreis });
        });
      }
    }
  }, [selectedCustomer]);

  if (selectedCustomer && showKlantreis) {
    return <KlantreisView 
        customer={selectedCustomer} 
        user={user}
        onBack={async () => {
          setShowKlantreis(false);
          // Refresh customer data when returning from Klantreis
          try {
            const customers = await customerService.getCustomersForUser(user.id, user.role);
            const updated = customers.find(c => c.id === selectedCustomer.id);
            if (updated) {
              setSelectedCustomer(updated);
            }
          } catch (error) {
            console.error('Error refreshing customer data:', error);
          }
        }}
        onUpdate={handleCustomerUpdate}
        onComplete={async () => {
          setShowKlantreis(false);
          // Refresh customer data when Klantreis completes
          try {
            const customers = await customerService.getCustomersForUser(user.id, user.role);
            const updated = customers.find(c => c.id === selectedCustomer.id);
            if (updated) {
              setSelectedCustomer(updated);
            }
          } catch (error) {
            console.error('Error refreshing customer data:', error);
          }
        }}
    />;
  }

  if (selectedCustomer && !showKlantreis) {
    return <CustomerDetailView 
        customer={selectedCustomer} 
        user={user}
        onBack={() => setSelectedCustomer(null)} 
        onUpdate={handleCustomerUpdate}
        onDelete={handleCustomerDelete}
        onOpenDoc={onOpenDoc}
        onShowKlantreis={() => setShowKlantreis(true)}
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
               <button 
                 onClick={() => {
                   setShowAddModal(false);
                   // Reset all form state
                   setNewName('');
                   setNewWebsite('');
                   setWebsiteResults([]);
                   setSelectedWebsite('');
                   setHasSearched(false);
                 }} 
                 className="text-gray-400 hover:text-gray-600"
               >
                 ✕
               </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder="Bijv. Jansen Bouw B.V."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
                {isSearchingWebsite && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Zoeken naar website...
                  </p>
                )}
              </div>

              {/* Website Search Results */}
              {hasSearched && websiteResults.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website (Best Match op 1) *</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {websiteResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedWebsite(result.url);
                          setNewWebsite(result.url.replace(/^https?:\/\//, ''));
                        }}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedWebsite === result.url
                            ? 'border-richting-orange bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {idx === 0 && (
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold mb-1">
                                ✓ Best Match
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {result.confidence}
                              </span>
                              <a 
                                href={result.url} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-richting-orange hover:underline text-sm font-medium flex items-center gap-1"
                              >
                                {result.url} <ExternalLinkIcon />
                              </a>
                            </div>
                            {result.title && (
                              <p className="text-sm font-semibold text-slate-900 mt-1">{result.title}</p>
                            )}
                            {result.snippet && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.snippet}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedWebsite === result.url
                              ? 'border-richting-orange bg-richting-orange'
                              : 'border-gray-300'
                          }`}>
                            {selectedWebsite === result.url && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasSearched && websiteResults.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                  <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 mb-2">
                    <p className="text-sm text-gray-700">Geen websites gevonden. Voer handmatig een website in.</p>
                  </div>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="richting.nl (zonder https://)"
                    value={newWebsite}
                    onChange={e => {
                      setNewWebsite(e.target.value);
                      setSelectedWebsite('');
                    }}
                  />
                </div>
              )}

              <button 
                onClick={handleAddCustomer}
                disabled={!newName || (!selectedWebsite && !newWebsite)}
                className="w-full mt-4 bg-richting-orange text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

// --- SETTINGS VIEW ---
// --- REGIO VIEW ---
const RegioView = ({ user }: { user: User }) => {
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [selectedRegio, setSelectedRegio] = useState<string | null>(null);
  const [selectedVestiging, setSelectedVestiging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkingLocations, setIsLinkingLocations] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [locaties, klanten] = await Promise.all([
          richtingLocatiesService.getAllLocaties(),
          customerService.getCustomersForUser(user.id, user.role)
        ]);
        setRichtingLocaties(locaties);
        setCustomers(klanten);

        // Haal alle klant locaties op
        const allCustomerLocations: Location[] = [];
        for (const customer of klanten) {
          const locs = await customerService.getLocations(customer.id);
          allCustomerLocations.push(...locs);
        }
        
        // Koppel locaties zonder richtingLocatieId aan dichtstbijzijnde Richting locatie
        const updatedLocations: Location[] = [];
        for (const loc of allCustomerLocations) {
          if (!loc.richtingLocatieId && loc.city) {
            // Zoek op basis van stad naam
            const matchingLocatie = locaties.find(rl => {
              const cityLower = loc.city.toLowerCase();
              const vestigingLower = rl.vestiging.toLowerCase();
              const adresLower = rl.volledigAdres.toLowerCase();
              
              return cityLower.includes(vestigingLower) || 
                     vestigingLower.includes(cityLower) ||
                     adresLower.includes(cityLower) ||
                     cityLower.includes(adresLower.split(',')[0].toLowerCase());
            });
            
            if (matchingLocatie) {
              const updatedLoc: Location = {
                ...loc,
                richtingLocatieId: matchingLocatie.id,
                richtingLocatieNaam: matchingLocatie.vestiging
              };
              // Update in Firestore
              await customerService.addLocation(updatedLoc);
              updatedLocations.push(updatedLoc);
            } else {
              updatedLocations.push(loc);
            }
          } else {
            updatedLocations.push(loc);
          }
        }
        
        setAllLocations(updatedLocations);
      } catch (error) {
        console.error("Error loading regio data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // Groepeer Richting locaties per regio
  const locatiesPerRegio = useMemo(() => {
    const grouped: Record<string, RichtingLocatie[]> = {};
    richtingLocaties.forEach(loc => {
      if (!grouped[loc.regio]) {
        grouped[loc.regio] = [];
      }
      grouped[loc.regio].push(loc);
    });
    return grouped;
  }, [richtingLocaties]);

  // Match klanten met regio's/vestigingen op basis van hun locaties
  // Nu met locatie-specifieke medewerkersaantallen
  const klantenPerRegio = useMemo(() => {
    const grouped: Record<string, { customer: Customer, vestiging: string, location: Location }[]> = {};
    
    allLocations.forEach(loc => {
      if (loc.richtingLocatieId) {
        const richtingLoc = richtingLocaties.find(rl => rl.id === loc.richtingLocatieId);
        if (richtingLoc) {
          const customer = customers.find(c => c.id === loc.customerId);
          if (customer) {
            if (!grouped[richtingLoc.regio]) {
              grouped[richtingLoc.regio] = [];
            }
            grouped[richtingLoc.regio].push({
              customer,
              vestiging: richtingLoc.vestiging,
              location: loc
            });
          }
        }
      }
    });
    
    return grouped;
  }, [allLocations, richtingLocaties, customers]);

  // Bereken medewerkers per regio (tel elke klant maar EEN KEER per regio)
  const medewerkersPerRegio = useMemo(() => {
    const totals: Record<string, number> = {};
    Object.keys(klantenPerRegio).forEach(regio => {
      const processedCustomers = new Set<string>();
      let total = 0;
      
      klantenPerRegio[regio].forEach(item => {
        // Tel elke klant maar EEN KEER per regio
        if (processedCustomers.has(item.customer.id)) return;
        processedCustomers.add(item.customer.id);
        
        // Zoek alle locaties van deze klant in deze regio
        const customerLocationsInRegio = klantenPerRegio[regio].filter(
          i => i.customer.id === item.customer.id
        );
        const locationsWithCount = customerLocationsInRegio.filter(
          i => i.location.employeeCount !== undefined && i.location.employeeCount !== null
        );
        
        if (locationsWithCount.length > 0) {
          // Klant heeft locaties met aantallen in deze regio: gebruik customer.employeeCount (prioriteit)
          // OF gebruik MAX van locatie-aantallen als customer.employeeCount niet beschikbaar is
          if (item.customer.employeeCount) {
            total += item.customer.employeeCount;
          } else {
            const maxLocationCount = Math.max(...locationsWithCount.map(i => i.location.employeeCount || 0));
            total += maxLocationCount;
          }
        } else {
          // Klant heeft geen locaties met aantallen in deze regio: gebruik customer.employeeCount
          total += item.customer.employeeCount || 0;
        }
      });
      
      totals[regio] = total;
    });
    return totals;
  }, [klantenPerRegio]);

  // Bereken medewerkers per vestiging (tel elke klant maar EEN KEER per vestiging)
  const medewerkersPerVestiging = useMemo(() => {
    if (!selectedRegio) return {};
    const totals: Record<string, number> = {};
    const processedCustomersPerVestiging: Record<string, Set<string>> = {};
    
    klantenPerRegio[selectedRegio]?.forEach(item => {
      if (!totals[item.vestiging]) {
        totals[item.vestiging] = 0;
        processedCustomersPerVestiging[item.vestiging] = new Set();
      }
      
      // Tel elke klant maar EEN KEER per vestiging
      if (processedCustomersPerVestiging[item.vestiging].has(item.customer.id)) return;
      processedCustomersPerVestiging[item.vestiging].add(item.customer.id);
      
      // Zoek alle locaties van deze klant bij deze vestiging
      const customerLocationsAtVestiging = klantenPerRegio[selectedRegio]?.filter(
        i => i.customer.id === item.customer.id && i.vestiging === item.vestiging
      ) || [];
      const locationsWithCount = customerLocationsAtVestiging.filter(
        i => i.location.employeeCount !== undefined && i.location.employeeCount !== null
      );
      
      if (locationsWithCount.length > 0) {
        // Klant heeft locaties met aantallen bij deze vestiging: gebruik customer.employeeCount (prioriteit)
        // OF gebruik MAX van locatie-aantallen als customer.employeeCount niet beschikbaar is
        if (item.customer.employeeCount) {
          totals[item.vestiging] += item.customer.employeeCount;
        } else {
          const maxLocationCount = Math.max(...locationsWithCount.map(i => i.location.employeeCount || 0));
          totals[item.vestiging] += maxLocationCount;
        }
      } else {
        // Klant heeft geen locaties met aantallen bij deze vestiging: gebruik customer.employeeCount
        totals[item.vestiging] += item.customer.employeeCount || 0;
      }
    });
    return totals;
  }, [selectedRegio, klantenPerRegio]);

  // Filter klanten op basis van geselecteerde regio/vestiging
  // Unieke klanten (om duplicaten te voorkomen)
  const filteredKlanten = useMemo(() => {
    if (!selectedRegio) return [];
    let filtered = klantenPerRegio[selectedRegio] || [];
    if (selectedVestiging) {
      filtered = filtered.filter(item => item.vestiging === selectedVestiging);
    }
    // Unieke klanten op basis van customer ID
    const uniqueCustomers = new Map<string, { customer: Customer, location: Location }>();
    filtered.forEach(item => {
      if (!uniqueCustomers.has(item.customer.id)) {
        uniqueCustomers.set(item.customer.id, { customer: item.customer, location: item.location });
      }
    });
    return Array.from(uniqueCustomers.values());
  }, [selectedRegio, selectedVestiging, klantenPerRegio]);

  // Pie chart data: Actieve klanten vs Prospects
  const pieChartData = useMemo(() => {
    const actief = customers.filter(c => c.status === 'active').length;
    const prospect = customers.filter(c => c.status === 'prospect').length;
    const totaal = actief + prospect;
    
    if (totaal === 0) {
      return { actief: 0, prospect: 0, actiefPercentage: 0, prospectPercentage: 0 };
    }
    
    return {
      actief,
      prospect,
      actiefPercentage: (actief / totaal) * 100,
      prospectPercentage: (prospect / totaal) * 100
    };
  }, [customers]);

  const handleRelinkAllLocations = async () => {
    setIsLinkingLocations(true);
    try {
      const updatedLocations: Location[] = [];
      
      for (const loc of allLocations) {
        if (loc.city) {
          // Zoek op basis van stad naam
          const matchingLocatie = richtingLocaties.find(rl => {
            const cityLower = loc.city.toLowerCase();
            const vestigingLower = rl.vestiging.toLowerCase();
            const adresLower = rl.volledigAdres.toLowerCase();
            
            return cityLower.includes(vestigingLower) || 
                   vestigingLower.includes(cityLower) ||
                   adresLower.includes(cityLower) ||
                   cityLower.includes(adresLower.split(',')[0].toLowerCase());
          });
          
          if (matchingLocatie) {
            const updatedLoc: Location = {
              ...loc,
              richtingLocatieId: matchingLocatie.id,
              richtingLocatieNaam: matchingLocatie.vestiging
            };
            // Update in Firestore
            await customerService.addLocation(updatedLoc);
            updatedLocations.push(updatedLoc);
          } else {
            updatedLocations.push(loc);
          }
        } else {
          updatedLocations.push(loc);
        }
      }
      
      setAllLocations(updatedLocations);
      alert(`✅ ${updatedLocations.filter(l => l.richtingLocatieId).length} locaties gekoppeld aan Richting vestigingen.`);
    } catch (error) {
      console.error("Error linking locations:", error);
      alert("Fout bij koppelen van locaties. Probeer het opnieuw.");
    } finally {
      setIsLinkingLocations(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Laden...</div>;
  }

  const regioOrder = ['Noord', 'Oost', 'West', 'Zuid West', 'Zuid Oost', 'Midden'];
  
  // Debug info
  console.log('RegioView Debug:', {
    richtingLocaties: richtingLocaties.length,
    customers: customers.length,
    allLocations: allLocations.length,
    locationsWithRichtingId: allLocations.filter(l => l.richtingLocatieId).length,
    klantenPerRegio: Object.keys(klantenPerRegio).length,
    locatiesPerRegio: Object.keys(locatiesPerRegio).length
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Regio & Sales Overzicht</h2>
        {user.role === UserRole.ADMIN && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!window.confirm('Weet je zeker dat je alle locaties zonder klantkoppeling wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
                  return;
                }
                setIsCleaningUp(true);
                try {
                  const result = await customerService.cleanupOrphanedLocations();
                  alert(`✅ Cleanup voltooid!\n\nVerwijderd: ${result.deleted} locatie(s)\n${result.errors.length > 0 ? `Fouten: ${result.errors.length}` : 'Geen fouten'}`);
                  // Reload data
                  window.location.reload();
                } catch (error: any) {
                  alert(`❌ Fout bij cleanup: ${error.message}`);
                } finally {
                  setIsCleaningUp(false);
                }
              }}
              disabled={isCleaningUp}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
            >
              {isCleaningUp ? '⏳ Opruimen...' : '🧹 Verwijder Orphaned Locaties'}
            </button>
            <button
              onClick={handleRelinkAllLocations}
              disabled={isLinkingLocations}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
            >
              {isLinkingLocations ? '⏳ Koppelen...' : '🔗 Koppel Alle Locaties'}
            </button>
          </div>
        )}
      </div>

      {/* Pie Chart: Actieve Klanten vs Prospects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> Sales & Capaciteit Overzicht
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Pie Chart */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-4">
              <svg className="transform -rotate-90 w-64 h-64">
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="40"
                />
                {pieChartData.actiefPercentage > 0 && (
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="40"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - pieChartData.actiefPercentage / 100)}`}
                    className="transition-all duration-500"
                  />
                )}
                {pieChartData.prospectPercentage > 0 && (
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="40"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - pieChartData.prospectPercentage / 100) - (2 * Math.PI * 100 * pieChartData.actiefPercentage / 100)}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{pieChartData.actief + pieChartData.prospect}</p>
                  <p className="text-sm text-gray-500">Totaal</p>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-richting-orange"></div>
                <span className="text-sm text-gray-700">
                  Actief: <span className="font-bold">{pieChartData.actief}</span> ({pieChartData.actiefPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">
                  Prospect: <span className="font-bold">{pieChartData.prospect}</span> ({pieChartData.prospectPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Statistieken */}
          <div className="space-y-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Actieve Klanten</p>
              <p className="text-3xl font-bold text-richting-orange">{pieChartData.actief}</p>
              <p className="text-xs text-gray-500 mt-1">Huidige capaciteit in gebruik</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Prospects</p>
              <p className="text-3xl font-bold text-blue-600">{pieChartData.prospect}</p>
              <p className="text-xs text-gray-500 mt-1">Potentiële nieuwe klanten</p>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Totaal Medewerkers</p>
              <p className="text-3xl font-bold text-slate-900">
                {(() => {
                  // Bereken totaal: tel elke klant maar EEN KEER
                  // Als een klant locaties heeft met employeeCount, gebruik de MAX (omdat locatie-aantallen mogelijk het totaal zijn)
                  // Als een klant geen locaties heeft met employeeCount, gebruik customer.employeeCount
                  const processedCustomers = new Set<string>();
                  let total = 0;
                  
                  customers.forEach(customer => {
                    if (processedCustomers.has(customer.id)) return;
                    processedCustomers.add(customer.id);
                    
                    // Zoek alle locaties voor deze klant
                    const customerLocations = allLocations.filter(loc => loc.customerId === customer.id);
                    const locationsWithCount = customerLocations.filter(
                      loc => loc.employeeCount !== undefined && loc.employeeCount !== null
                    );
                    
                    if (locationsWithCount.length > 0) {
                      // Klant heeft locaties met aantallen: gebruik MAX (omdat locatie-aantallen mogelijk het totaal zijn, niet per locatie)
                      // OF gebruik customer.employeeCount als die beschikbaar is (prioriteit)
                      if (customer.employeeCount) {
                        total += customer.employeeCount;
                      } else {
                        // Als customer.employeeCount niet beschikbaar is, gebruik MAX van locatie-aantallen
                        const maxLocationCount = Math.max(...locationsWithCount.map(loc => loc.employeeCount || 0));
                        total += maxLocationCount;
                      }
                    } else {
                      // Klant heeft geen locaties met aantallen: gebruik customer.employeeCount
                      total += customer.employeeCount || 0;
                    }
                  });
                  
                  return total.toLocaleString('nl-NL');
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Gebaseerd op locatie-specifieke aantallen</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regio Selectie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🗺️</span> Selecteer Regio
        </h3>
        {richtingLocaties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Geen Richting locaties gevonden.</p>
            <p className="text-sm">Ga naar Instellingen → Data Beheer om Richting locaties te seeden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {regioOrder.map(regio => {
              const locatiesInRegio = locatiesPerRegio[regio] || [];
              const klantenInRegio = klantenPerRegio[regio] || [];
              const medewerkers = medewerkersPerRegio[regio] || 0;
              const isSelected = selectedRegio === regio;
              
              return (
                <button
                  key={regio}
                  onClick={() => {
                    setSelectedRegio(isSelected ? null : regio);
                    setSelectedVestiging(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-richting-orange bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-1">{regio}</p>
                  <p className="text-xs text-gray-500 mb-2">{locatiesInRegio.length} vestiging{locatiesInRegio.length !== 1 ? 'en' : ''}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{klantenInRegio.length} klant{klantenInRegio.length !== 1 ? 'en' : ''}</span>
                    <span className="text-xs font-bold text-richting-orange">
                      {medewerkers.toLocaleString('nl-NL')} medew.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Vestiging Selectie (alleen als regio geselecteerd) */}
      {selectedRegio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span> Vestigingen in {selectedRegio}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(locatiesPerRegio[selectedRegio] || []).map(vestiging => {
              const klantenBijVestiging = (klantenPerRegio[selectedRegio] || [])
                .filter(item => item.vestiging === vestiging.vestiging)
                .map(item => item.customer);
              const medewerkers = medewerkersPerVestiging[vestiging.vestiging] || 0;
              const isSelected = selectedVestiging === vestiging.vestiging;
              
              return (
                <button
                  key={vestiging.id}
                  onClick={() => setSelectedVestiging(isSelected ? null : vestiging.vestiging)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-richting-orange bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-1">{vestiging.vestiging}</p>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1">{vestiging.volledigAdres}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-600">{klantenBijVestiging.length} klant{klantenBijVestiging.length !== 1 ? 'en' : ''}</span>
                    <span className="text-xs font-bold text-richting-orange">
                      {medewerkers.toLocaleString('nl-NL')} medew.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Klanten Overzicht (gefilterd op regio/vestiging) */}
      {selectedRegio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-2xl">💼</span> Klanten
              {selectedVestiging && ` - ${selectedVestiging}`}
              {!selectedVestiging && ` in ${selectedRegio}`}
            </h3>
            <span className="text-sm text-gray-500">
              {filteredKlanten.length} klant{filteredKlanten.length !== 1 ? 'en' : ''}
            </span>
          </div>
          {filteredKlanten.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen klanten gevonden voor deze selectie.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKlanten.map(({ customer, location }) => {
                // Try multiple logo sources
                const logoSrc = customer.logoUrl || getCompanyLogoUrl(customer.website) || (customer.website ? `https://wsrv.nl/?url=${ensureUrl(customer.website)}&w=128&output=png` : null);
                const employeeCount = location?.employeeCount || customer.employeeCount;
                return (
                  <div
                    key={customer.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-richting-orange transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {logoSrc ? (
                          <img 
                            src={logoSrc} 
                            alt={customer.name} 
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const parent = img.parentElement;
                              if (parent) {
                                const existingFallback = parent.querySelector('.fallback-icon');
                                if (!existingFallback) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full bg-gray-50 flex items-center justify-center fallback-icon';
                                  fallback.innerHTML = '<span class="text-2xl text-gray-400">🏢</span>';
                                  parent.appendChild(fallback);
                                }
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                            <span className="text-2xl text-gray-400">🏢</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm mb-1">{customer.name}</p>
                        <p className="text-xs text-gray-500 mb-1">{customer.industry}</p>
                        {location && (
                          <p className="text-xs text-gray-400 italic">{location.name}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0 ${
                        customer.status === 'active' ? 'bg-green-100 text-green-700' : 
                        customer.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {customer.status === 'active' ? 'Actief' : customer.status === 'prospect' ? 'Prospect' : customer.status}
                      </span>
                    </div>
                    {employeeCount && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                        <span className="font-bold text-richting-orange">{employeeCount.toLocaleString('nl-NL')}</span>
                        <span>medewerkers{location?.employeeCount ? ` (${location.name})` : ''}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const SettingsView = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'autorisatie' | 'promptbeheer' | 'databeheer' | 'typebeheer'>('autorisatie');
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptType, setPromptType] = useState<string>('publiek_organisatie_profiel');
  const [promptTypes, setPromptTypes] = useState<{type: string, label: string}[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [editingType, setEditingType] = useState<{type: string, label: string} | null>(null);
  const [editingTypeLabel, setEditingTypeLabel] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewingFile, setViewingFile] = useState<{name: string, content: string} | null>(null);
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);
  
  // Locatie management state
  const [showAddLocatieModal, setShowAddLocatieModal] = useState(false);
  const [editingLocatie, setEditingLocatie] = useState<RichtingLocatie | null>(null);
  const [newLocatieVestiging, setNewLocatieVestiging] = useState('');
  const [newLocatieStad, setNewLocatieStad] = useState('');
  const [newLocatieRegio, setNewLocatieRegio] = useState('');
  const [newLocatieAdres, setNewLocatieAdres] = useState('');
  const [newLocatieVolledigAdres, setNewLocatieVolledigAdres] = useState('');
  const [newLocatieLatitude, setNewLocatieLatitude] = useState('');
  const [newLocatieLongitude, setNewLocatieLongitude] = useState('');
  const [savingLocatie, setSavingLocatie] = useState(false);
  
  // Data management sub tabs
  const [dataManagementSubTab, setDataManagementSubTab] = useState<'klanten' | 'locaties' | 'documents' | 'logo'>('klanten');
  
  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Import customers state
  const [showImportCustomersModal, setShowImportCustomersModal] = useState(false);
  const [importCustomersFile, setImportCustomersFile] = useState<File | null>(null);
  const [importCustomersPreview, setImportCustomersPreview] = useState<Partial<Customer>[] | null>(null);
  const [importingCustomers, setImportingCustomers] = useState(false);
  
  // User management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.EDITOR);
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>(UserRole.EDITOR);
  const [updatingUser, setUpdatingUser] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [usersData, promptsData, locatiesData, typesWithLabelsData, logoUrlData] = await Promise.all([
          authService.getAllUsers(),
          promptService.getPrompts(),
          richtingLocatiesService.getAllLocaties(),
          promptService.getPromptTypesWithLabels(),
          logoService.getLogoUrl()
        ]);
        setUsers(usersData);
        setPrompts(promptsData);
        setRichtingLocaties(locatiesData);
        setLogoUrl(logoUrlData);
        
        // Alleen loggen als er geen prompts zijn (voor debugging)
        if (promptsData.length === 0) {
          console.warn('⚠️ No prompts found. Check Firestore collection "prompts" in database "richting01"');
        }
        // Verwijder normale logging - te veel noise in console tijdens analyse
        
        // Use types with labels directly from service
        setPromptTypes(typesWithLabelsData);
      } catch (error) {
        console.error("❌ Error loading settings data:", error);
        // Show error to user
        alert(`Fout bij laden van data: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Alleen afbeeldingsbestanden zijn toegestaan (PNG, JPG, etc.)');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const url = await logoService.uploadLogo(file);
      setLogoUrl(url);
      alert('✅ Logo succesvol geüpload! Ververs de pagina om het nieuwe logo te zien.');
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`❌ Fout bij uploaden logo: ${error.message || 'Onbekende fout'}`);
    } finally {
      setUploadingLogo(false);
    }
  };


  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await authService.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (user.id === userId) {
        window.location.reload(); // Reload if current user's role changed
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Fout bij het bijwerken van de rol. Probeer het opnieuw.");
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) {
      alert('Vul naam en e-mailadres in');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      alert('Voer een geldig e-mailadres in');
      return;
    }

    setCreatingUser(true);
    try {
      const newUser = await authService.createUserByAdmin(newUserEmail, newUserName, newUserRole);
      const updatedUsers = await authService.getAllUsers();
      setUsers(updatedUsers);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole(UserRole.EDITOR);
      alert(`✅ Gebruiker "${newUserName}" is aangemaakt!\n\nEen wachtwoord reset email is verzonden naar ${newUserEmail}. De gebruiker kan hiermee een eigen wachtwoord instellen.`);
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(`❌ Fout bij aanmaken gebruiker: ${error.message || 'Onbekende fout'}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
  };

  const handleImportCustomersFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportCustomersFile(file);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        alert('CSV bestand is leeg');
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'naam' || h === 'klant');
      const industryIdx = headers.findIndex(h => h === 'industry' || h === 'branche');
      const websiteIdx = headers.findIndex(h => h === 'website');
      const statusIdx = headers.findIndex(h => h === 'status');
      const employeeCountIdx = headers.findIndex(h => h === 'employeecount' || h === 'aantal_medewerkers' || h === 'aantal medewerkers');

      if (nameIdx === -1) {
        alert('CSV moet minimaal een "name", "naam" of "klant" kolom bevatten');
        return;
      }

      // Parse data rows
      const customers: Partial<Customer>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 1) continue;

        const name = values[nameIdx];
        if (!name) continue;

        // Parse employeeCount als getal
        let employeeCount: number | undefined = undefined;
        if (employeeCountIdx >= 0 && values[employeeCountIdx]) {
          const parsed = parseInt(values[employeeCountIdx], 10);
          if (!isNaN(parsed)) {
            employeeCount = parsed;
          }
        }

        // Parse status - normaliseer naar geldige waarden
        let status: Customer['status'] = 'active';
        if (statusIdx >= 0 && values[statusIdx]) {
          const statusValue = values[statusIdx].toLowerCase().trim();
          if (['active', 'actief'].includes(statusValue)) {
            status = 'active';
          } else if (['prospect'].includes(statusValue)) {
            status = 'prospect';
          } else if (['churned', 'archief'].includes(statusValue)) {
            status = 'churned';
          } else if (['rejected', 'afgewezen'].includes(statusValue)) {
            status = 'rejected';
          } else {
            status = 'active'; // Default naar active
          }
        }

        customers.push({
          name,
          industry: industryIdx >= 0 ? values[industryIdx] : undefined,
          website: websiteIdx >= 0 ? values[websiteIdx] : undefined,
          status: status,
          employeeCount: employeeCount,
          assignedUserIds: [],
          createdAt: new Date().toISOString()
        });
      }

      setImportCustomersPreview(customers);
    } catch (error: any) {
      console.error("Error parsing CSV:", error);
      alert(`Fout bij lezen CSV: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleImportCustomers = async () => {
    if (!importCustomersPreview || importCustomersPreview.length === 0) {
      alert('Geen klanten om te importeren');
      return;
    }

    setImportingCustomers(true);
    try {
      const result = await customerService.importCustomers(importCustomersPreview as Omit<Customer, 'id'>[]);
      alert(`✅ ${result.success} klanten geïmporteerd${result.errors.length > 0 ? `\n\n⚠️ ${result.errors.length} fouten:\n${result.errors.slice(0, 5).join('\n')}` : ''}`);
      setShowImportCustomersModal(false);
      setImportCustomersFile(null);
      setImportCustomersPreview(null);
    } catch (error: any) {
      console.error("Error importing customers:", error);
      alert(`❌ Fout bij importeren: ${error.message || 'Onbekende fout'}`);
    } finally {
      setImportingCustomers(false);
    }
  };

  const handleExportCustomers = async () => {
    try {
      const customers = await customerService.getAllCustomers();
      const csv = [
        ['name', 'industry', 'website', 'status', 'Aantal_medewerkers'].join(','),
        ...customers.map(c => [
          c.name,
          c.industry,
          c.website || '',
          c.status,
          c.employeeCount || ''
        ].map(v => `"${v}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `klanten-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ ${customers.length} klanten geëxporteerd`);
    } catch (error: any) {
      console.error("Error exporting customers:", error);
      alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleExportDocuments = async () => {
    try {
      const documents = await dbService.getDocuments();
      const data = JSON.stringify(documents, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ ${documents.length} documents geëxporteerd`);
    } catch (error: any) {
      console.error("Error exporting documents:", error);
      alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    if (!editUserName || !editUserEmail) {
      alert('Vul naam en e-mailadres in');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserEmail)) {
      alert('Voer een geldig e-mailadres in');
      return;
    }

    setUpdatingUser(true);
    try {
      await authService.updateUser(editingUser.id, {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole
      });
      
      const updatedUsers = await authService.getAllUsers();
      setUsers(updatedUsers);
      setEditingUser(null);
      setEditUserName('');
      setEditUserEmail('');
      setEditUserRole(UserRole.EDITOR);
      alert('✅ Gebruiker bijgewerkt!');
      
      // Reload if current user was edited
      if (user.id === editingUser.id) {
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptName || !promptContent) {
      alert("Vul naam en inhoud in");
      return;
    }

    try {
      const promptData = {
        name: promptName,
        type: promptType,
        promptTekst: promptContent,
        versie: selectedPrompt?.versie || 1,
        isActief: selectedPrompt?.isActief ?? false,
        files: selectedPrompt?.files || []
      };

      await promptService.savePrompt(
        selectedPrompt ? { ...promptData, id: selectedPrompt.id } : promptData,
        user.id
      );

      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      setShowPromptEditor(false);
      setSelectedPrompt(null);
      setPromptName('');
      setPromptContent('');
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("Fout bij het opslaan van de prompt. Probeer het opnieuw.");
    }
  };

  const handleActivatePrompt = async (promptId: string, type: string) => {
    if (!window.confirm('Weet je zeker dat je deze prompt wilt activeren? Dit deactiveert alle andere prompts van dit type (maar andere types blijven actief).')) {
      return;
    }

    try {
      await promptService.activatePrompt(promptId, type);
      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      // Update selected prompt if it's the one we activated
      if (selectedPrompt && selectedPrompt.id === promptId) {
        const updated = await promptService.getPrompt(promptId);
        if (updated) setSelectedPrompt(updated);
      }
      alert('Prompt geactiveerd!');
    } catch (error) {
      console.error("Error activating prompt:", error);
      alert("Fout bij het activeren van de prompt. Probeer het opnieuw.");
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!window.confirm('Weet je zeker dat je deze prompt wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }

    try {
      await promptService.deletePrompt(promptId);
      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setSelectedPrompt(null);
        setShowPromptEditor(false);
      }
      alert('✅ Prompt verwijderd');
    } catch (error: any) {
      console.error("Error deleting prompt:", error);
      alert(`❌ Fout bij verwijderen: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, promptId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await promptService.addFileToPrompt(promptId, file.name, content);
        
        // Update selectedPrompt to show the new file immediately
        const updatedPrompt = await promptService.getPrompt(promptId);
        if (updatedPrompt) {
          setSelectedPrompt(updatedPrompt);
        }
        
        // Update prompts list
        const updatedPrompts = await promptService.getPrompts();
        setPrompts(updatedPrompts);
        
        // Reset file input so same file can be selected again
        event.target.value = '';
        
        setUploadingFile(false);
        alert(`✅ Bestand "${file.name}" succesvol toegevoegd!`);
      };
      reader.onerror = () => {
        console.error("Error reading file");
        alert("Fout bij het lezen van het bestand.");
        setUploadingFile(false);
        event.target.value = '';
      };
      reader.readAsText(file);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(`❌ Fout bij het uploaden van het bestand: ${error.message || 'Onbekende fout'}`);
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setPromptName(prompt.name);
    setPromptContent(prompt.promptTekst || '');
    setPromptType(prompt.type);
    setShowPromptEditor(true);
  };

  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setPromptName('');
    setPromptContent('');
    setPromptType('publiek_organisatie_profiel');
    setShowPromptEditor(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Instellingen</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('autorisatie')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'autorisatie'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔐 Autorisatie
        </button>
        <button
          onClick={() => setActiveTab('promptbeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'promptbeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Promptbeheer
        </button>
        <button
          onClick={() => setActiveTab('databeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'databeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💾 Data Beheer
        </button>
        <button
          onClick={() => setActiveTab('typebeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'typebeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏷️ Type Beheer
        </button>
      </div>

      {/* Autorisatie Tab */}
      {activeTab === 'autorisatie' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Gebruikers</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
            >
              + Toevoegen
            </button>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Nieuwe Gebruiker Toevoegen</h3>
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      setNewUserName('');
                      setNewUserEmail('');
                      setNewUserRole(UserRole.EDITOR);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Bijv. Jan Jansen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mailadres</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="bijv. jan@richting.nl"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>Let op:</strong> Na het aanmaken wordt automatisch een wachtwoord reset email verzonden. De gebruiker kan hiermee een eigen wachtwoord instellen.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddUser}
                      disabled={creatingUser}
                      className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {creatingUser ? 'Aanmaken...' : 'Gebruiker Aanmaken'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddUserModal(false);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserRole(UserRole.EDITOR);
                      }}
                      disabled={creatingUser}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Gebruiker Bewerken</h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setEditUserName('');
                      setEditUserEmail('');
                      setEditUserRole(UserRole.EDITOR);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                    <input
                      type="text"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      placeholder="Bijv. Jan Jansen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mailadres</label>
                    <input
                      type="email"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      placeholder="bijv. jan@richting.nl"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-sm text-yellow-700">
                      <strong>Let op:</strong> E-mailadres wijzigingen worden alleen in Firestore opgeslagen. Voor wijzigingen in Firebase Authentication is extra configuratie nodig.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleUpdateUser}
                      disabled={updatingUser}
                      className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {updatingUser ? 'Bijwerken...' : 'Opslaan'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setEditUserName('');
                        setEditUserEmail('');
                        setEditUserRole(UserRole.EDITOR);
                      }}
                      disabled={updatingUser}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Nog geen gebruikers gevonden.</p>
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-richting-orange transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} alt={u.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400 mt-1">Rol: {u.role}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditUser(u)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Weet je zeker dat je gebruiker "${u.name}" wilt verwijderen?`)) {
                          return;
                        }
                        try {
                          await authService.deleteUser(u.id);
                          const updatedUsers = await authService.getAllUsers();
                          setUsers(updatedUsers);
                          alert('✅ Gebruiker verwijderd');
                        } catch (error: any) {
                          alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Promptbeheer Tab */}
      {activeTab === 'promptbeheer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Prompts</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const result = await promptService.restoreDefaultPrompts(user.id);
                    alert(`✅ ${result.message}`);
                    const updatedPrompts = await promptService.getPrompts();
                    setPrompts(updatedPrompts);
                  } catch (error: any) {
                    alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
              >
                🔄 Herstel Default Prompts
              </button>
              <button
                onClick={async () => {
                  try {
                    const exportData = await promptService.exportPrompts();
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `prompts-backup-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('✅ Prompts geëxporteerd');
                  } catch (error: any) {
                    alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
              >
                📥 Exporteer
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    
                    const text = await file.text();
                    const overwrite = window.confirm('Wil je bestaande prompts overschrijven? (Nee = alleen nieuwe toevoegen)');
                    
                    try {
                      const result = await promptService.importPrompts(text, user.id, overwrite);
                      alert(`✅ ${result.message}`);
                      const updatedPrompts = await promptService.getPrompts();
                      setPrompts(updatedPrompts);
                    } catch (error: any) {
                      alert(`❌ Fout bij importeren: ${error.message || 'Onbekende fout'}`);
                    }
                  };
                  input.click();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
              >
                📤 Importeer
              </button>
              <button
                onClick={handleNewPrompt}
                className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + Toevoegen
              </button>
            </div>
          </div>

          {showPromptEditor ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">
                {selectedPrompt ? 'Prompt Bewerken' : 'Nieuwe Prompt'}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="Bijv. Branche Analyse Prompt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  >
                    {promptTypes.map(type => (
                      <option key={type.type} value={type.type}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inhoud (promptTekst)</label>
                  <textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange font-mono text-sm"
                    placeholder="Voer de prompt inhoud in..."
                  />
                </div>
                {selectedPrompt && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActief"
                      checked={selectedPrompt.isActief || false}
                      onChange={async (e) => {
                        if (selectedPrompt && (selectedPrompt.type === 'publiek_organisatie_profiel' || selectedPrompt.type === 'publiek_cultuur_profiel')) {
                          if (e.target.checked) {
                            await handleActivatePrompt(selectedPrompt.id, selectedPrompt.type as 'publiek_organisatie_profiel' | 'publiek_cultuur_profiel');
                            const updated = await promptService.getPrompt(selectedPrompt.id);
                            if (updated) setSelectedPrompt(updated);
                          } else {
                            // Deactivate
                            await updateDoc(doc(db, 'prompts', selectedPrompt.id), { 
                              isActief: false,
                              updatedAt: new Date().toISOString()
                            });
                            const updated = await promptService.getPrompt(selectedPrompt.id);
                            if (updated) setSelectedPrompt(updated);
                            const allPrompts = await promptService.getPrompts();
                            setPrompts(allPrompts);
                          }
                        }
                      }}
                      disabled={selectedPrompt.type === 'other'}
                      className="w-4 h-4 text-richting-orange border-gray-300 rounded focus:ring-richting-orange"
                    />
                    <label htmlFor="isActief" className="text-sm text-gray-700">
                      Actief (alleen voor Branche Analyse / Publiek Cultuur Profiel)
                    </label>
                  </div>
                )}
                {selectedPrompt && selectedPrompt.files && selectedPrompt.files.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bijgevoegde Bestanden</label>
                    <div className="space-y-2">
                      {selectedPrompt.files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => setViewingFile({ name: file.name, content: file.content })}
                            className="flex-1 text-left text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            📄 {file.name}
                          </button>
                          <button
                            onClick={async () => {
                              if (selectedPrompt) {
                                if (!window.confirm(`Weet je zeker dat je "${file.name}" wilt verwijderen?`)) {
                                  return;
                                }
                                await promptService.deleteFileFromPrompt(selectedPrompt.id, file.id);
                                const updated = await promptService.getPrompt(selectedPrompt.id);
                                if (updated) setSelectedPrompt(updated);
                                const allPrompts = await promptService.getPrompts();
                                setPrompts(allPrompts);
                                alert('✅ Bestand verwijderd');
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-sm ml-2 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPrompt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bestand Toevoegen</label>
                    <input
                      type="file"
                      onChange={(e) => selectedPrompt && handleFileUpload(e, selectedPrompt.id)}
                      disabled={uploadingFile}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {uploadingFile && <p className="text-sm text-gray-500 mt-2">Uploaden...</p>}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={handleSavePrompt}
                    className="bg-richting-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => {
                      setShowPromptEditor(false);
                      setSelectedPrompt(null);
                      setPromptName('');
                      setPromptContent('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {prompts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
                  <p className="mb-2">Nog geen prompts gevonden.</p>
                  <p className="text-xs text-gray-400 mb-4">Controleer de browser console (F12) voor details.</p>
                  <button
                    onClick={async () => {
                      try {
                        const result = await promptService.restoreDefaultPrompts(user.id);
                        alert(`✅ ${result.message}`);
                        const updatedPrompts = await promptService.getPrompts();
                        setPrompts(updatedPrompts);
                      } catch (error: any) {
                        alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                      }
                    }}
                    className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    Herstel Default Prompts
                  </button>
                </div>
              ) : (
                prompts
                  .slice()
                  .sort((a, b) => {
                    // Sorteer primair op nummer aan het begin van de naam (bijv. "1. ..."), anders op naam
                    const getNum = (p: Prompt) => {
                      const match = (p.name || '').trim().match(/^(\d+)/);
                      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
                    };
                    const na = getNum(a);
                    const nb = getNum(b);
                    if (na !== nb) return na - nb;
                    // Fallback: sorteer op versie desc om nieuwste eerst binnen hetzelfde nummer te tonen
                    return (b.versie || 0) - (a.versie || 0);
                  })
                  .map(prompt => {
                    return (
                      <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-richting-orange transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-slate-900">{prompt.name}</h4>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                Versie {prompt.versie || 1}
                              </span>
                              {prompt.isActief && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                                  ✓ Actief
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              Aangemaakt: {new Date(prompt.createdAt).toLocaleDateString('nl-NL')}
                              {prompt.files && prompt.files.length > 0 && (
                                <span className="ml-2">• {prompt.files.length} bestand(en)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {prompt.type !== 'other' && !prompt.isActief && (
                              <button
                                onClick={() => handleActivatePrompt(prompt.id, prompt.type)}
                                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                              >
                                Activeer
                              </button>
                            )}
                            <button
                              onClick={() => handleEditPrompt(prompt)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                              Bewerken
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                              Verwijderen
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                          <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap line-clamp-3">
                            {prompt.promptTekst?.substring(0, 300) || ''}...
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* File Viewer Modal */}
          {viewingFile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">📄 {viewingFile.name}</h3>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-gray-50">
                  <pre className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto max-h-[70vh]">
                    {viewingFile.content}
                  </pre>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      const blob = new Blob([viewingFile.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = viewingFile.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    📥 Downloaden
                  </button>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type Beheer Tab */}
      {activeTab === 'typebeheer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Types</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Type ID (bijv. nieuwe_analyse)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
              />
              <input
                type="text"
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Label (bijv. Nieuwe Analyse)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
              />
              <button
                onClick={async () => {
                  if (!newTypeName || !newTypeLabel) {
                    alert('Vul type ID en label in');
                    return;
                  }
                  try {
                    await promptService.addPromptType(newTypeName, newTypeLabel, user.id);
                    const typesWithLabels = await promptService.getPromptTypesWithLabels();
                    setPromptTypes(typesWithLabels);
                    setNewTypeName('');
                    setNewTypeLabel('');
                    alert('✅ Type toegevoegd');
                  } catch (error: any) {
                    alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + Toevoegen
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {promptTypes.map(type => (
              <div key={type.type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {editingType?.type === type.type ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type ID (niet wijzigbaar)</label>
                      <input
                        type="text"
                        value={type.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={editingTypeLabel}
                        onChange={(e) => setEditingTypeLabel(e.target.value)}
                        placeholder="Label (bijv. Nieuwe Analyse)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!editingTypeLabel.trim()) {
                            alert('Label mag niet leeg zijn');
                            return;
                          }
                          try {
                            await promptService.updatePromptType(type.type, editingTypeLabel, user.id);
                            const typesWithLabels = await promptService.getPromptTypesWithLabels();
                            setPromptTypes(typesWithLabels);
                            setEditingType(null);
                            setEditingTypeLabel('');
                            alert('✅ Type bijgewerkt');
                          } catch (error: any) {
                            alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                          }
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => {
                          setEditingType(null);
                          setEditingTypeLabel('');
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">{type.label}</h4>
                      <p className="text-xs text-gray-500">ID: {type.type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {prompts.filter(p => p.type === type.type).length} prompt(s) van dit type
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingType(type);
                          setEditingTypeLabel(type.label);
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Weet je zeker dat je het type "${type.label}" wilt verwijderen? Dit kan alleen als er geen prompts meer van dit type zijn.`)) {
                            return;
                          }
                          try {
                            await promptService.deletePromptType(type.type);
                            const typesWithLabels = await promptService.getPromptTypesWithLabels();
                            setPromptTypes(typesWithLabels);
                            alert('✅ Type verwijderd');
                          } catch (error: any) {
                            alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                          }
                        }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Beheer Tab */}
      {activeTab === 'databeheer' && (
        <div className="space-y-6">
          {/* Backup Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">💾 Volledige Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Maak een volledige backup van alle data (gebruikers, documenten, klanten, locaties, contactpersonen).
            </p>
            <button
              onClick={handleBackup}
              className="bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Volledige Backup
            </button>
          </div>

          {/* Data Management Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setDataManagementSubTab('klanten')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'klanten'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                👥 Klanten
              </button>
              <button
                onClick={() => setDataManagementSubTab('locaties')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'locaties'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                📍 Richting Locaties
              </button>
              <button
                onClick={() => setDataManagementSubTab('documents')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'documents'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                📄 Documents
              </button>
              <button
                onClick={() => setDataManagementSubTab('logo')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'logo'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                🎨 Logo
              </button>
            </div>

            {/* Klanten Section */}
            {dataManagementSubTab === 'klanten' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Klanten Beheer</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCustomers}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
                    >
                      📥 Exporteer
                    </button>
                    <button
                      onClick={() => setShowImportCustomersModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
                    >
                      📤 Importeer (CSV/Google Sheets)
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Tip:</strong> Exporteer je Google Spreadsheet als CSV (Bestand → Downloaden → CSV) en importeer het hier.
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-bold mb-2">Verwachte CSV kolommen:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><code>name</code> of <code>naam</code> of <code>klant</code> - Klantnaam (verplicht)</li>
                    <li><code>industry</code> of <code>branche</code> - Branche (optioneel)</li>
                    <li><code>website</code> - Website URL (optioneel)</li>
                    <li><code>status</code> - Status: active, prospect, churned, rejected (optioneel, default: active)</li>
                    <li><code>Aantal_medewerkers</code> of <code>employeeCount</code> - Aantal medewerkers (optioneel, numeriek)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Richting Locaties Section */}
            {dataManagementSubTab === 'locaties' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Richting Locaties</h3>
                  <button
                    onClick={() => {
                      setEditingLocatie(null);
                      setNewLocatieVestiging('');
                      setNewLocatieStad('');
                      setNewLocatieRegio('');
                      setNewLocatieAdres('');
                      setNewLocatieVolledigAdres('');
                      setNewLocatieLatitude('');
                      setNewLocatieLongitude('');
                      setShowAddLocatieModal(true);
                    }}
                    className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    + Toevoegen
                  </button>
                </div>
                <div className="space-y-4">
                  {richtingLocaties.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <p>Nog geen locaties gevonden.</p>
                    </div>
                  ) : (
                    richtingLocaties.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-richting-orange transition-colors">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{loc.vestiging}</p>
                          <p className="text-sm text-gray-500">{loc.stad}</p>
                          {loc.regio && (
                            <p className="text-xs text-gray-400 mt-1">Regio: {loc.regio}</p>
                          )}
                          {loc.volledigAdres && (
                            <p className="text-xs text-gray-400 mt-1">{loc.volledigAdres}</p>
                          )}
                          {loc.latitude && loc.longitude && (
                            <p className="text-xs text-gray-400 mt-1">
                              📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingLocatie(loc);
                              setNewLocatieVestiging(loc.vestiging);
                              setNewLocatieStad(loc.stad);
                              setNewLocatieRegio(loc.regio || '');
                              setNewLocatieAdres(loc.adres || '');
                              setNewLocatieVolledigAdres(loc.volledigAdres || '');
                              setNewLocatieLatitude(loc.latitude?.toString() || '');
                              setNewLocatieLongitude(loc.longitude?.toString() || '');
                              setShowAddLocatieModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Weet je zeker dat je locatie "${loc.vestiging}" wilt verwijderen?`)) {
                                return;
                              }
                              try {
                                await richtingLocatiesService.deleteLocatie(loc.id);
                                const updatedLocaties = await richtingLocatiesService.getAllLocaties();
                                setRichtingLocaties(updatedLocaties);
                                alert('✅ Locatie verwijderd');
                              } catch (error: any) {
                                alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                              }
                            }}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {dataManagementSubTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Documents Beheer</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportDocuments}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
                    >
                      📥 Exporteer
                    </button>
                  </div>
                </div>
                <div className="text-center py-10 text-gray-500">
                  <p>Document beheer functionaliteit komt binnenkort.</p>
                </div>
              </div>
            )}

            {/* Logo Section */}
            {dataManagementSubTab === 'logo' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Logo Beheer</h3>
                </div>
                
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Nieuw Logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Ondersteunde formaten: PNG, JPG, SVG (max. 5MB)
                      </p>
                    </div>
                    
                    {uploadingLogo && (
                      <div className="text-richting-orange font-medium">
                        ⏳ Logo wordt geüpload...
                      </div>
                    )}
                    
                    {logoUrl && (
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">Huidig Logo:</p>
                        <div className="flex justify-center">
                          <img 
                            src={logoUrl} 
                            alt="Richting Logo" 
                            className="max-h-32 max-w-full object-contain border border-gray-200 rounded-lg p-4 bg-white"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          💡 Ververs de pagina om het nieuwe logo in de sidebar te zien.
                        </p>
                      </div>
                    )}
                    
                    {!logoUrl && !uploadingLogo && (
                      <div className="text-gray-500 text-sm">
                        <p>Nog geen logo geüpload. Het standaard logo wordt gebruikt.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Customers Modal */}
      {showImportCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Klanten Importeren (CSV/Google Sheets)</h3>
              <button
                onClick={() => {
                  setShowImportCustomersModal(false);
                  setImportCustomersFile(null);
                  setImportCustomersPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CSV Bestand Selecteren</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCustomersFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Exporteer je Google Spreadsheet als CSV (Bestand → Downloaden → CSV)
                </p>
              </div>
              {importCustomersPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview ({importCustomersPreview.length} klanten)</label>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Naam</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Branche</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Website</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importCustomersPreview.slice(0, 10).map((customer, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.industry}</td>
                            <td className="px-3 py-2">{customer.website || '-'}</td>
                            <td className="px-3 py-2">{getStatusLabel(customer.status || 'prospect')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importCustomersPreview.length > 10 && (
                      <p className="text-xs text-gray-500 p-2 text-center">
                        ... en {importCustomersPreview.length - 10} meer
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleImportCustomers}
                  disabled={!importCustomersPreview || importingCustomers}
                  className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {importingCustomers ? 'Importeren...' : `Importeer ${importCustomersPreview?.length || 0} klanten`}
                </button>
                <button
                  onClick={() => {
                    setShowImportCustomersModal(false);
                    setImportCustomersFile(null);
                    setImportCustomersPreview(null);
                  }}
                  disabled={importingCustomers}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Locatie Modal */}
      {(showAddLocatieModal || editingLocatie) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingLocatie ? 'Locatie Bewerken' : 'Nieuwe Locatie Toevoegen'}
              </h3>
              <button
                onClick={() => {
                  setShowAddLocatieModal(false);
                  setEditingLocatie(null);
                  setNewLocatieVestiging('');
                  setNewLocatieStad('');
                  setNewLocatieRegio('');
                  setNewLocatieAdres('');
                  setNewLocatieVolledigAdres('');
                  setNewLocatieLatitude('');
                  setNewLocatieLongitude('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vestiging *</label>
                <input
                  type="text"
                  value={newLocatieVestiging}
                  onChange={(e) => setNewLocatieVestiging(e.target.value)}
                  placeholder="Bijv. Hoofdkantoor Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stad *</label>
                <input
                  type="text"
                  value={newLocatieStad}
                  onChange={(e) => setNewLocatieStad(e.target.value)}
                  placeholder="Bijv. Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Regio</label>
                <input
                  type="text"
                  value={newLocatieRegio}
                  onChange={(e) => setNewLocatieRegio(e.target.value)}
                  placeholder="Bijv. Noord-Holland"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                <input
                  type="text"
                  value={newLocatieAdres}
                  onChange={(e) => setNewLocatieAdres(e.target.value)}
                  placeholder="Bijv. Damrak 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volledig Adres</label>
                <input
                  type="text"
                  value={newLocatieVolledigAdres}
                  onChange={(e) => setNewLocatieVolledigAdres(e.target.value)}
                  placeholder="Bijv. Damrak 1, 1012 LG Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocatieLatitude}
                    onChange={(e) => setNewLocatieLatitude(e.target.value)}
                    placeholder="52.3676"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocatieLongitude}
                    onChange={(e) => setNewLocatieLongitude(e.target.value)}
                    placeholder="4.9041"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (!newLocatieVestiging || !newLocatieStad) {
                      alert('Vul minimaal vestiging en stad in');
                      return;
                    }

                    setSavingLocatie(true);
                    try {
                      const locatieData: Partial<RichtingLocatie> = {
                        vestiging: newLocatieVestiging,
                        stad: newLocatieStad,
                        regio: newLocatieRegio || undefined,
                        adres: newLocatieAdres || undefined,
                        volledigAdres: newLocatieVolledigAdres || undefined,
                        latitude: newLocatieLatitude ? parseFloat(newLocatieLatitude) : undefined,
                        longitude: newLocatieLongitude ? parseFloat(newLocatieLongitude) : undefined
                      };

                      if (editingLocatie) {
                        await richtingLocatiesService.updateLocatie(editingLocatie.id, locatieData);
                        alert('✅ Locatie bijgewerkt!');
                      } else {
                        await richtingLocatiesService.addLocatie(locatieData as Omit<RichtingLocatie, 'id'>);
                        alert('✅ Locatie toegevoegd!');
                      }

                      const updatedLocaties = await richtingLocatiesService.getAllLocaties();
                      setRichtingLocaties(updatedLocaties);
                      setShowAddLocatieModal(false);
                      setEditingLocatie(null);
                      setNewLocatieVestiging('');
                      setNewLocatieStad('');
                      setNewLocatieRegio('');
                      setNewLocatieAdres('');
                      setNewLocatieVolledigAdres('');
                      setNewLocatieLatitude('');
                      setNewLocatieLongitude('');
                    } catch (error: any) {
                      console.error("Error saving locatie:", error);
                      alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                    } finally {
                      setSavingLocatie(false);
                    }
                  }}
                  disabled={savingLocatie}
                  className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {savingLocatie ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button
                  onClick={() => {
                    setShowAddLocatieModal(false);
                    setEditingLocatie(null);
                    setNewLocatieVestiging('');
                    setNewLocatieStad('');
                    setNewLocatieRegio('');
                    setNewLocatieAdres('');
                    setNewLocatieVolledigAdres('');
                    setNewLocatieLatitude('');
                    setNewLocatieLongitude('');
                  }}
                  disabled={savingLocatie}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
      {currentView === 'settings' && <SettingsView user={user} />}
      {currentView === 'regio' && <RegioView user={user} />}

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