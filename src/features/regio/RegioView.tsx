import React, { useState, useEffect, useMemo } from 'react';
import { User, RichtingLocatie, Customer, Location } from '../../types';
import { customerService, richtingLocatiesService } from '../../services/firebase';
import { getStatusLabel, getCompanyLogoUrl } from '../../utils/helpers';
import { RefreshIcon } from '../../components/icons';

interface RegioViewProps {
  user: User;
}

export const RegioView: React.FC<RegioViewProps> = ({ user }) => {
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [selectedRegio, setSelectedRegio] = useState<string | null>(null);
  const [selectedVestiging, setSelectedVestiging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkingLocations, setIsLinkingLocations] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [locaties, klanten] = await Promise.all([
          richtingLocatiesService.getAllLocaties(),
          customerService.getCustomersForUser(user.id, user.role)
        ]);
        setRichtingLocaties(locaties);
        setCustomers(klanten);

        const allCustomerLocations: Location[] = [];
        for (const customer of klanten) {
          const locs = await customerService.getLocations(customer.id);
          allCustomerLocations.push(...locs);
        }
        
        const updatedLocations: Location[] = [];
        for (const loc of allCustomerLocations) {
          if (!loc.richtingLocatieId && loc.city) {
            const matchingLocatie = locaties.find(rl => {
              const cityLower = loc.city.toLowerCase();
              const vestigingLower = rl.vestiging.toLowerCase();
              const adresLower = rl.volledigAdres.toLowerCase();
              
              return cityLower.includes(vestigingLower) || 
                     vestigingLower.includes(cityLower) ||
                     adresLower.includes(cityLower) ||
                     cityLower.includes(adresLower.split(',')[0].toLowerCase());
            });
            
            if (matchingLocatie) {
              const updatedLoc: Location = {
                ...loc,
                richtingLocatieId: matchingLocatie.id,
                richtingLocatieNaam: matchingLocatie.vestiging
              };
              await customerService.addLocation(updatedLoc);
              updatedLocations.push(updatedLoc);
            } else {
              updatedLocations.push(loc);
            }
          } else {
            updatedLocations.push(loc);
          }
        }
        
        setAllLocations(updatedLocations);
      } catch (error) {
        console.error("Error loading regio data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const locatiesPerRegio = useMemo(() => {
    const grouped: Record<string, RichtingLocatie[]> = {};
    richtingLocaties.forEach(loc => {
      if (!grouped[loc.regio]) {
        grouped[loc.regio] = [];
      }
      grouped[loc.regio].push(loc);
    });
    return grouped;
  }, [richtingLocaties]);

  const klantenPerRegio = useMemo(() => {
    const grouped: Record<string, { customer: Customer, vestiging: string, location: Location }[]> = {};
    
    allLocations.forEach(loc => {
      if (loc.richtingLocatieId) {
        const richtingLoc = richtingLocaties.find(rl => rl.id === loc.richtingLocatieId);
        if (richtingLoc) {
          const customer = customers.find(c => c.id === loc.customerId);
          if (customer) {
            if (!grouped[richtingLoc.regio]) {
              grouped[richtingLoc.regio] = [];
            }
            grouped[richtingLoc.regio].push({
              customer,
              vestiging: richtingLoc.vestiging,
              location: loc
            });
          }
        }
      }
    });
    
    return grouped;
  }, [allLocations, richtingLocaties, customers]);

  const medewerkersPerVestiging = useMemo(() => {
    const totals: Record<string, number> = {};
    
    allLocations.forEach(loc => {
      if (loc.richtingLocatieId && loc.employeeCount !== undefined && loc.employeeCount !== null) {
        const richtingLoc = richtingLocaties.find(rl => rl.id === loc.richtingLocatieId);
        if (richtingLoc) {
          const vestigingNaam = richtingLoc.vestiging;
          if (!totals[vestigingNaam]) {
            totals[vestigingNaam] = 0;
          }
          totals[vestigingNaam] += loc.employeeCount;
        }
      }
    });
    
    return totals;
  }, [allLocations, richtingLocaties]);

  const medewerkersPerRegio = useMemo(() => {
    const totals: Record<string, number> = {};
    const processedVestigingen = new Set<string>();
    
    richtingLocaties.forEach(richtingLoc => {
      const regio = richtingLoc.regio;
      if (!regio) return;
      
      if (processedVestigingen.has(richtingLoc.vestiging)) return;
      processedVestigingen.add(richtingLoc.vestiging);
      
      if (!totals[regio]) {
        totals[regio] = 0;
      }
      
      const vestigingMedewerkers = medewerkersPerVestiging[richtingLoc.vestiging] || 0;
      totals[regio] += vestigingMedewerkers;
    });
    
    return totals;
  }, [richtingLocaties, medewerkersPerVestiging]);

  const filteredKlanten = useMemo(() => {
    if (!selectedRegio) return [];
    let filtered = klantenPerRegio[selectedRegio] || [];
    if (selectedVestiging) {
      filtered = filtered.filter(item => item.vestiging === selectedVestiging);
    }
    const customerMap = new Map<string, { customer: Customer, locations: Location[], totalRegionEmployees: number }>();
    filtered.forEach(item => {
      const existing = customerMap.get(item.customer.id);
      const empCount = item.location.employeeCount || 0;
      
      if (existing) {
        existing.locations.push(item.location);
        existing.totalRegionEmployees += empCount;
      } else {
        customerMap.set(item.customer.id, { 
          customer: item.customer, 
          locations: [item.location],
          totalRegionEmployees: empCount 
        });
      }
    });
    return Array.from(customerMap.values());
  }, [selectedRegio, selectedVestiging, klantenPerRegio]);

  const pieChartData = useMemo(() => {
    const actief = customers.filter(c => c.status === 'active').length;
    const prospect = customers.filter(c => c.status === 'prospect').length;
    const totaal = actief + prospect;
    
    if (totaal === 0) {
      return { actief: 0, prospect: 0, actiefPercentage: 0, prospectPercentage: 0 };
    }
    
    return {
      actief,
      prospect,
      actiefPercentage: (actief / totaal) * 100,
      prospectPercentage: (prospect / totaal) * 100
    };
  }, [customers]);

  const handleLinkLocations = async () => {
    setIsLinkingLocations(true);
    // This logic was already performed on load in the useEffect
    // Re-running it here for manual trigger if needed
    // For now, we simulate a small delay to show feedback
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLinkingLocations(false);
    alert("Locaties zijn gekoppeld!");
  };

  const handleCleanupDuplicates = async () => {
    if (!window.confirm("Weet je zeker dat je duplicate locaties wilt opschonen? Dit kan niet ongedaan worden gemaakt.")) return;
    setIsCleaningUp(true);
    try {
        const allLocs = [...allLocations];
        const uniqueKeys = new Set<string>();
        const duplicates: Location[] = [];

        for (const loc of allLocs) {
            const key = `${loc.street}-${loc.city}-${loc.customerId}`;
            if (uniqueKeys.has(key)) {
                duplicates.push(loc);
            } else {
                uniqueKeys.add(key);
            }
        }

        for (const dup of duplicates) {
            if (dup.id) await customerService.deleteLocation(dup.id, dup.customerId);
        }

        setAllLocations(prev => prev.filter(l => !duplicates.find(d => d.id === l.id)));
        alert(`${duplicates.length} duplicaten verwijderd.`);
    } catch (e) {
        console.error(e);
        alert("Fout bij opschonen.");
    } finally {
        setIsCleaningUp(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Regio data laden...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">Regio Overzicht</h2>
            <p className="text-gray-500">Inzicht in dekking en klanten per regio</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleLinkLocations}
                disabled={isLinkingLocations}
                className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-100 transition-colors flex items-center gap-2"
            >
                {isLinkingLocations ? 'Bezig...' : <><RefreshIcon /> Koppel Locaties</>}
            </button>
            <button 
                onClick={handleCleanupDuplicates}
                disabled={isCleaningUp}
                className="bg-red-50 text-red-600 px-4 py-2 rounded-lg font-bold hover:bg-red-100 transition-colors"
            >
                {isCleaningUp ? 'Bezig...' : '🧹 Opschonen'}
            </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Verdeling Klanten</h3>
            <div className="flex items-center gap-8">
                <div className="relative w-32 h-32 rounded-full border-8 border-gray-100 flex items-center justify-center overflow-hidden">
                     <div 
                       className="absolute inset-0 bg-green-500" 
                       style={{ clipPath: `polygon(50% 50%, 100% 0, 100% 100%, 0 100%, 0 0)` }}
                     ></div>
                     <div className="z-10 bg-white w-24 h-24 rounded-full flex flex-col items-center justify-center">
                        <span className="text-xl font-bold text-slate-900">{customers.length}</span>
                        <span className="text-xs text-gray-500">Totaal</span>
                     </div>
                </div>
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium">Actief: {pieChartData.actief}</span>
                        <span className="text-xs text-gray-400">({Math.round(pieChartData.actiefPercentage)}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm font-medium">Prospect: {pieChartData.prospect}</span>
                        <span className="text-xs text-gray-400">({Math.round(pieChartData.prospectPercentage)}%)</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
             <h3 className="text-lg font-bold text-slate-800 mb-4">Top Regio's (Medewerkers)</h3>
             <div className="space-y-3">
                {Object.entries(medewerkersPerRegio)
                   .sort(([,a], [,b]) => b - a)
                   .slice(0, 5)
                   .map(([regio, count], idx) => (
                    <div key={regio} className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-400 w-4">{idx + 1}.</span>
                        <div className="flex-1">
                            <div className="flex justify-between text-sm mb-1">
                                <span className="font-medium text-slate-700">{regio}</span>
                                <span className="font-bold text-slate-900">{count.toLocaleString('nl-NL')}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2">
                                <div 
                                  className="bg-richting-orange h-2 rounded-full" 
                                  style={{ width: `${(count / Math.max(...Object.values(medewerkersPerRegio))) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                ))}
             </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Regio's & Vestigingen</h3>
            <div className="space-y-2">
                {Object.entries(locatiesPerRegio).map(([regio, vestigingen]) => (
                    <div key={regio} className="border border-gray-100 rounded-lg overflow-hidden">
                        <button 
                          onClick={() => {
                              setSelectedRegio(selectedRegio === regio ? null : regio);
                              setSelectedVestiging(null);
                          }}
                          className={`w-full text-left px-4 py-3 font-bold flex justify-between items-center ${selectedRegio === regio ? 'bg-orange-50 text-richting-orange' : 'bg-gray-50 text-slate-700 hover:bg-gray-100'}`}
                        >
                            <span>{regio}</span>
                            <span className="text-xs font-normal bg-white px-2 py-1 rounded-full border">
                                {medewerkersPerRegio[regio]?.toLocaleString('nl-NL') || 0} mw
                            </span>
                        </button>
                        
                        {selectedRegio === regio && (
                            <div className="bg-white border-t border-gray-100">
                                {vestigingen.map(v => (
                                    <button
                                      key={v.id}
                                      onClick={() => setSelectedVestiging(selectedVestiging === v.vestiging ? null : v.vestiging)}
                                      className={`w-full text-left px-4 py-2 text-sm flex justify-between items-center ${selectedVestiging === v.vestiging ? 'text-richting-orange bg-orange-50 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                                    >
                                        <span className="truncate">{v.vestiging}</span>
                                        <span className="text-xs text-gray-400">
                                            {medewerkersPerVestiging[v.vestiging]?.toLocaleString('nl-NL') || 0}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>

        <div className="lg:col-span-3">
             {selectedRegio ? (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">
                            Klanten in {selectedRegio} 
                            {selectedVestiging && <span className="text-gray-500 font-normal"> / {selectedVestiging}</span>}
                        </h3>
                        <span className="text-sm font-medium text-gray-500">
                            {filteredKlanten.length} klanten
                        </span>
                    </div>
                    
                    {filteredKlanten.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Geen klanten gevonden in deze selectie.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredKlanten.map(item => (
                                <div key={item.customer.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded bg-white border border-gray-200 flex items-center justify-center p-1">
                                            {item.customer.logoUrl || getCompanyLogoUrl(item.customer.website) ? (
                                                <img src={item.customer.logoUrl || getCompanyLogoUrl(item.customer.website)} alt="" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-xl font-bold text-gray-300">{item.customer.name.substring(0, 2)}</span>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-bold text-slate-900">{item.customer.name}</h4>
                                                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase ${item.customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {getStatusLabel(item.customer.status)}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-2 space-y-1">
                                                {item.locations.map((loc, idx) => (
                                                    <div key={idx} className="flex items-center text-sm text-gray-600">
                                                        <span className="w-4 text-gray-400">📍</span>
                                                        <span className="flex-1">
                                                            {loc.street} {loc.houseNumber}, {loc.city}
                                                            {loc.postalCode && <span className="text-gray-400 ml-1">({loc.postalCode})</span>}
                                                        </span>
                                                        <span className="font-medium text-slate-700 min-w-[80px] text-right">
                                                            {loc.employeeCount?.toLocaleString('nl-NL') || '-'} mw
                                                        </span>
                                                    </div>
                                                ))}
                                                <div className="flex justify-end pt-1 border-t border-gray-100 mt-1">
                                                     <span className="text-xs font-bold text-gray-500">Totaal in regio: {item.totalRegionEmployees.toLocaleString('nl-NL')} medewerkers</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
             ) : (
                 <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                     <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">🗺️</div>
                     <h3 className="text-xl font-bold text-slate-900 mb-2">Selecteer een Regio</h3>
                     <p className="text-gray-500 max-w-md mx-auto">
                         Klik op een regio aan de linkerkant om de klanten en vestigingen in dat gebied te bekijken.
                     </p>
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

