import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, Customer, Location, DocumentSource, UserRole } from '../../types';
import { customerService, dbService, processService, functionService, substanceService } from '../../services/firebase';
import { FUNCTIONS_BASE_URL } from '../../config';
import { getCompanyLogoUrl, ensureUrl } from '../../utils/helpers';
import { GoogleIcon, TrashIcon, MapIcon, ExternalLinkIcon, ArchiveIcon } from '../../components/icons';
import { generateOrganisatieProfielPDF } from '../../utils/pdfGenerator';

interface CustomerDetailViewProps {
  customer: Customer;
  user: User;
  onBack: () => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (customerId: string) => void;
  onOpenDoc: (doc: DocumentSource) => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({ 
  customer, 
  user,
  onBack, 
  onUpdate, 
  onDelete,
  onOpenDoc
}) => {
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overzicht');
  const [locations, setLocations] = useState<Location[]>([]);
  const [customerDocs, setCustomerDocs] = useState<DocumentSource[]>([]);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);
  const [isImportingDrive, setIsImportingDrive] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState(customer.name);
  const [editWebsite, setEditWebsite] = useState(customer.website || '');
  const [editDriveFolderId, setEditDriveFolderId] = useState(customer.driveFolderId || '');
  const [editIndustry, setEditIndustry] = useState(customer.industry);
  const [editEmployeeCount, setEditEmployeeCount] = useState(customer.employeeCount?.toString() || '');

  useEffect(() => {
    loadData();
  }, [customer.id]);

  const loadData = async () => {
    try {
      const locs = await customerService.getLocations(customer.id);
      setLocations(locs);
      loadDocuments();
    } catch (e) {
      console.error("Error loading customer data:", e);
    }
  };

  const loadDocuments = async () => {
    setLoadingDocs(true);
    try {
      // In een echte app zou je hier een query doen op customerId
      // Nu simuleren we het door alle docs te filteren (of als je een query hebt, gebruik die)
      const allDocs = await dbService.getDocuments();
      const relevant = allDocs.filter(d => d.customerId === customer.id || d.metadata?.customerId === customer.id);
      setCustomerDocs(relevant);
    } catch (e) {
      console.error("Error loading docs:", e);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSave = async () => {
    try {
      await customerService.updateCustomer(customer.id, {
        name: editName,
        website: editWebsite,
        driveFolderId: editDriveFolderId,
        industry: editIndustry,
        employeeCount: editEmployeeCount ? parseInt(editEmployeeCount) : undefined
      });
      
      onUpdate({ 
        ...customer, 
        name: editName, 
        website: editWebsite,
        driveFolderId: editDriveFolderId,
        industry: editIndustry,
        employeeCount: editEmployeeCount ? parseInt(editEmployeeCount) : undefined
      });
      
      setIsEditing(false);
    } catch (error: any) {
      alert(`Fout bij opslaan: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    if (user.role !== 'ADMIN') {
        alert("Geen rechten. Alleen een administrator kan klanten verwijderen."); 
        return;
    }
    
    if (!window.confirm(`LET OP: Weet je zeker dat je '${customer.name}' definitief wilt verwijderen?`)) {
        return;
    }

    try {
        await customerService.deleteCustomer(customer.id);
        onDelete(customer.id);
    } catch (e: any) {
        alert(`Kon klant niet verwijderen: ${e.message}`);
    }
  };

  const handleFetchLocations = async () => {
    if (!customer.website) {
      alert('Geen website bekend voor deze klant. Voeg eerst een website toe.');
      return;
    }

    setIsFetchingLocations(true);
    try {
      const functionsUrl = `${FUNCTIONS_BASE_URL}/fetchLocationsForCustomer`;
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          website: customer.website
        })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (data.success) {
          alert(`✅ Locaties opgehaald: ${data.message}`);
          loadData(); // Reload locations
      } else {
          alert(`⚠️ Geen locaties gevonden.`);
      }
    } catch (error: any) {
      console.error("Location Fetch Error:", error);
      alert(`❌ Fout bij ophalen locaties: ${error.message}`);
    } finally {
      setIsFetchingLocations(false);
    }
  };

  const handleImportFromDrive = async () => {
    if (!customer.driveFolderId) {
      alert('Geen Google Drive Map ID ingesteld. Vul dit eerst in bij "Bewerken".');
      return;
    }

    if (!window.confirm(`Weet je zeker dat je documenten wilt importeren uit map ${customer.driveFolderId}? Dit kan even duren.`)) {
        return;
    }

    setIsImportingDrive(true);
    try {
      const functionsUrl = `${FUNCTIONS_BASE_URL}/importDocumentsFromDrive`;
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: customer.id,
          driveFolderId: customer.driveFolderId
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      alert(`✅ Import geslaagd!\n\n${result.message}`);
      loadDocuments(); // Refresh list
    } catch (error: any) {
      console.error("Drive Import Error:", error);
      alert(`❌ Fout bij importeren: ${error.message}`);
    } finally {
      setIsImportingDrive(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 min-h-[calc(100vh-140px)]">
      {/* HEADER */}
      <div className="border-b border-gray-200 p-6 flex justify-between items-start">
        <div className="flex gap-4">
          <button onClick={onBack} className="mt-1 p-2 hover:bg-gray-100 rounded-full transition-colors">
            ←
          </button>
          <div className="w-16 h-16 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden">
             {customer.logoUrl || getCompanyLogoUrl(customer.website) ? (
                 <img src={customer.logoUrl || getCompanyLogoUrl(customer.website)!} className="w-full h-full object-contain p-1" />
             ) : (
                 <span className="text-3xl">🏢</span>
             )}
          </div>
          <div>
            {isEditing ? (
                <div className="space-y-2">
                    <input 
                      className="text-2xl font-bold text-slate-900 border border-gray-300 rounded px-2 py-1 w-full"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input 
                          className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1"
                          value={editIndustry}
                          onChange={e => setEditIndustry(e.target.value)}
                          placeholder="Branche"
                        />
                        <input 
                          className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1"
                          value={editWebsite}
                          onChange={e => setEditWebsite(e.target.value)}
                          placeholder="Website"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">Drive ID:</span>
                        <input 
                          className="text-sm text-gray-600 border border-gray-300 rounded px-2 py-1 flex-1"
                          value={editDriveFolderId}
                          onChange={e => setEditDriveFolderId(e.target.value)}
                          placeholder="Google Drive Folder ID"
                        />
                    </div>
                </div>
            ) : (
                <>
                    <h2 className="text-2xl font-bold text-slate-900">{customer.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <span>{customer.industry}</span>
                        {customer.website && (
                            <>
                                <span>•</span>
                                <a href={ensureUrl(customer.website)} target="_blank" rel="noreferrer" className="text-richting-orange hover:underline flex items-center gap-1">
                                    {customer.website} <ExternalLinkIcon />
                                </a>
                            </>
                        )}
                        {customer.driveFolderId && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1 text-green-600" title={`Drive ID: ${customer.driveFolderId}`}>
                                    <GoogleIcon /> G-Drive Gekoppeld
                                </span>
                            </>
                        )}
                    </div>
                </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
            {isEditing ? (
                <>
                    <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annuleren</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-richting-orange text-white rounded-lg font-bold hover:bg-orange-600">Opslaan</button>
                </>
            ) : (
                <>
                    <button onClick={() => setIsEditing(true)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">Bewerken</button>
                    {user.role === 'ADMIN' && (
                        <button onClick={handleDelete} className="px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium flex items-center gap-2">
                            <TrashIcon /> Verwijderen
                        </button>
                    )}
                </>
            )}
        </div>
      </div>

      {/* TABS */}
      <div className="border-b border-gray-200 px-6">
        <div className="flex gap-6">
            {['overzicht', 'documenten', 'risicos', 'processen'].map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-richting-orange text-richting-orange' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="p-6">
        {activeTab === 'overzicht' && (
            <div className="space-y-8">
                {/* Locaties Sectie */}
                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2"><MapIcon /> Locaties</h3>
                        <button 
                            onClick={handleFetchLocations} 
                            disabled={isFetchingLocations}
                            className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-bold transition-colors"
                        >
                            {isFetchingLocations ? 'Ophalen...' : 'Locaties Ophalen'}
                        </button>
                    </div>
                    {locations.length === 0 ? (
                        <p className="text-gray-500 italic">Nog geen locaties bekend.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {locations.map(loc => (
                                <div key={loc.id} className="border border-gray-200 p-4 rounded-lg bg-gray-50">
                                    <p className="font-bold text-slate-900">{loc.name}</p>
                                    <p className="text-sm text-gray-600">{loc.address}, {loc.city}</p>
                                    <p className="text-xs text-gray-500 mt-2">{loc.employeeCount || 0} medewerkers</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        )}

        {activeTab === 'documenten' && (
            <div className="space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-900">Documenten & Dossier</h3>
                    <button 
                        onClick={handleImportFromDrive}
                        disabled={isImportingDrive}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {isImportingDrive ? (
                            <>⏳ Importeren...</>
                        ) : (
                            <><GoogleIcon /> Importeer uit Drive</>
                        )}
                    </button>
                </div>

                {loadingDocs ? (
                    <div className="text-center py-10 text-gray-500">Documenten laden...</div>
                ) : customerDocs.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <p className="text-gray-500">Nog geen documenten in dit dossier.</p>
                        {customer.driveFolderId ? (
                            <p className="text-sm text-green-600 mt-2">Tip: Importeer uit de gekoppelde Drive map.</p>
                        ) : (
                            <p className="text-sm text-orange-600 mt-2">Tip: Koppel een Google Drive map in 'Bewerken'.</p>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {customerDocs.map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer" onClick={() => onOpenDoc(doc)}>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-50 rounded flex items-center justify-center text-xl">📄</div>
                                    <div>
                                        <p className="font-bold text-slate-900">{doc.title}</p>
                                        <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()} • {doc.type}</p>
                                    </div>
                                </div>
                                <span className="px-2 py-1 bg-gray-100 text-xs rounded text-gray-600">{getCategoryLabel(doc.mainCategoryId)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}
        
        {/* Placeholder voor andere tabs */}
        {(activeTab === 'risicos' || activeTab === 'processen') && (
            <div className="text-center py-10 text-gray-400 italic">
                Deze functionaliteit is nog in ontwikkeling voor de nieuwe modulaire structuur.
            </div>
        )}
      </div>
    </div>
  );
};
