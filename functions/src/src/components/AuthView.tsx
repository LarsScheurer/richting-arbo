import React, { useState } from 'react';
import { RichtingLogo } from './Layout';
import { GoogleIcon } from './icons';

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

export const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGoogleLogin, onRegister, onForgot, loading, error, success, setAuthError }) => {
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

