import React, { useState, useMemo } from 'react';
import { DocumentSource, KNOWLEDGE_STRUCTURE } from '../../types';
import { getCategoryLabel } from '../../utils/helpers';

interface KnowledgeViewProps {
  documents: DocumentSource[];
  openDocument: (d: DocumentSource) => void;
}

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ documents, openDocument }) => {
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

