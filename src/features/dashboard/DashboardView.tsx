import React, { useState } from 'react';
import { User, DocumentSource } from '../../types';
import { getCategoryLabel } from '../../utils/helpers';
import { getDocIcon } from '../../utils/docIcons';
import { ArchiveIcon, HeartIcon, ExternalLinkIcon, EyeIcon } from '../../components/icons';

interface DashboardViewProps {
  documents: DocumentSource[];
  user: User;
  setView: (view: string) => void;
  openDocument: (d: DocumentSource) => void;
  handleDocumentAction: (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ documents, user, setView, openDocument, handleDocumentAction }) => {
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'favorites'>('recent');

  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 5);

  const popularDocs = [...documents]
    .sort((a, b) => (b.viewedBy?.length || 0) - (a.viewedBy?.length || 0))
    .slice(0, 5);

  const favoriteDocs = documents.filter(d => (d.likedBy || []).includes(user.id));

  const displayDocs = activeTab === 'recent' ? recentDocs : activeTab === 'popular' ? popularDocs : favoriteDocs;

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-100 to-transparent rounded-bl-full opacity-50"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Goedemorgen, {user.name.split(' ')[0]}! 👋</h1>
          <p className="text-gray-600 max-w-2xl">
            Welkom terug op de Kennisbank. Er zijn <span className="font-bold text-richting-orange">{documents.length}</span> bronnen beschikbaar.
            Stel je vraag aan Gemini of blader door de laatste updates.
          </p>
          
          <div className="mt-6 flex gap-3">
            <button 
              onClick={() => setView('chat')}
              className="bg-richting-orange text-white px-6 py-3 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 flex items-center gap-2"
            >
              <span className="text-xl">✨</span> Vraag het Gemini
            </button>
            <button 
              onClick={() => setView('knowledge')}
              className="bg-white text-slate-700 border border-gray-200 px-6 py-3 rounded-lg font-bold hover:bg-gray-50 transition-colors"
            >
              📚 Naar Kennisbank
            </button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-2xl">📚</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Totaal Bronnen</p>
            <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-2xl">👁️</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gelezen door jou</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => (d.viewedBy || []).includes(user.id)).length}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-2xl">❤️</div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Jouw Favorieten</p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.filter(d => (d.likedBy || []).includes(user.id)).length}
            </p>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 flex px-6">
          <button 
            onClick={() => setActiveTab('recent')}
            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'recent' ? 'border-richting-orange text-richting-orange' : 'border-transparent text-gray-500 hover:text-slate-700'}`}
          >
            🕒 Recent Toegevoegd
          </button>
          <button 
            onClick={() => setActiveTab('popular')}
            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'popular' ? 'border-richting-orange text-richting-orange' : 'border-transparent text-gray-500 hover:text-slate-700'}`}
          >
            🔥 Populair
          </button>
          <button 
            onClick={() => setActiveTab('favorites')}
            className={`py-4 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'favorites' ? 'border-richting-orange text-richting-orange' : 'border-transparent text-gray-500 hover:text-slate-700'}`}
          >
            ❤️ Favorieten
          </button>
        </div>

        <div className="p-6">
          {displayDocs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 italic">Geen documenten gevonden in deze categorie.</p>
              {activeTab === 'favorites' && (
                <button onClick={() => setView('knowledge')} className="mt-2 text-richting-orange font-bold text-sm hover:underline">
                  Blader door kennisbank om favorieten toe te voegen
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {displayDocs.map((doc) => (
                <div 
                  key={doc.id}
                  onClick={() => openDocument(doc)}
                  className="group flex items-start gap-4 p-4 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                >
                  <div className="w-10 h-10 rounded bg-white border border-gray-200 flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                    {getDocIcon(doc.type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-slate-900 group-hover:text-richting-orange transition-colors truncate pr-4">
                        {doc.title}
                      </h3>
                      <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                        {getCategoryLabel(doc.mainCategoryId)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1 mb-2">
                      {doc.summary}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><EyeIcon /> {(doc.viewedBy || []).length}</span>
                        <span className="flex items-center gap-1"><HeartIcon filled={(doc.likedBy || []).length > 0} /> {(doc.likedBy || []).length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => handleDocumentAction(doc.id, 'like', e)}
                      className={`p-2 rounded-full hover:bg-white ${
                        (doc.likedBy || []).includes(user.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                      }`}
                    >
                      <HeartIcon filled={(doc.likedBy || []).includes(user.id)} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
