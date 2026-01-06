import React from 'react';

export const DatabaseErrorView = () => (
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

