import React, { useState, useEffect } from 'react';
import { User, DocType, Customer, DocumentSource, GeminiAnalysisResult } from '../../types';
import { customerService, dbService } from '../../services/firebase';
import { analyzeContent } from '../../services/geminiService';
import { EmailIcon, GoogleDocIcon, PdfIcon } from '../../components/icons';
import { getCategoryLabel } from '../../utils/helpers';

interface UploadViewProps {
  user: User;
  onUploadComplete: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ user, onUploadComplete }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<DocType>(DocType.TEXT);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<GeminiAnalysisResult | null>(null);

  useEffect(() => {
    const loadCusts = async () => {
        const c = await customerService.getCustomersForUser(user.id, user.role);
        setCustomers(c);
    };
    loadCusts();
  }, [user]);

  const handleAnalyze = async () => {
    if (!title) { alert("Geef aub een titel op"); return; }
    if (!content && !url) return;
    setAnalyzing(true);
    
    let textToAnalyze = content;
    if (type === DocType.URL || type === DocType.GOOGLE_DOC || type === DocType.PDF) {
        textToAnalyze = `URL: ${url}\n(Inhoud niet direct beschikbaar, genereer op basis van URL of Titel: ${title})`;
    } else if (type === DocType.EMAIL) {
        textToAnalyze = `EMAIL ONDERWERP: ${title}\nINHOUD:\n${content}`;
    }

    const result = await analyzeContent(textToAnalyze);
    setAnalysis(result);
    setAnalyzing(false);
    setStep(2);
  };

  const handleSave = async () => {
    if (!analysis) return;
    const newDoc: DocumentSource = {
      id: `doc_${Date.now()}`,
      title: title || "Nieuwe Bron",
      content: content || url,
      originalUrl: url || "",
      type,
      uploadedBy: user.id,
      uploadedAt: new Date().toISOString(),
      summary: analysis.summary,
      mainCategoryId: analysis.mainCategoryId,
      subCategoryId: analysis.subCategoryId,
      tags: analysis.tags,
      viewedBy: [],
      likedBy: [],
      isArchived: false,
      customerId: customerId || undefined
    };
    await dbService.addDocument(newDoc);
    onUploadComplete();
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
         <h3 className="font-bold text-slate-800">Nieuwe Kennis Toevoegen</h3>
         <div className="flex gap-2">
            <span className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-richting-orange' : 'bg-gray-300'}`}></span>
            <span className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-richting-orange' : 'bg-gray-300'}`}></span>
         </div>
      </div>

      <div className="p-8">
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type Bron</label>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => setType(DocType.TEXT)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.TEXT ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <span>📝</span> Tekst
                </button>
                <button onClick={() => setType(DocType.URL)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.URL ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <span>🔗</span> Website
                </button>
                <button onClick={() => setType(DocType.EMAIL)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.EMAIL ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <EmailIcon /> Email
                </button>
                <button onClick={() => setType(DocType.GOOGLE_DOC)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.GOOGLE_DOC ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                  <GoogleDocIcon /> G-Doc
                </button>
                <button onClick={() => setType(DocType.PDF)} className={`py-3 px-2 rounded-lg border-2 text-xs font-bold transition-all flex flex-col items-center gap-1 ${type === DocType.PDF ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                   <PdfIcon /> PDF (Link)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                  {type === DocType.EMAIL ? 'Onderwerp' : 'Titel'}
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                placeholder={type === DocType.EMAIL ? "Onderwerp van de email" : "Titel van het document"}
                value={title}
                onChange={e => setTitle(e.target.value)}
              />
            </div>

            {/* CUSTOMER LINK OPTION */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Koppel aan Klant (Optioneel)</label>
              <select 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange bg-white"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
              >
                 <option value="">-- Geen koppeling --</option>
                 {customers.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                 ))}
              </select>
            </div>

            {type === DocType.TEXT || type === DocType.EMAIL ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{type === DocType.EMAIL ? 'Inhoud Email' : 'Inhoud'}</label>
                <textarea 
                  className="w-full h-40 px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder="Plak hier de tekst..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                ></textarea>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                <input 
                  type="url" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder={type === DocType.GOOGLE_DOC ? "https://docs.google.com/..." : "https://..."}
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                />
              </div>
            )}

            <button 
              onClick={handleAnalyze} 
              disabled={analyzing || !title}
              className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
            >
              {analyzing ? (
                <>Analyzing...</>
              ) : (
                <>✨ Analyseer & Categoriseer</>
              )}
            </button>
          </div>
        )}

        {step === 2 && analysis && (
          <div className="space-y-6">
            <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
              <h4 className="font-bold text-richting-orange mb-2 flex items-center gap-2">✨ AI Analyse Resultaat</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Samenvatting</label>
                  <p className="text-sm text-gray-800">{analysis.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                     <label className="text-xs text-gray-500 uppercase font-bold">Categorie</label>
                     <p className="text-sm font-medium">{getCategoryLabel(analysis.mainCategoryId)}</p>
                  </div>
                  <div>
                     <label className="text-xs text-gray-500 uppercase font-bold">Subcategorie</label>
                     <p className="text-sm font-medium">{getCategoryLabel(analysis.mainCategoryId, analysis.subCategoryId)}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase font-bold">Tags</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {analysis.tags.map(tag => (
                      <span key={tag} className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600">#{tag}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setStep(1)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-600 font-medium hover:bg-gray-50">Terug</button>
              <button onClick={handleSave} className="flex-1 px-4 py-2 bg-richting-orange text-white rounded-lg font-bold hover:bg-orange-600">Opslaan in Kennisbank</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

