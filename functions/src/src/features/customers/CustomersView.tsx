import React, { useState, useEffect, useCallback } from 'react';
import { User, Customer, DocumentSource } from '../../types';
import { customerService, authService } from '../../services/firebase';
import { CustomerDetailView } from './CustomerDetailView';
import { ArchiveIcon, TrashIcon, ExternalLinkIcon } from '../../components/icons';
import { FUNCTIONS_BASE_URL } from '../../config';
import { getStatusLabel, ensureUrl, getCompanyLogoUrl } from '../../utils/helpers';

interface CustomersViewProps {
  user: User;
  onOpenDoc: (d: DocumentSource) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ user, onOpenDoc }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allUsers, setAllUsers] = useState<User[]>([]); 
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [loading, setLoading] = useState(true);

  // New Customer Form State
  const [newName, setNewName] = useState('');
  const [newWebsite, setNewWebsite] = useState('');
  
  // Website Search State
  const [isSearchingWebsite, setIsSearchingWebsite] = useState(false);
  const [websiteResults, setWebsiteResults] = useState<Array<{url: string, title: string, snippet: string, confidence: string}>>([]);
  const [selectedWebsite, setSelectedWebsite] = useState<string>('');
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      console.log('Fetching customers for user:', user.id, user.role);
      const custs = await customerService.getCustomersForUser(user.id, user.role);
      console.log('Fetched customers:', custs.length);
      const users = await authService.getAllUsers();
      setCustomers(custs);
      setAllUsers(users);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const searchWebsite = useCallback(async (companyName: string) => {
    if (!companyName.trim()) {
      return;
    }

    setIsSearchingWebsite(true);
    setWebsiteResults([]);
    setSelectedWebsite('');
    setHasSearched(false);

    try {
      // Call Firebase Function to search for website
      const functionsUrl = `${FUNCTIONS_BASE_URL}/searchCompanyWebsite`;
      const response = await fetch(functionsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ companyName })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const websites = data.websites || [];
      
      setWebsiteResults(websites);
      setHasSearched(true);
      
      // Auto-select best match (first result)
      if (websites.length > 0) {
        setSelectedWebsite(websites[0].url);
        setNewWebsite(websites[0].url.replace(/^https?:\/\//, ''));
      }
    } catch (error) {
      console.error("Error searching website:", error);
      setHasSearched(true);
      setWebsiteResults([]);
    } finally {
      setIsSearchingWebsite(false);
    }
  }, []);

  // Auto-search when name changes (with debounce)
  useEffect(() => {
    if (!newName.trim() || !showAddModal) {
      setWebsiteResults([]);
      setSelectedWebsite('');
      setNewWebsite('');
      setHasSearched(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      searchWebsite(newName);
    }, 1000); // Wait 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [newName, showAddModal, searchWebsite]);

  const handleAddCustomer = async () => {
    if (!newName) {
      alert("Voer een bedrijfsnaam in");
      return;
    }
    
    if (!selectedWebsite && !newWebsite) {
      alert("Selecteer een website of voer handmatig een website in");
      return;
    }
    
    // Use selected website or manually entered website
    const websiteToUse = selectedWebsite || newWebsite;
    
    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: newName,
      industry: '', // Empty by default
      website: websiteToUse ? ensureUrl(websiteToUse) : undefined,
      logoUrl: undefined,
      status: 'prospect', // Start as prospect
      assignedUserIds: [user.id], // Only current user by default
      createdAt: new Date().toISOString(),
      klantreis: {
        levels: [
          { level: 1 as const, name: 'Publiek Organisatie Profiel', status: 'not_started' as const },
          { level: 2 as const, name: 'Publiek Risico Profiel', status: 'not_started' as const },
          { level: 3 as const, name: 'Publiek Cultuur Profiel', status: 'not_started' as const }
        ],
        lastUpdated: new Date().toISOString()
      }
    };

    await customerService.addCustomer(newCustomer);
    setCustomers(prev => [...prev, newCustomer]);
    setShowAddModal(false);
    
    // Show customer detail view first (not Klantreis view)
    // User can start Klantreis manually from the detail view
    setSelectedCustomer(newCustomer);
    
    // Reset all form state
    setNewName('');
    setNewWebsite('');
    setWebsiteResults([]);
    setSelectedWebsite('');
    setHasSearched(false);
  };


  const toggleCustomerSelection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerIds(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleBulkArchive = async () => {
    for (const id of selectedCustomerIds) {
       await customerService.updateCustomerStatus(id, 'churned');
    }
    setCustomers(prev => prev.map(c => selectedCustomerIds.includes(c.id) ? { ...c, status: 'churned' } : c));
    setSelectedCustomerIds([]);
  };

  const handleBulkDelete = async () => {
    // Extra veiligheidscheck voor rol
    if (user.role !== 'ADMIN') {
        alert("Alleen beheerders mogen verwijderen.");
        return;
    }

    if (!window.confirm(`Weet je zeker dat je ${selectedCustomerIds.length} klanten definitief wilt verwijderen?`)) return;
    
    try {
        for (const id of selectedCustomerIds) {
           await customerService.deleteCustomer(id);
        }
        setCustomers(prev => prev.filter(c => !selectedCustomerIds.includes(c.id)));
        setSelectedCustomerIds([]);
        alert("Klanten verwijderd.");
    } catch (error) {
        console.error("Verwijderen mislukt:", error);
        alert("Er ging iets mis bij het verwijderen.");
    }
  };

  // Callback for when a customer is updated in the detail view
  const handleCustomerUpdate = (updated: Customer) => {
      setCustomers(prev => prev.map(c => {
        // Update the exact match
        if (c.id === updated.id) return updated;
        
        // Also update duplicates by name to keep UI consistent (e.g. status changes)
        // This handles cases where duplicate customers exist in the database
        if (c.name?.trim().toLowerCase() === updated.name?.trim().toLowerCase()) {
           // We only sync status and some key fields to avoid data loss on specific fields
           return { 
             ...c, 
             status: updated.status,
             // Optional: sync other fields if needed
           };
        }
        return c;
      }));
      setSelectedCustomer(updated); // Update the detail view as well
  };

  // Callback for when a customer is deleted
  const handleCustomerDelete = (id: string) => {
      setCustomers(prev => prev.filter(c => c.id !== id));
      setSelectedCustomer(null); // Go back to list
  };

  if (selectedCustomer) {
    return <CustomerDetailView 
        customer={selectedCustomer} 
        user={user}
        onBack={() => setSelectedCustomer(null)} 
        onUpdate={handleCustomerUpdate}
        onDelete={handleCustomerDelete}
        onOpenDoc={onOpenDoc}
    />;
  }

  // CUSTOM SORT LOGIC: Prospect -> Actief -> Archief (churned) -> Afgewezen (rejected)
  const sortedCustomers = [...customers].sort((a, b) => {
    const statusOrder: Record<string, number> = { 'prospect': 0, 'active': 1, 'churned': 2, 'rejected': 3 };
    const orderA = statusOrder[a.status] ?? 99;
    const orderB = statusOrder[b.status] ?? 99;
    
    if (orderA !== orderB) return orderA - orderB;
    // Fallback: Nieuwste eerst
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Klanten & Dossiers</h2>
        
        <div className="flex gap-3">
            {selectedCustomerIds.length > 0 && (
                <>
                   <button 
                     onClick={handleBulkArchive}
                     className="bg-gray-100 text-slate-600 px-4 py-2 rounded-lg font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
                   >
                     <ArchiveIcon /> Archiveren ({selectedCustomerIds.length})
                   </button>
                   {user.role === 'ADMIN' && (
                     <button 
                       onClick={handleBulkDelete}
                       className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center gap-2"
                     >
                       <TrashIcon /> Verwijderen ({selectedCustomerIds.length})
                     </button>
                   )}
                </>
            )}
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <span className="text-lg">+</span> Nieuwe Klant
            </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-500">Laden...</div>
      ) : customers.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">Je bent nog niet gekoppeld aan klanten.</p>
          <button onClick={() => setShowAddModal(true)} className="text-richting-orange font-bold hover:underline">Maak je eerste klant aan</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCustomers.map(cust => {
             // LOGIC: Manual Logo > Auto Website Logo > Blank
             const logoSrc = cust.logoUrl || getCompanyLogoUrl(cust.website);
             const isSelected = selectedCustomerIds.includes(cust.id);

             return (
              <div 
                key={cust.id} 
                className={`bg-white rounded-xl shadow-sm border transition-all group relative hover:shadow-md ${isSelected ? 'border-richting-orange ring-1 ring-richting-orange' : 'border-gray-200'} ${cust.status === 'churned' || cust.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}
              >
                
                {/* SELECTION CHECKBOX - rechtsboven */}
                <button 
                  type="button"
                  className="absolute top-4 right-4 z-20 p-1 focus:outline-none"
                  onClick={(e) => toggleCustomerSelection(cust.id, e)}
                >
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-richting-orange border-richting-orange' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                   </div>
                </button>

                {/* Main Card Content Button */}
                <button
                  type="button"
                  className="w-full h-full text-left p-6 focus:outline-none"
                  onClick={() => { console.log('Klik op klant:', cust.id); setSelectedCustomer(cust); }}
                >
                  {/* Logo linksboven en Status badge rechtsboven */}
                  <div className="flex justify-between items-start mb-4">
                    {/* LOGO - linksboven */}
                    <div className="w-14 h-14 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {logoSrc ? (
                          <img src={logoSrc} alt={cust.name} className="w-full h-full object-contain p-1" />
                      ) : (
                          <div className="w-full h-full bg-gray-50"></div>
                      )}
                    </div>
                    
                    {/* STATUS BADGE - rechtsboven (onder checkbox) */}
                    <div className="flex flex-col items-end gap-2 pr-6">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold uppercase ${cust.status === 'active' ? 'bg-green-100 text-green-700' : cust.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                        {getStatusLabel(cust.status)}
                      </span>
                    </div>
                  </div>

                  {/* Bedrijfsnaam */}
                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-richting-orange">{cust.name}</h3>
                  
                  {/* Aantal medewerkers */}
                  {cust.employeeCount && (
                    <p className="text-sm text-gray-600 mb-2">
                      {cust.employeeCount.toLocaleString('nl-NL')} medewerkers
                    </p>
                  )}
                  
                  {/* Extra info zoals "Geen RIE" */}
                  {cust.hasRIE === false && (
                    <p className="text-xs text-gray-500 mb-3">X Geen RIE</p>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* NEW CUSTOMER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
               <h3 className="font-bold text-slate-800">Nieuwe Klant Aanmaken</h3>
               <button 
                 onClick={() => {
                   setShowAddModal(false);
                   // Reset all form state
                   setNewName('');
                   setNewWebsite('');
                   setWebsiteResults([]);
                   setSelectedWebsite('');
                   setHasSearched(false);
                 }} 
                 className="text-gray-400 hover:text-gray-600"
               >
                 ✕
               </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bedrijfsnaam *</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                  placeholder="Bijv. Jansen Bouw B.V."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
                {isSearchingWebsite && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <span className="animate-spin">⏳</span> Zoeken naar website...
                  </p>
                )}
              </div>

              {/* Website Search Results */}
              {hasSearched && websiteResults.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Website (Best Match op 1) *</label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {websiteResults.map((result, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setSelectedWebsite(result.url);
                          setNewWebsite(result.url.replace(/^https?:\/\//, ''));
                        }}
                        className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                          selectedWebsite === result.url
                            ? 'border-richting-orange bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {idx === 0 && (
                              <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold mb-1">
                                ✓ Best Match
                              </span>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                result.confidence === 'high' ? 'bg-green-100 text-green-700' :
                                result.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {result.confidence}
                              </span>
                              <a 
                                href={result.url} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-richting-orange hover:underline text-sm font-medium flex items-center gap-1"
                              >
                                {result.url} <ExternalLinkIcon />
                              </a>
                            </div>
                            {result.title && (
                              <p className="text-sm font-semibold text-slate-900 mt-1">{result.title}</p>
                            )}
                            {result.snippet && (
                              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{result.snippet}</p>
                            )}
                          </div>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedWebsite === result.url
                              ? 'border-richting-orange bg-richting-orange'
                              : 'border-gray-300'
                          }`}>
                            {selectedWebsite === result.url && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hasSearched && websiteResults.length === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website *</label>
                  <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 mb-2">
                    <p className="text-sm text-gray-700">Geen websites gevonden. Voer handmatig een website in.</p>
                  </div>
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="richting.nl (zonder https://)"
                    value={newWebsite}
                    onChange={e => {
                      setNewWebsite(e.target.value);
                      setSelectedWebsite('');
                    }}
                  />
                </div>
              )}

              <button 
                onClick={handleAddCustomer}
                disabled={!newName || (!selectedWebsite && !newWebsite)}
                className="w-full mt-4 bg-richting-orange text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Klant Aanmaken
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

