import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { authService } from '../services/firebase';

// Omdat we in deze omgeving geen lokale bestanden kunnen uploaden, 
// halen we het officiele logo op via een image proxy. 
const LOGO_URL = "https://wsrv.nl/?url=richting.nl/wp-content/uploads/2019/12/logo-richting.png&w=400&output=png";

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
}

export const RichtingLogo: React.FC<{ className?: string }> = ({ className = "h-10" }) => {
  return (
    <img 
      src={LOGO_URL}
      alt="Richting" 
      className={`${className} object-contain`} 
    />
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, currentView, onNavigate }) => {
  if (!user) {
    return <div className="min-h-screen bg-gray-50 flex flex-col">{children}</div>;
  }

  const navItems = [
    { id: 'dashboard', label: 'De Krant', icon: '📰' },
    { id: 'customers', label: 'Klanten', icon: '💼' },
    { id: 'knowledge', label: 'Kennisbank', icon: '📚' },
    { id: 'chat', label: 'Vraag het Gemini', icon: '✨' },
    { id: 'upload', label: 'Nieuwe Bron', icon: '➕' },
  ];

  const handleRoleSwitch = async (role: UserRole) => {
      await authService.updateUserRole(user.id, role);
      // Force reload to reflect changes
      window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-slate-800">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm sticky top-0 h-auto md:h-screen z-10">
        <div className="p-6 border-b border-gray-100 flex justify-center md:justify-start">
          <RichtingLogo className="h-8 md:h-10 w-auto" />
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                currentView === item.id
                  ? 'bg-orange-50 text-richting-orange border-l-4 border-richting-orange'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-slate-900'
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2 mb-4 px-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs font-medium text-green-700">Database: Richting01</span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm bg-gray-200"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user.name}</p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-gray-500 truncate">{user.role}</p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={onLogout}
            className="w-full text-xs text-gray-500 hover:text-red-600 font-medium text-left px-1 flex items-center gap-1 mb-4"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Uitloggen
          </button>

          {/* DEV TOOLS FOR ROLE SWITCHING */}
          <div className="pt-4 border-t border-gray-200">
             <p className="text-[10px] uppercase font-bold text-gray-400 mb-2">Dev Tools (Rollen)</p>
             <div className="flex gap-2">
                <button 
                  onClick={() => handleRoleSwitch(UserRole.ADMIN)}
                  className={`flex-1 text-[10px] py-1 rounded border ${user.role === UserRole.ADMIN ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                  Admin
                </button>
                <button 
                  onClick={() => handleRoleSwitch(UserRole.EDITOR)}
                  className={`flex-1 text-[10px] py-1 rounded border ${user.role === UserRole.EDITOR ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-gray-600 border-gray-300'}`}
                >
                  Editor
                </button>
             </div>
          </div>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};