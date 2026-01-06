import { KNOWLEDGE_STRUCTURE } from '../types';

export const getCategoryLabel = (mainId: string, subId?: string) => {
  const main = KNOWLEDGE_STRUCTURE.find(c => c.id === mainId);
  if (!subId) return main?.label || mainId;
  const sub = main?.subCategories.find(s => s.id === subId);
  return sub?.label || subId;
};

export const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Actief';
    case 'churned': return 'Beëindigd';
    case 'prospect': return 'Prospect';
    case 'rejected': return 'Afgewezen';
    default: return status;
  }
};

export const ensureUrl = (url: string) => {
  if (!url) return '';
  url = url.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

export const getCompanyLogoUrl = (websiteUrl: string | undefined) => {
  if (!websiteUrl) return undefined;
  const cleanUrl = ensureUrl(websiteUrl);
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=128`;
};

export const getFriendlyErrorMessage = (code: string): string => {
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

