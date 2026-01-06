import React from 'react';

export const DatabaseErrorView = () => (
  <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-lg shadow-lg border border-red-200 max-w-md text-center">
       <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
       <h2 className="text-xl font-bold text-red-700 mb-2">Database Fout</h2>
       <p className="text-gray-600 mb-4">
         De database 'richting01' kon niet worden gevonden of bereikt. 
         Controleer of de database correct is aangemaakt in de Firebase Console.
       </p>
       <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
         Error: FIREBASE_DB_NOT_FOUND
       </p>
       <button onClick={() => window.location.reload()} className="mt-6 bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700">
         Opnieuw Proberen
       </button>
    </div>
  </div>
);

