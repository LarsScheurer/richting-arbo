import React, { useState } from 'react';
import { User, UserRole } from '../../types';
import { authService } from '../../services/firebase';

interface SettingsViewProps {
  user: User;
  onLogout: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ user, onLogout }) => {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-slate-800">Profiel Instellingen</h3>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center text-2xl font-bold text-richting-orange">
              {user.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-bold text-lg text-slate-900">{user.name}</h4>
              <p className="text-gray-500">{user.email}</p>
              <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded uppercase">
                {user.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-slate-800">Apparaat & Sessie</h3>
        </div>
        <div className="p-6">
           <button 
             onClick={() => setShowConfirm(true)}
             className="w-full bg-red-50 text-red-600 border border-red-100 py-3 rounded-lg font-bold hover:bg-red-100 transition-colors"
           >
             Uitloggen
           </button>

           {showConfirm && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
                   <h3 className="font-bold text-lg mb-2">Weet je het zeker?</h3>
                   <p className="text-gray-600 mb-6">Je wordt uitgelogd op dit apparaat.</p>
                   <div className="flex gap-3">
                      <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 border border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50">Annuleren</button>
                      <button onClick={onLogout} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Uitloggen</button>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>

      <div className="text-center text-xs text-gray-400">
        Versie 2.1.0 • Build 2024.12.24
      </div>
    </div>
  );
};

