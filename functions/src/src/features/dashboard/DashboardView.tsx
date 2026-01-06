import React, { useMemo } from 'react';
import { User, DocumentSource } from '../../types';
import { EyeIcon, HeartIcon } from '../../components/icons';
import { getCategoryLabel } from '../../utils/helpers';

interface DashboardViewProps {
  documents: DocumentSource[];
  user: User;
  setView: (view: string) => void;
  openDocument: (doc: DocumentSource) => void;
  handleDocumentAction: (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ documents, user, setView, openDocument }) => {
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

