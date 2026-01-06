import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { app, customerService, analyseBedrijf } from '../../../../../services/firebase'; // Pas dit pad aan als het nodig is
import { CompanyAnalysisResponse, RisicoCategorie } from './types';
import { User, Customer } from '../../../../../types';
import { ensureUrl } from '../../../utils/helpers';

// --- VISUALISATIE HULPFUNCTIES ---

// Kleur bepalen op basis van Fine & Kinney score
const getScoreColor = (score: number) => {
  if (score < 20) return 'text-green-600 bg-green-50 border-green-200';
  if (score < 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  if (score < 200) return 'text-orange-600 bg-orange-50 border-orange-200';
  return 'text-red-600 bg-red-50 border-red-200';
};

const getScoreLabel = (score: number) => {
  if (score < 20) return 'Laag Risico';
  if (score < 70) return 'Mogelijk Risico';
  if (score < 200) return 'Hoog Risico';
  return 'Acuut Risico';
};

interface CompanyAnalyzerProps {
  user?: User | null;
}

export default function CompanyAnalyzer({ user }: CompanyAnalyzerProps) {
  // --- STATE ---
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({ companyName: '', websiteUrl: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CompanyAnalysisResponse | null>(null);
  const [saving, setSaving] = useState(false);

  // --- ACTIES ---
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Gebruik de service functie die via httpsCallable werkt
      const resultData = await analyseBedrijf(inputs.companyName, inputs.websiteUrl);
      setData(resultData as CompanyAnalysisResponse);
    } catch (err: any) {
      console.error(err);
      setError('Er ging iets mis bij het ophalen van de analyse: ' + (err.message || 'Onbekende fout'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProspect = async () => {
    if (!data || !user) return;
    setSaving(true);

    try {
      // 1. Data mapping
      const medewerkersString = data.sbi_data?.locaties?.aantal_medewerkers_totaal || '';
      // Probeer een getal te extraheren (bijv. "Ca. 50" -> 50)
      const medewerkersMatch = medewerkersString.match(/\d+/);
      const employeeCount = medewerkersMatch ? parseInt(medewerkersMatch[0]) : undefined;

      const newCustomer: Customer = {
        id: `cust_${Date.now()}`,
        name: data.bedrijfsprofiel?.naam || inputs.companyName,
        industry: data.bedrijfsprofiel?.sector_beschrijving || 'Onbekend',
        website: ensureUrl(inputs.websiteUrl),
        status: 'prospect',
        assignedUserIds: [user.id],
        createdAt: new Date().toISOString(),
        employeeCount: employeeCount,
        klantreis: {
          levels: [
            { level: 1 as const, name: 'Publiek Organisatie Profiel', status: 'completed' as const },
            { level: 2 as const, name: 'Publiek Risico Profiel', status: 'not_started' as const },
            { level: 3 as const, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
          ],
          lastUpdated: new Date().toISOString()
        }
      };

      // 2. Opslaan
      await customerService.addCustomer(newCustomer);

      // 3. Feedback & Redirect
      alert('✅ Prospect succesvol opgeslagen! Je wordt nu doorgestuurd naar het dossier.');
      navigate('/customers'); // Redirect naar klantenlijst
      
    } catch (error: any) {
      console.error("Error saving prospect:", error);
      alert(`❌ Fout bij opslaan: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  // --- RENDER: 1. HET FORMULIER (Als er nog geen data is) ---
  if (!data && !loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-10 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nieuw Publiek Organisatie Profiel Starten</h2>
        <p className="text-gray-500 mb-6">Voer de klantgegevens in voor een Level 1 AI-scan.</p>
        
        {error && <div className="p-3 bg-red-50 text-red-600 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleAnalyze} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam</label>
            <input
              type="text"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Bijv. Richting B.V."
              value={inputs.companyName}
              onChange={(e) => setInputs({ ...inputs, companyName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <input
              type="url"
              required
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="https://www.richting.nl"
              value={inputs.websiteUrl}
              onChange={(e) => setInputs({ ...inputs, websiteUrl: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Genereer Profiel
          </button>
        </form>
      </div>
    );
  }

  // --- RENDER: 2. LOADING STATE ---
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <h3 className="text-xl font-semibold text-gray-700">De AI Analist is aan het werk...</h3>
        <p className="text-gray-500 mt-2">Websites worden gelezen, CAO's gezocht en risico's berekend.</p>
        <p className="text-sm text-gray-400 mt-1">(Dit duurt ongeveer 20-40 seconden)</p>
      </div>
    );
  }

  // --- RENDER: 3. HET DASHBOARD (Als er data is) ---
  if (data) {
    // Check if data is available before rendering
    if (!data.bedrijfsprofiel) {
        return (
            <div className="max-w-2xl mx-auto p-6 bg-red-50 rounded-xl mt-10 border border-red-100 text-center">
                <h3 className="text-red-700 font-bold mb-2">Er ging iets mis met de data structuur</h3>
                <p className="text-red-600 mb-4">De AI heeft geen geldig bedrijfsprofiel geretourneerd.</p>
                <button onClick={() => setData(null)} className="text-red-800 underline">Probeer opnieuw</button>
            </div>
        );
    }

    return (
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* HEADER */}
        <div className="flex justify-between items-start bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{data.bedrijfsprofiel.naam}</h1>
            <p className="text-gray-500 mt-1">{data.bedrijfsprofiel.sector_beschrijving}</p>
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              CAO: {data.bedrijfsprofiel.cao?.status_onderhandelingen || 'Onbekend'}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="text-right">
              <p className="text-sm text-gray-400">Gegenereerd op</p>
              <p className="font-medium">{data.metadata?.gegenereerd_op || new Date().toLocaleDateString()}</p>
            </div>
            
            {user && (
              <button
                onClick={handleSaveProspect}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-richting-orange text-white rounded-lg font-bold hover:bg-orange-600 transition-colors shadow-md disabled:opacity-50"
              >
                {saving ? '⏳ Opslaan...' : '💾 Opslaan als Prospect'}
              </button>
            )}
          </div>
        </div>

        {/* SCORE KAART */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className={`col-span-1 p-6 rounded-xl border-2 flex flex-col items-center justify-center text-center ${getScoreColor(data.risico_analyse?.totaal_score || 0)}`}>
            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Totaal Risico Score</span>
            <span className="text-6xl font-extrabold my-2">{data.risico_analyse?.totaal_score || 0}</span>
            <span className="px-3 py-1 bg-white bg-opacity-50 rounded-full text-sm font-bold">
              {getScoreLabel(data.risico_analyse?.totaal_score || 0)}
            </span>
          </div>
          
          <div className="col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="font-bold text-gray-800 mb-3">Toelichting Analist</h3>
             <p className="text-gray-600 leading-relaxed">{data.risico_analyse?.toelichting_score || 'Geen toelichting beschikbaar.'}</p>
             <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                <div>
                   <span className="block text-xs text-gray-400 uppercase">Aantal Medewerkers</span>
                   <span className="font-medium">{data.sbi_data?.locaties?.aantal_medewerkers_totaal || 'Onbekend'}</span>
                </div>
                <div>
                   <span className="block text-xs text-gray-400 uppercase">Dichtstbijzijnde Vestiging</span>
                   <span className="font-medium text-blue-600">{data.sbi_data?.locaties?.dichtstbijzijnde_richting_vestiging || 'Onbekend'}</span>
                </div>
             </div>
          </div>
        </div>

        {/* RISICO TABEL (FINE & KINNEY) */}
        {data.risico_analyse?.categorieen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <h3 className="font-bold text-gray-800">Risico Analyse (Fine & Kinney)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Risico</th>
                  <th className="px-6 py-3">Waarschijnlijkheid</th>
                  <th className="px-6 py-3">Blootstelling</th>
                  <th className="px-6 py-3">Ernst</th>
                  <th className="px-6 py-3 text-right">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.risico_analyse.categorieen.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{item.risico}</td>
                    <td className="px-6 py-4 text-gray-500">{item.waarschijnlijkheid}</td>
                    <td className="px-6 py-4 text-gray-500">{item.blootstelling}</td>
                    <td className="px-6 py-4 text-gray-500">{item.ernst}</td>
                    <td className="px-6 py-4 text-right font-bold">
                       <span className={`px-2 py-1 rounded ${getScoreColor(item.score).replace('bg-opacity-50', '')} bg-opacity-20`}>
                         {item.score}
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* STAPPENPLAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-gray-800 mb-4">Advies Stappenplan</h3>
               <ul className="space-y-4">
                  {data.advies_en_actie?.stappenplan?.map((stap, idx) => (
                     <li key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                           {stap.stap}
                        </div>
                        <div>
                           <p className="font-medium text-gray-900">{stap.actie}</p>
                           <p className="text-sm text-gray-500 mt-1">{stap.omschrijving}</p>
                        </div>
                     </li>
                  ))}
               </ul>
            </div>

            {/* SERVICES KAARTEN */}
            <div className="space-y-4">
               <h3 className="font-bold text-gray-800 px-1">Aanbevolen Diensten</h3>
               {data.advies_en_actie?.voorgestelde_richting_services?.map((service, idx) => (
                  <a 
                    key={idx} 
                    href={service.url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all group"
                  >
                     <div className="flex justify-between items-center mb-2">
                        <h4 className="font-bold text-blue-900 group-hover:text-blue-600">{service.dienst}</h4>
                        <span className="text-gray-400 group-hover:translate-x-1 transition-transform">→</span>
                     </div>
                     <p className="text-sm text-gray-500">{service.reden}</p>
                  </a>
               ))}
            </div>
        </div>

        {/* KNOP OPNIEUW */}
        <div className="text-center pt-8">
           <button 
             onClick={() => setData(null)}
             className="text-gray-500 hover:text-gray-700 underline text-sm"
           >
             Nieuwe analyse starten
           </button>
        </div>
      </div>
    );
  }
  
  return null;
}


