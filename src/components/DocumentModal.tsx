import React from 'react';
import { User, DocumentSource } from '../types';
import { getCategoryLabel } from '../utils/helpers';
import { HeartIcon, ExternalLinkIcon, ArchiveIcon } from './icons';

interface DocumentModalProps {
  doc: DocumentSource;
  user: User;
  onClose: () => void;
  onAction: (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => void;
}

export const DocumentModal: React.FC<DocumentModalProps> = ({ doc, user, onClose, onAction }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center z-10">
          <span className="text-xs font-bold uppercase text-richting-orange tracking-widest">{getCategoryLabel(doc.mainCategoryId)}</span>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        
        <div className="p-8">
          <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{doc.title}</h1>
          
          <div className="flex flex-wrap gap-4 mb-8">
            <button 
              onClick={(e) => onAction(doc.id, 'like', e)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${(doc.likedBy || []).includes(user.id) ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
            >
              <HeartIcon filled={(doc.likedBy || []).includes(user.id)} />
              <span className="text-sm font-bold">{(doc.likedBy || []).length}</span>
            </button>
            
            {doc.originalUrl && (
              <a 
                href={doc.originalUrl} 
                target="_blank" 
                rel="noreferrer"
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors text-sm font-bold"
              >
                <ExternalLinkIcon /> Open Origineel
              </a>
            )}

            {user.role === 'ADMIN' && (
               <button 
                 onClick={(e) => onAction(doc.id, 'archive', e)}
                 className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm"
               >
                 <ArchiveIcon /> {doc.isArchived ? 'Dearchiveren' : 'Archiveren'}
               </button>
            )}
          </div>

          <div className="prose prose-slate max-w-none">
            <p className="text-lg text-slate-600 leading-relaxed font-medium border-l-4 border-richting-orange pl-4 mb-8 italic">
              "{doc.summary}"
            </p>
            <div className="bg-gray-50 p-6 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
              {doc.content}
            </div>
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100">
             <div className="flex flex-wrap gap-2">
                {(doc.tags || []).map(tag => (
                  <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">#{tag}</span>
                ))}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
