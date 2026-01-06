import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, DocumentSource, KNOWLEDGE_STRUCTURE, DocType, GeminiAnalysisResult, ChatMessage, Customer, Location, UserRole, ContactPerson, OrganisatieProfiel, Risico, Proces, Functie } from '../../types';
import { authService, dbService, customerService, promptService, richtingLocatiesService, Prompt, RichtingLocatie, processService, functionService, substanceService, logoService } from '../../services/firebase';
import { addRiskAssessment, getRisksByCustomer, getRisksByProcess, getRisksByFunction, getRisksBySubstance } from '../../services/riskService';
import { Process, Function as FunctionType, Substance, RiskAssessment } from '../../types/firestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { EyeIcon, HeartIcon, ExternalLinkIcon, ArchiveIcon, SendIcon, MapIcon, GoogleIcon, TrashIcon, UserIcon, EmailIcon, GoogleDocIcon, PdfIcon } from '../../components/icons';
import { analyzeContent, askQuestion, analyzeOrganisatieBranche, analyzeCultuur } from '../../services/geminiService';
import ReactMarkdown from 'react-markdown';
import { generateOrganisatieProfielPDF } from '../../utils/pdfGenerator';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ORGANISATIE_ANALYSE_HOOFDSTUKKEN, ORGANISATIE_ANALYSE_HOOFDSTUKKEN_ARRAY } from '../../utils/organisatieAnalyseConstants';
import { getCategoryLabel, getStatusLabel, ensureUrl, getCompanyLogoUrl, getFriendlyErrorMessage, handleBackup } from '../../utils/helpers';
import { FUNCTIONS_BASE_URL } from '../../config';
export const RegioView = ({ user }: { user: User }) => {
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

        // Haal alle klant locaties op
        const allCustomerLocations: Location[] = [];
        for (const customer of klanten) {
          const locs = await customerService.getLocations(customer.id);
          allCustomerLocations.push(...locs);
        }
        
        // Koppel locaties zonder richtingLocatieId aan dichtstbijzijnde Richting locatie
        const updatedLocations: Location[] = [];
        for (const loc of allCustomerLocations) {
          if (!loc.richtingLocatieId && loc.city) {
            // Zoek op basis van stad naam
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
              // Update in Firestore
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

  // Groepeer Richting locaties per regio
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

  // Match klanten met regio's/vestigingen op basis van hun locaties
  // Nu met locatie-specifieke medewerkersaantallen
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

  // NIEUWE LOGICA: Bereken medewerkers per vestiging (tel per locatie, niet per klant)
  // Elke locatie is gekoppeld aan 1 Richting vestiging
  const medewerkersPerVestiging = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Loop door alle locaties en tel medewerkers per vestiging
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

  // NIEUWE LOGICA: Bereken medewerkers per regio (som van alle vestigingen in die regio)
  // Elke vestiging is gekoppeld aan een regio
  const medewerkersPerRegio = useMemo(() => {
    const totals: Record<string, number> = {};
    const processedVestigingen = new Set<string>();
    
    // Loop door alle Richting vestigingen en tel medewerkers per regio
    richtingLocaties.forEach(richtingLoc => {
      const regio = richtingLoc.regio;
      if (!regio) return;
      
      // Voorkom dubbele telling van dezelfde vestiging
      if (processedVestigingen.has(richtingLoc.vestiging)) return;
      processedVestigingen.add(richtingLoc.vestiging);
      
      if (!totals[regio]) {
        totals[regio] = 0;
      }
      
      // Tel medewerkers van alle locaties gekoppeld aan deze vestiging
      const vestigingMedewerkers = medewerkersPerVestiging[richtingLoc.vestiging] || 0;
      totals[regio] += vestigingMedewerkers;
    });
    
    return totals;
  }, [richtingLocaties, medewerkersPerVestiging]);

  // Filter klanten op basis van geselecteerde regio/vestiging
  // Unieke klanten (om duplicaten te voorkomen)
  const filteredKlanten = useMemo(() => {
    if (!selectedRegio) return [];
    let filtered = klantenPerRegio[selectedRegio] || [];
    if (selectedVestiging) {
      filtered = filtered.filter(item => item.vestiging === selectedVestiging);
    }
    // Aggregeer locaties per klant en bereken totaal aantal medewerkers voor deze regio
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

  // Pie chart data: Actieve klanten vs Prospects
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

  const handleRelinkAllLocations = async () => {
    setIsLinkingLocations(true);
    try {
      const updatedLocations: Location[] = [];
      
      for (const loc of allLocations) {
        if (loc.city) {
          // Zoek op basis van stad naam
          const matchingLocatie = richtingLocaties.find(rl => {
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
            // Update in Firestore
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
      alert(`✅ ${updatedLocations.filter(l => l.richtingLocatieId).length} locaties gekoppeld aan Richting vestigingen.`);
    } catch (error) {
      console.error("Error linking locations:", error);
      alert("Fout bij koppelen van locaties. Probeer het opnieuw.");
    } finally {
      setIsLinkingLocations(false);
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Laden...</div>;
  }

  const regioOrder = ['Noord', 'Oost', 'West', 'Zuid West', 'Zuid Oost', 'Midden'];
  
  // Debug info
  console.log('RegioView Debug:', {
    richtingLocaties: richtingLocaties.length,
    customers: customers.length,
    allLocations: allLocations.length,
    locationsWithRichtingId: allLocations.filter(l => l.richtingLocatieId).length,
    klantenPerRegio: Object.keys(klantenPerRegio).length,
    locatiesPerRegio: Object.keys(locatiesPerRegio).length
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Regio & Sales Overzicht</h2>
        {user.role === UserRole.ADMIN && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (!window.confirm('Weet je zeker dat je alle locaties zonder klantkoppeling wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
                  return;
                }
                setIsCleaningUp(true);
                try {
                  const result = await customerService.cleanupOrphanedLocations();
                  alert(`✅ Cleanup voltooid!\n\nVerwijderd: ${result.deleted} locatie(s)\n${result.errors.length > 0 ? `Fouten: ${result.errors.length}` : 'Geen fouten'}`);
                  // Reload data
                  window.location.reload();
                } catch (error: any) {
                  alert(`❌ Fout bij cleanup: ${error.message}`);
                } finally {
                  setIsCleaningUp(false);
                }
              }}
              disabled={isCleaningUp}
              className="bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 disabled:opacity-50 transition-colors text-sm"
            >
              {isCleaningUp ? '⏳ Opruimen...' : '🧹 Verwijder Orphaned Locaties'}
            </button>
            <button
              onClick={handleRelinkAllLocations}
              disabled={isLinkingLocations}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
            >
              {isLinkingLocations ? '⏳ Koppelen...' : '🔗 Koppel Alle Locaties'}
            </button>
          </div>
        )}
      </div>

      {/* Pie Chart: Actieve Klanten vs Prospects */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span> Sales & Capaciteit Overzicht
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Pie Chart */}
          <div className="flex flex-col items-center">
            <div className="relative w-64 h-64 mb-4">
              <svg className="transform -rotate-90 w-64 h-64">
                <circle
                  cx="128"
                  cy="128"
                  r="100"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="40"
                />
                {pieChartData.actiefPercentage > 0 && (
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="40"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - pieChartData.actiefPercentage / 100)}`}
                    className="transition-all duration-500"
                  />
                )}
                {pieChartData.prospectPercentage > 0 && (
                  <circle
                    cx="128"
                    cy="128"
                    r="100"
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="40"
                    strokeDasharray={`${2 * Math.PI * 100}`}
                    strokeDashoffset={`${2 * Math.PI * 100 * (1 - pieChartData.prospectPercentage / 100) - (2 * Math.PI * 100 * pieChartData.actiefPercentage / 100)}`}
                    className="transition-all duration-500"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-3xl font-bold text-slate-900">{pieChartData.actief + pieChartData.prospect}</p>
                  <p className="text-sm text-gray-500">Totaal</p>
                </div>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-richting-orange"></div>
                <span className="text-sm text-gray-700">
                  Actief: <span className="font-bold">{pieChartData.actief}</span> ({pieChartData.actiefPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700">
                  Prospect: <span className="font-bold">{pieChartData.prospect}</span> ({pieChartData.prospectPercentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Statistieken */}
          <div className="space-y-4">
            <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Actieve Klanten</p>
              <p className="text-3xl font-bold text-richting-orange">{pieChartData.actief}</p>
              <p className="text-xs text-gray-500 mt-1">Huidige capaciteit in gebruik</p>
            </div>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Prospects</p>
              <p className="text-3xl font-bold text-blue-600">{pieChartData.prospect}</p>
              <p className="text-xs text-gray-500 mt-1">Potentiële nieuwe klanten</p>
            </div>
            <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
              <p className="text-xs text-gray-600 mb-1">Totaal Medewerkers</p>
              <p className="text-3xl font-bold text-slate-900">
                {(() => {
                  // NIEUWE LOGICA: Totaal = som van alle regio's
                  // Elke regio = som van alle vestigingen in die regio
                  // Elke vestiging = som van alle locaties gekoppeld aan die vestiging
                  const totaal = Object.values(medewerkersPerRegio).reduce((sum, count) => sum + count, 0);
                  return totaal.toLocaleString('nl-NL');
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Gebaseerd op locatie-specifieke aantallen per Richting vestiging</p>
            </div>
          </div>
        </div>
      </div>

      {/* Regio Selectie */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span className="text-2xl">🗺️</span> Selecteer Regio
        </h3>
        {richtingLocaties.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="mb-2">Geen Richting locaties gevonden.</p>
            <p className="text-sm">Ga naar Instellingen → Data Beheer om Richting locaties te seeden.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {regioOrder.map(regio => {
              const locatiesInRegio = locatiesPerRegio[regio] || [];
              const klantenInRegio = klantenPerRegio[regio] || [];
              const medewerkers = medewerkersPerRegio[regio] || 0;
              const isSelected = selectedRegio === regio;
              
              return (
                <button
                  key={regio}
                  onClick={() => {
                    setSelectedRegio(isSelected ? null : regio);
                    setSelectedVestiging(null);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-richting-orange bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-1">{regio}</p>
                  <p className="text-xs text-gray-500 mb-2">{locatiesInRegio.length} vestiging{locatiesInRegio.length !== 1 ? 'en' : ''}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">{klantenInRegio.length} klant{klantenInRegio.length !== 1 ? 'en' : ''}</span>
                    <span className="text-xs font-bold text-richting-orange">
                      {medewerkers.toLocaleString('nl-NL')} medew.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Vestiging Selectie (alleen als regio geselecteerd) */}
      {selectedRegio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📍</span> Vestigingen in {selectedRegio}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(locatiesPerRegio[selectedRegio] || []).map(vestiging => {
              const klantenBijVestiging = (klantenPerRegio[selectedRegio] || [])
                .filter(item => item.vestiging === vestiging.vestiging)
                .map(item => item.customer);
              const medewerkers = medewerkersPerVestiging[vestiging.vestiging] || 0;
              const isSelected = selectedVestiging === vestiging.vestiging;
              
              return (
                <button
                  key={vestiging.id}
                  onClick={() => setSelectedVestiging(isSelected ? null : vestiging.vestiging)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    isSelected
                      ? 'border-richting-orange bg-orange-50 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <p className="font-bold text-slate-900 mb-1">{vestiging.vestiging}</p>
                  <p className="text-xs text-gray-500 mb-2 line-clamp-1">{vestiging.volledigAdres}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-600">{klantenBijVestiging.length} klant{klantenBijVestiging.length !== 1 ? 'en' : ''}</span>
                    <span className="text-xs font-bold text-richting-orange">
                      {medewerkers.toLocaleString('nl-NL')} medew.
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Klanten Overzicht (gefilterd op regio/vestiging) */}
      {selectedRegio && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span className="text-2xl">💼</span> Klanten
              {selectedVestiging && ` - ${selectedVestiging}`}
              {!selectedVestiging && ` in ${selectedRegio}`}
            </h3>
            <span className="text-sm text-gray-500">
              {filteredKlanten.length} klant{filteredKlanten.length !== 1 ? 'en' : ''}
            </span>
          </div>
          {filteredKlanten.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Geen klanten gevonden voor deze selectie.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredKlanten.map(({ customer, locations, totalRegionEmployees }) => {
                // Try multiple logo sources
                const logoSrc = customer.logoUrl || getCompanyLogoUrl(customer.website) || (customer.website ? `https://wsrv.nl/?url=${ensureUrl(customer.website)}&w=128&output=png` : null);
                
                // Use calculated total for region (do NOT use customer.employeeCount global total)
                const employeeCount = totalRegionEmployees;
                
                // Determine location label
                let locationLabel = '';
                if (locations.length === 1) {
                  locationLabel = locations[0].name || locations[0].city || '';
                } else if (locations.length > 1) {
                  const first = locations[0].name || locations[0].city;
                  locationLabel = first ? `${first} + ${locations.length - 1} andere` : `${locations.length} locaties`;
                }

                return (
                  <div
                    key={customer.id}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-richting-orange transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-16 h-16 rounded-lg bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                        {logoSrc ? (
                          <img 
                            src={logoSrc} 
                            alt={customer.name} 
                            className="w-full h-full object-contain p-1"
                            onError={(e) => {
                              // Fallback to icon if image fails to load
                              const img = e.target as HTMLImageElement;
                              img.style.display = 'none';
                              const parent = img.parentElement;
                              if (parent) {
                                const existingFallback = parent.querySelector('.fallback-icon');
                                if (!existingFallback) {
                                  const fallback = document.createElement('div');
                                  fallback.className = 'w-full h-full bg-gray-50 flex items-center justify-center fallback-icon';
                                  fallback.innerHTML = '<span class="text-2xl text-gray-400">🏢</span>';
                                  parent.appendChild(fallback);
                                }
                              }
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                            <span className="text-2xl text-gray-400">🏢</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 text-sm mb-1">{customer.name}</p>
                        <p className="text-xs text-gray-500 mb-1">{customer.industry}</p>
                        {locationLabel && (
                          <p className="text-xs text-gray-400 italic">{locationLabel}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0 ${
                        customer.status === 'active' ? 'bg-green-100 text-green-700' : 
                        customer.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 
                        customer.status === 'churned' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {customer.status === 'active' ? 'Actief' : 
                         customer.status === 'prospect' ? 'Prospect' : 
                         customer.status === 'churned' ? 'Beëindigd' : 
                         customer.status}
                      </span>
                    </div>
                    {employeeCount > 0 && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                        <span className="font-bold text-richting-orange">{employeeCount.toLocaleString('nl-NL')}</span>
                        <span>medewerkers {locations.length === 1 ? `(${locations[0].name || locations[0].city || 'Locatie'})` : `(totaal ${locations.length} locaties)`}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
