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
export const CustomerDetailView = ({ 
  customer, 
  user,
  onBack, 
  onUpdate, 
  onDelete,
  onOpenDoc,
  onRefresh
}: { 
  customer: Customer, 
  user: User,
  onBack: () => void,
  onUpdate: (updated: Customer) => void,
  onDelete: (id: string) => void,
  onOpenDoc: (doc: DocumentSource) => void,
  onRefresh?: () => void
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [docs, setDocs] = useState<DocumentSource[]>([]);
  const [organisatieProfiel, setOrganisatieProfiel] = useState<OrganisatieProfiel | null>(null);
  const [selectedProces, setSelectedProces] = useState<Proces | null>(null);
  const [selectedFunctie, setSelectedFunctie] = useState<Functie | null>(null);
  const [selectedFunctieRisicos, setSelectedFunctieRisicos] = useState<RiskAssessment[]>([]);
  const [functieRisicoCounts, setFunctieRisicoCounts] = useState<{[functionId: string]: number}>({});
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [isAnalyzingOrganisatie, setIsAnalyzingOrganisatie] = useState(false);
  const [isFetchingLocations, setIsFetchingLocations] = useState(false);
  
  // Status Change State
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<'active' | 'prospect' | 'churned' | 'rejected' | null>(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusDate, setStatusDate] = useState(new Date().toISOString().split('T')[0]);

  // Satisfaction State
  const [showSatisfactionModal, setShowSatisfactionModal] = useState(false);
  const [satisfactionTrust, setSatisfactionTrust] = useState<number>(0);
  const [satisfactionAttention, setSatisfactionAttention] = useState<number>(0);
  const [satisfactionEquality, setSatisfactionEquality] = useState<number>(0);
  const [satisfactionNotes, setSatisfactionNotes] = useState('');
  const [satisfactionDate, setSatisfactionDate] = useState(new Date().toISOString().split('T')[0]);

  // Edit Customer State
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerIndustry, setEditCustomerIndustry] = useState('');
  const [editCustomerWebsite, setEditCustomerWebsite] = useState('');
  const [editCustomerEmployeeCount, setEditCustomerEmployeeCount] = useState<number | undefined>(undefined);
  const [editCustomerLogoUrl, setEditCustomerLogoUrl] = useState('');

  // Initialize edit fields when customer loads/changes
  useEffect(() => {
    setEditCustomerName(customer.name);
    setEditCustomerIndustry(customer.industry);
    setEditCustomerWebsite(customer.website || '');
    setEditCustomerEmployeeCount(customer.employeeCount);
    setEditCustomerLogoUrl(customer.logoUrl || '');
    
    if (customer.satisfaction) {
      setSatisfactionTrust(customer.satisfaction.trust);
      setSatisfactionAttention(customer.satisfaction.attention);
      setSatisfactionEquality(customer.satisfaction.equality);
      setSatisfactionNotes(customer.satisfaction.notes || '');
      setSatisfactionDate(customer.satisfaction.lastUpdated.split('T')[0]);
    }
  }, [customer]);
  const [isAnalyzingCultuur, setIsAnalyzingCultuur] = useState(false);
  const [organisatieAnalyseResultaat, setOrganisatieAnalyseResultaat] = useState<string | null>(null);
  const [cultuurAnalyseResultaat, setCultuurAnalyseResultaat] = useState<string | null>(null);
  const [analyseStap, setAnalyseStap] = useState(0); // 0 = niet gestart, 1-13 = huidige stap
  const [cultuurAnalyseStap, setCultuurAnalyseStap] = useState(0); // 0 = niet gestart, 1-12 = huidige stap
  const [analyseId, setAnalyseId] = useState<string | null>(null);
  const [hoofdstukkenResultaten, setHoofdstukkenResultaten] = useState<{[key: string]: string}>({});
  
  // Risico Profiel state
  const [isAnalyzingRisico, setIsAnalyzingRisico] = useState(false);
  const [risicoProfielData, setRisicoProfielData] = useState<{
    processen: Process[];
    functies: FunctionType[];
    stoffen: Substance[];
    risicos: RiskAssessment[];
  } | null>(null);
  const [activeRisicoTab, setActiveRisicoTab] = useState<'overview' | 'processen' | 'functies' | 'stoffen' | 'risicos'>('overview');
  
  // New Location Form
  const [locName, setLocName] = useState('');
  const [locAddress, setLocAddress] = useState('');
  const [locCity, setLocCity] = useState('');
  const [locEmployeeCount, setLocEmployeeCount] = useState<number | undefined>(undefined);
  
  // Edit Location Form
  const [editLocEmployeeCount, setEditLocEmployeeCount] = useState<number | undefined>(undefined);

  // New Contact Form
  const [contactFirst, setContactFirst] = useState('');
  const [contactLast, setContactLast] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactRole, setContactRole] = useState('');

  const loadData = async () => {
    try {
      console.log(`🔄 Loading data for customer: ${customer.id}`);
      const [locs, conts, documents, profiel] = await Promise.all([
        customerService.getLocations(customer.id),
        customerService.getContactPersons(customer.id),
        dbService.getDocumentsForCustomer(customer.id),
        customerService.getOrganisatieProfiel(customer.id)
      ]);
      console.log(`✅ Loaded ${locs.length} locations for customer ${customer.id}:`, locs);
      setLocations(locs);
      setContacts(conts);
      setDocs(documents);
      setOrganisatieProfiel(profiel);
      
      // Haal risico counts op voor alle functies (in achtergrond, niet blokkerend)
      // Doe dit asynchroon zodat het de loadData niet blokkeert
      if (profiel && profiel.functies && Array.isArray(profiel.functies) && profiel.functies.length > 0) {
        // Start async, maar wacht niet op completion
        Promise.all(
          profiel.functies.map(async (functie) => {
            try {
              if (functie && functie.id) {
                const risicos = await getRisksByFunction(functie.id);
                setFunctieRisicoCounts(prev => ({
                  ...prev,
                  [functie.id]: risicos.length
                }));
              }
            } catch (error) {
              console.error(`Error loading risks for function ${functie?.id}:`, error);
              if (functie && functie.id) {
                setFunctieRisicoCounts(prev => ({
                  ...prev,
                  [functie.id]: 0
                }));
              }
            }
          })
        ).catch(error => {
          console.error('Error loading function risk counts:', error);
        });
      }
       
      // Update locaties zonder coordinaten of richtingLocatieId
      const locatiesTeUpdaten = locs.filter(loc => 
        (!loc.latitude || !loc.longitude || !loc.richtingLocatieId) && loc.address && loc.city
      );
       
      if (locatiesTeUpdaten.length > 0) {
        // Update in achtergrond (niet blokkerend)
        Promise.all(locatiesTeUpdaten.map(async (loc) => {
          try {
            // Geocodeer adres
            const coordinates = await geocodeAddress(loc.address, loc.city);
            if (!coordinates) return;
             
            // Vind dichtstbijzijnde Richting locatie
            const nearest = await findNearestRichtingLocation(coordinates.latitude, coordinates.longitude);
             
            // Update locatie
            const updatedLoc: Location = {
              ...loc,
              latitude: coordinates.latitude,
              longitude: coordinates.longitude,
              richtingLocatieId: nearest?.id || loc.richtingLocatieId,
              richtingLocatieNaam: nearest?.naam || loc.richtingLocatieNaam,
              richtingLocatieAfstand: nearest?.distance || loc.richtingLocatieAfstand
            };
             
            await customerService.addLocation(updatedLoc);
             
            // Update state
            setLocations(prev => prev.map(l => l.id === loc.id ? updatedLoc : l));
          } catch (error) {
            console.error(`Error updating location ${loc.id}:`, error);
          }
        })).catch(error => {
          console.error('Error updating locations:', error);
        });
      }
    } catch (error) {
      console.error('❌ Error loading customer data:', error);
      // Zorg dat de app niet crasht - toon lege state maar geen error
      setLocations([]);
      setContacts([]);
      setDocs([]);
      setOrganisatieProfiel(null);
      setFunctieRisicoCounts({});
    }
  };

  useEffect(() => {
    loadData();
  }, [customer.id]);

  const handleAddLocation = async () => {
    if (!locName || !locAddress || !locCity) {
      alert('Vul naam, adres en stad in');
      return;
    }
    
    // Toon loading state
    setIsAddingLoc(false); // Sluit form tijdelijk
    
    try {
      // Stap 1: Geocodeer het adres om GPS coordinaten te krijgen
      const coordinates = await geocodeAddress(locAddress, locCity);
      
      const newLoc: Location = {
        id: `loc_${Date.now()}`,
        customerId: customer.id,
        name: locName,
        address: locAddress,
        city: locCity,
        employeeCount: locEmployeeCount,
        latitude: coordinates?.latitude,
        longitude: coordinates?.longitude
      };
      
      // Stap 2: Vind dichtstbijzijnde Richting locatie op basis van GPS coordinaten
      if (coordinates) {
        const nearest = await findNearestRichtingLocation(coordinates.latitude, coordinates.longitude);
        if (nearest) {
          newLoc.richtingLocatieId = nearest.id;
          newLoc.richtingLocatieNaam = nearest.naam;
          newLoc.richtingLocatieAfstand = nearest.distance;
          console.log(`📍 Dichtstbijzijnde Richting locatie: ${nearest.naam} (${nearest.distance.toFixed(1)} km)`);
        }
      } else {
        // Fallback: probeer op basis van stad naam te matchen
        console.warn('Geocoding mislukt, probeer stad naam matching');
        const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
        const matchingLocatie = allRichtingLocaties.find(rl => {
          const cityLower = locCity.toLowerCase();
          const stadLower = rl.stad?.toLowerCase() || '';
          const vestigingLower = rl.vestiging.toLowerCase();
          return cityLower === stadLower || 
                 vestigingLower.includes(cityLower) ||
                 cityLower.includes(vestigingLower);
        });
        
        if (matchingLocatie) {
          newLoc.richtingLocatieId = matchingLocatie.id;
          newLoc.richtingLocatieNaam = matchingLocatie.vestiging;
        }
      }
      
      // Stap 3: Sla locatie op
      await customerService.addLocation(newLoc);
      setLocations(prev => [...prev, newLoc]);
      setIsAddingLoc(false);
      setLocName(''); 
      setLocAddress(''); 
      setLocCity(''); 
      setLocEmployeeCount(undefined);
      
      // Update customer.employeeCount
      await updateCustomerEmployeeCount();
      
      if (newLoc.richtingLocatieNaam) {
        const afstandText = newLoc.richtingLocatieAfstand !== undefined ? ` (${newLoc.richtingLocatieAfstand.toFixed(1)} km)` : '';
        alert(`✅ Locatie toegevoegd!\n📍 Richtingvestiging: ${newLoc.richtingLocatieNaam}${afstandText}`);
      } else {
        alert('✅ Locatie toegevoegd!\n⚠️ Geen Richting locatie gevonden - controleer handmatig.');
      }
    } catch (error: any) {
      console.error('Error adding location:', error);
      alert(`❌ Fout bij toevoegen locatie: ${error.message || 'Onbekende fout'}`);
      setIsAddingLoc(true); // Heropen form bij fout
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setEditLocEmployeeCount(location.employeeCount);
  };

  const handleSaveLocationEdit = async () => {
    if (!editingLocation) return;
    
    const updatedLoc: Location = {
      ...editingLocation,
      employeeCount: editLocEmployeeCount
    };
    
    await customerService.addLocation(updatedLoc); // setDoc werkt ook voor updates
    setLocations(prev => prev.map(loc => loc.id === editingLocation.id ? updatedLoc : loc));
    setEditingLocation(null);
    setEditLocEmployeeCount(undefined);
    
    // Update customer.employeeCount
    await updateCustomerEmployeeCount();
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    
    try {
      await customerService.deleteLocation(deletingLocation.id);
      setLocations(prev => prev.filter(loc => loc.id !== deletingLocation.id));
      setDeletingLocation(null);
      // Update customer.employeeCount na verwijderen
      await updateCustomerEmployeeCount();
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("Kon locatie niet verwijderen. Probeer het opnieuw.");
    }
  };

  // Functie om customer.employeeCount bij te werken op basis van som van locatie-aantallen
  const updateCustomerEmployeeCount = async () => {
    try {
      const totalEmployees = locations.reduce((sum, loc) => sum + (loc.employeeCount || 0), 0);
      if (totalEmployees > 0) {
        await customerService.updateCustomer(customer.id, { employeeCount: totalEmployees });
        onUpdate({ ...customer, employeeCount: totalEmployees });
        console.log(`✅ Customer employeeCount bijgewerkt naar ${totalEmployees}`);
      }
    } catch (error) {
      console.error('Error updating customer employeeCount:', error);
    }
  };

  // Functie om locaties op te halen via Cloud Function
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          customerName: customer.name,
          website: customer.website
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const fetchedLocaties = data.locaties || [];

      if (fetchedLocaties.length === 0) {
        alert('Geen locaties gevonden voor deze klant.');
        setIsFetchingLocations(false);
        return;
      }

      // Refresh locaties eerst om zeker te zijn dat we de meest recente data hebben
      const currentLocations = await customerService.getLocations(customer.id);
      console.log(`🔍 Checking ${currentLocations.length} existing locations against ${fetchedLocaties.length} fetched locations`);

      // Verwerk elke gevonden locatie
      let savedCount = 0;
      let updatedCount = 0;
      const newLocations: Location[] = [];

      for (const locData of fetchedLocaties) {
        try {
          // Normaliseer adres en stad voor vergelijking (verwijder extra spaties, lowercase)
          const normalizeString = (str: string) => str.toLowerCase().trim().replace(/\s+/g, ' ');
          const normalizedAdres = normalizeString(locData.adres);
          const normalizedStad = normalizeString(locData.stad);
          const normalizedNaam = normalizeString(locData.naam || '');

          // Check of locatie al bestaat (op basis van adres + stad, of naam + stad)
          // We checken op meerdere criteria omdat adressen kunnen variëren
          const existingLoc = currentLocations.find(l => {
            const lAdres = normalizeString(l.address);
            const lStad = normalizeString(l.city);
            const lNaam = normalizeString(l.name);
            
            // Match op adres + stad (meest betrouwbaar)
            if (lAdres === normalizedAdres && lStad === normalizedStad) {
              return true;
            }
            
            // Match op naam + stad (als adres niet exact matcht, maar naam wel)
            if (normalizedNaam && lNaam && lNaam === normalizedNaam && lStad === normalizedStad) {
              return true;
            }
            
            return false;
          });

          // Geocodeer adres
          const coordinates = await geocodeAddress(locData.adres, locData.stad);
          
          // Vind dichtstbijzijnde Richting locatie
          let richtingLocatie = null;
          if (coordinates) {
            richtingLocatie = await findNearestRichtingLocation(coordinates.latitude, coordinates.longitude);
          }

          const locationToSave: Location = {
            id: existingLoc ? existingLoc.id : `loc_${Date.now()}_${savedCount}`,
            customerId: customer.id,
            name: locData.naam || 'Onbekende locatie',
            address: locData.adres,
            city: locData.stad,
            employeeCount: locData.aantalMedewerkers || 0,
            latitude: coordinates?.latitude,
            longitude: coordinates?.longitude,
            richtingLocatieId: richtingLocatie?.id,
            richtingLocatieNaam: richtingLocatie?.naam,
            richtingLocatieAfstand: richtingLocatie?.distance
          };

          // Sla locatie op (overschrijf als al bestaat)
          await customerService.addLocation(locationToSave);
          newLocations.push(locationToSave);

          if (existingLoc) {
            updatedCount++;
            console.log(`🔄 Locatie bijgewerkt: ${locData.naam} (${locData.adres}, ${locData.stad}) - Bestaande ID: ${existingLoc.id}`);
          } else {
            savedCount++;
            console.log(`✅ Nieuwe locatie toegevoegd: ${locData.naam} (${locData.adres}, ${locData.stad})`);
          }
        } catch (error: any) {
          console.error(`Error processing location ${locData.naam}:`, error);
          // Ga door met volgende locatie
        }
      }

      // Update locations state
      setLocations(prev => {
        const updated = [...prev];
        newLocations.forEach(newLoc => {
          const index = updated.findIndex(l => l.id === newLoc.id);
          if (index >= 0) {
            updated[index] = newLoc; // Overschrijf
          } else {
            updated.push(newLoc); // Voeg toe
          }
        });
        return updated;
      });

      // Update customer.employeeCount
      await updateCustomerEmployeeCount();

      alert(`✅ ${savedCount} nieuwe locatie(s) toegevoegd, ${updatedCount} locatie(s) bijgewerkt.`);
    } catch (error: any) {
      console.error('Error fetching locations:', error);
      alert(`❌ Fout bij ophalen locaties: ${error.message || 'Onbekende fout'}`);
    } finally {
      setIsFetchingLocations(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactFirst || !contactEmail) return;
    const newContact: ContactPerson = {
        id: `contact_${Date.now()}`,
        customerId: customer.id,
        firstName: contactFirst,
        lastName: contactLast,
        email: contactEmail,
        role: contactRole
    };
    await customerService.addContactPerson(newContact);
    setContacts(prev => [...prev, newContact]);
    setIsAddingContact(false);
    setContactFirst(''); setContactLast(''); setContactEmail(''); setContactRole('');
  };

  const handleSaveStatusChange = async () => {
    if (!pendingStatus) return;
    
    try {
      console.log(`🔄 Changing status for customer ${customer.id} to ${pendingStatus}`);
      
      const updates: Partial<Customer> = {
        status: pendingStatus,
        statusDetails: {
          date: statusDate,
          reason: statusReason,
          updatedBy: user.name
        }
      };
      
      await customerService.updateCustomer(customer.id, updates);
      console.log(`✅ Status updated successfully`);
      
      onUpdate({ ...customer, ...updates });
      setShowStatusModal(false);
      setPendingStatus(null);
      setStatusReason('');
    } catch (error: any) {
      console.error('❌ Error updating status:', error);
      alert(`Fout bij aanpassen status: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleSaveSatisfaction = async () => {
    try {
      // Calculate new average
      const currentAvg = (satisfactionTrust + satisfactionAttention + satisfactionEquality) / 3;
      
      // Get previous average if exists
      let previousAvg = customer.satisfaction?.previousAverage;
      
      // If we already have a satisfaction record, the "current" average becomes the "previous" average
      // UNLESS we are just updating the notes/date without changing the score significantly, 
      // but usually any save here implies a new measurement point.
      // To properly track trend, we should store the OLD average as previousAverage.
      if (customer.satisfaction) {
         const oldAvg = (customer.satisfaction.trust + customer.satisfaction.attention + customer.satisfaction.equality) / 3;
         // Only update previousAvg if the score actually changed, otherwise keep the old previousAvg
         if (Math.abs(oldAvg - currentAvg) > 0.01) {
             previousAvg = oldAvg;
         }
      }

      // Update history
      const newEntry = {
        date: new Date(satisfactionDate).toISOString(),
        trust: satisfactionTrust,
        attention: satisfactionAttention,
        equality: satisfactionEquality,
        average: currentAvg,
        notes: satisfactionNotes
      };

      // Ensure satisfactionHistory exists
      const history = customer.satisfactionHistory || [];
      
      // Add new entry and sort descending by date (newest first)
      const newHistory = [newEntry, ...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const updates: Partial<Customer> = {
        satisfaction: {
          trust: satisfactionTrust,
          attention: satisfactionAttention,
          equality: satisfactionEquality,
          notes: satisfactionNotes,
          lastUpdated: new Date(satisfactionDate).toISOString(),
          previousAverage: previousAvg
        },
        satisfactionHistory: newHistory
      };
      
      await customerService.updateCustomer(customer.id, updates);
      onUpdate({ ...customer, ...updates });
      setShowSatisfactionModal(false);
      alert('✅ Klanttevredenheid opgeslagen!');
    } catch (error: any) {
      console.error('❌ Error updating satisfaction:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    }
  };

  const handleSaveCustomerDetails = async () => {
    try {
      const updates: Partial<Customer> = {
        name: editCustomerName,
        industry: editCustomerIndustry,
        website: editCustomerWebsite,
        employeeCount: editCustomerEmployeeCount,
        logoUrl: editCustomerLogoUrl || undefined
      };
      
      await customerService.updateCustomer(customer.id, updates);
      onUpdate({ ...customer, ...updates });
      setIsEditingCustomer(false);
      alert('✅ Klantgegevens bijgewerkt');
    } catch (error: any) {
      console.error('❌ Error updating customer details:', error);
      alert(`Fout bij opslaan: ${error.message}`);
    }
  };

  const handleDelete = async () => {
    // Harde check op string 'ADMIN' om zeker te zijn
    if (user.role !== 'ADMIN') {
        alert("Geen rechten. Alleen een administrator kan klanten verwijderen."); 
        return;
    }
    
    if (!window.confirm(`LET OP: Weet je zeker dat je '${customer.name}' definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
        return;
    }

    setIsDeleting(true);
    try {
        await customerService.deleteCustomer(customer.id);
        onDelete(customer.id);
    } catch (e: any) {
        console.error("Delete failed:", e);
        setIsDeleting(false);
        alert(`Kon klant niet verwijderen: ${e.message}`);
    }
  };

  const getGoogleMapsLink = (loc: Location) => {
    const query = encodeURIComponent(`${loc.address}, ${loc.city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Geocoding functie: haal latitude/longitude op van een adres
  const geocodeAddress = async (address: string, city: string): Promise<{ latitude: number; longitude: number } | null> => {
    try {
      const fullAddress = `${address}, ${city}, Nederland`;
      // Gebruik een gratis geocoding service (Nominatim OpenStreetMap)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=nl`,
        {
          headers: {
            'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)' // Vereist door Nominatim - specifiekere User-Agent
          }
        }
      );
      
      if (!response.ok) {
        console.warn('Geocoding service response niet OK:', response.status);
        // Probeer alleen met stad als fallback
        if (city) {
          const cityResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
            {
              headers: {
                'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
              }
            }
          );
          if (cityResponse.ok) {
            const cityData = await cityResponse.json();
            if (cityData && cityData.length > 0) {
              return {
                latitude: parseFloat(cityData[0].lat),
                longitude: parseFloat(cityData[0].lon)
              };
            }
          }
        }
        return null;
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon)
        };
      }
      
      // Fallback: probeer alleen met stad
      if (city) {
        const cityResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city + ', Nederland')}&limit=1&countrycodes=nl`,
          {
            headers: {
              'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
            }
          }
        );
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          if (cityData && cityData.length > 0) {
            return {
              latitude: parseFloat(cityData[0].lat),
              longitude: parseFloat(cityData[0].lon)
            };
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  };

  // Haversine formule: bereken afstand tussen twee GPS coordinaten in kilometers
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Vind dichtstbijzijnde Richting locatie op basis van GPS coordinaten
  const findNearestRichtingLocation = async (
    latitude: number, 
    longitude: number
  ): Promise<{ id: string; naam: string; distance: number } | null> => {
    try {
      const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
      
      // Filter locaties met coordinaten
      const locatiesMetCoordinaten = allRichtingLocaties.filter(
        rl => rl.latitude !== undefined && rl.longitude !== undefined
      );
      
      if (locatiesMetCoordinaten.length === 0) {
        return null;
      }
      
      // Bereken afstand naar alle locaties en vind de dichtstbijzijnde
      let nearest: { id: string; naam: string; distance: number } | null = null;
      let minDistance = Infinity;
      
      for (const rl of locatiesMetCoordinaten) {
        if (rl.latitude && rl.longitude) {
          const distance = calculateDistance(latitude, longitude, rl.latitude, rl.longitude);
          if (distance < minDistance) {
            minDistance = distance;
            nearest = {
              id: rl.id,
              naam: rl.vestiging,
              distance: distance
            };
          }
        }
      }
      
      return nearest;
    } catch (error) {
      console.error('Error finding nearest Richting location:', error);
      return null;
    }
  };

  // Automatisch een standaardlocatie aanmaken voor een klant op basis van bedrijfsnaam (fallback)
  const autoCreateDefaultLocationForCustomer = async (cust: Customer) => {
    try {
      const query = `${cust.name}, Nederland`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=1`,
        {
          headers: {
            'User-Agent': 'Richting-Kennisbank/1.0'
          }
        }
      );
      if (!response.ok) return;
      const data = await response.json();
      if (!data || data.length === 0) return;

      const result = data[0];
      const addr = result.address || {};
      const city =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.state ||
        '';
      const addressLine = result.display_name || '';

      const newLoc: Location = {
        id: `loc_${Date.now()}`,
        customerId: cust.id,
        name: 'Hoofdkantoor',
        address: addressLine,
        city: city || 'Onbekend',
        employeeCount: undefined,
        latitude: parseFloat(result.lat),
        longitude: parseFloat(result.lon)
      };

      // Vind dichtstbijzijnde Richting locatie
      const nearest = await findNearestRichtingLocation(newLoc.latitude!, newLoc.longitude!);
      if (nearest) {
        newLoc.richtingLocatieId = nearest.id;
        newLoc.richtingLocatieNaam = nearest.naam;
        newLoc.richtingLocatieAfstand = nearest.distance;
      }

      await customerService.addLocation(newLoc);
      setLocations(prev => [...prev, newLoc]);

      if (newLoc.richtingLocatieNaam) {
        console.log(`✅ Automatische locatie toegevoegd: ${newLoc.address} (${newLoc.city}) → Richting: ${newLoc.richtingLocatieNaam}`);
      } else {
        console.log(`✅ Automatische locatie toegevoegd: ${newLoc.address} (${newLoc.city})`);
      }
    } catch (error) {
      console.warn('Automatisch locatie ophalen mislukt:', error);
    }
  };

  const displayLogoUrl = customer.logoUrl || getCompanyLogoUrl(customer.website);

  // Functie om PDF te genereren en toe te voegen aan Klantdossier
  const handleGeneratePDF = async () => {
    if (!organisatieProfiel) return;
    
    try {
      // Toon loading state
      const loadingAlert = alert('PDF wordt gegenereerd...');
      
      // Genereer PDF
      const pdfBlob = await generateOrganisatieProfielPDF(
        organisatieProfiel.organisatieNaam || customer.name,
        organisatieProfiel.analyseDatum,
        hoofdstukkenResultaten,
        organisatieProfiel.volledigRapport
      );

      // Upload naar Firebase Storage
      const fileName = `organisatie-profiel-${customer.id}-${Date.now()}.pdf`;
      const storageRef = ref(storage, `documents/${customer.id}/${fileName}`);
      await uploadBytes(storageRef, pdfBlob);
      const downloadURL = await getDownloadURL(storageRef);

      // Maak document aan in Firestore
      const documentId = `doc_${Date.now()}`;
      const documentData: DocumentSource = {
        id: documentId,
        title: `Publiek Organisatie Profiel - ${organisatieProfiel.organisatieNaam || customer.name}`,
        content: organisatieProfiel.volledigRapport || Object.values(hoofdstukkenResultaten).join('\n\n'),
        originalUrl: downloadURL,
        type: DocType.PDF,
        uploadedBy: user.id,
        uploadedAt: new Date().toISOString(),
        customerId: customer.id,
        summary: `Publiek Organisatie Profiel analyse voor ${organisatieProfiel.organisatieNaam || customer.name}`,
        mainCategoryId: 'strategy',
        subCategoryId: 'management',
        tags: ['organisatie-profiel', 'analyse', 'publiek'],
        viewedBy: [],
        likedBy: [],
        isArchived: false
      };

      await dbService.addDocument(documentData);

      // Refresh documenten
      const refreshedDocs = await dbService.getDocumentsForCustomer(customer.id);
      setDocs(refreshedDocs);

      alert(`✅ PDF succesvol toegevoegd aan Klantdossier!\n\nBestand: ${fileName}`);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`❌ Fout bij genereren PDF: ${error.message || 'Onbekende fout'}`);
    }
  };

  const getDocIcon = (type: DocType) => {
      switch(type) {
          case DocType.EMAIL: return <EmailIcon />;
          case DocType.GOOGLE_DOC: return <GoogleDocIcon />;
          case DocType.PDF: return <PdfIcon />;
          case DocType.URL: return <span className="text-xl">🔗</span>;
          default: return <span className="text-xl">📝</span>;
      }
  };

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between mb-4">
         <button onClick={onBack} className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium">
           ← Terug naar overzicht
         </button>
         <button 
           onClick={loadData}
           className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium"
           title="Ververs data (locaties, contactpersonen, etc.)"
         >
           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
           </svg>
           Ververs
         </button>
       </div>

       <div className="bg-white border-l-4 border-richting-orange rounded-r-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-bold text-slate-900">{customer.name}</h2>
              <div className="flex flex-col md:flex-row md:items-center gap-2 mt-2">
                 <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${customer.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {getStatusLabel(customer.status)}
                 </span>
                 <span className="text-gray-500">{customer.industry}</span>
                 {customer.website && (
                   <>
                     <span className="hidden md:inline text-gray-300">|</span>
                     <a href={ensureUrl(customer.website)} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-richting-orange hover:underline text-sm font-medium">
                        <img 
                          src={getCompanyLogoUrl(customer.website) || ''} 
                          alt="" 
                          className="w-4 h-4 object-contain rounded-sm"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        {customer.website.replace(/^https?:\/\//, '')}
                        <ExternalLinkIcon />
                     </a>
                   </>
                 )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2 items-end">
                    
                </div>

                <div className="flex items-start gap-4">
                    <div className="relative group">
                      <div className="w-16 h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer" onClick={() => setIsEditingCustomer(true)}>
                      {displayLogoUrl ? (
                          <img src={displayLogoUrl} alt={customer.name} className="w-14 h-14 object-contain" />
                      ) : (
                          <div className="w-full h-full bg-gray-50 flex items-center justify-center text-2xl">🏢</div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-xs font-bold bg-white px-1 rounded shadow">Edit</span>
                      </div>
                      </div>
                    </div>
                    
                    <div className="flex-1">
                        {isEditingCustomer ? (
                          <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 absolute z-10 w-96 left-0">
                            <h4 className="font-bold mb-3">Klantgegevens Bewerken</h4>
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Naam</label>
                                <input className="w-full border p-1 rounded text-sm" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Branche</label>
                                <input className="w-full border p-1 rounded text-sm" value={editCustomerIndustry} onChange={e => setEditCustomerIndustry(e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Website</label>
                                <input className="w-full border p-1 rounded text-sm" value={editCustomerWebsite} onChange={e => setEditCustomerWebsite(e.target.value)} />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Logo URL</label>
                                <input className="w-full border p-1 rounded text-sm" value={editCustomerLogoUrl} onChange={e => setEditCustomerLogoUrl(e.target.value)} placeholder="https://..." />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700">Medewerkers</label>
                                <input type="number" className="w-full border p-1 rounded text-sm" value={editCustomerEmployeeCount || ''} onChange={e => setEditCustomerEmployeeCount(parseInt(e.target.value))} />
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setIsEditingCustomer(false)} className="text-xs px-3 py-1 bg-gray-100 rounded">Annuleren</button>
                                <button onClick={handleSaveCustomerDetails} className="text-xs px-3 py-1 bg-richting-orange text-white rounded font-bold">Opslaan</button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-richting-orange transition-colors" onClick={() => setIsEditingCustomer(true)}>
                                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-normal">
                                    <span className="text-gray-400 mr-1">👥</span>
                                    {customer.employeeCount?.toLocaleString('nl-NL') || '?'} mdw
                                </span>
                                <span className="text-gray-300 text-sm">✎</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                <span>{customer.industry}</span>
                                {customer.website && (
                                    <a href={ensureUrl(customer.website)} target="_blank" rel="noopener noreferrer" className="text-richting-orange hover:underline flex items-center gap-1">
                                        🔗 {customer.website.replace(/^https?:\/\//, '')}
                                    </a>
                                )}
                            </div>
                          </>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {/* Status Badge */}
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0 ${
                        customer.status === 'active' ? 'bg-green-100 text-green-700' : 
                        customer.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 
                        customer.status === 'churned' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {getStatusLabel(customer.status)}
                      </span>
                    </div>
                    
                    {customer.statusDetails && (
                      <div className="text-xs text-gray-400 text-right max-w-[200px]">
                        <p>{new Date(customer.statusDetails.date).toLocaleDateString('nl-NL')}: {customer.statusDetails.reason}</p>
                      </div>
                    )}

                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => setShowSatisfactionModal(true)}
                        className={`text-xs flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border shadow-sm ${
                          customer.satisfaction
                            ? (() => {
                                const avg = (customer.satisfaction.trust + customer.satisfaction.attention + customer.satisfaction.equality) / 3;
                                if (avg > 7) return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
                                if (avg >= 6) return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
                                return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
                              })()
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <span className="text-sm">⭐</span>
                        {customer.satisfaction ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-start leading-none">
                              <span className="font-bold text-sm">
                                {((customer.satisfaction.trust + customer.satisfaction.attention + customer.satisfaction.equality) / 3).toFixed(1)}
                              </span>
                            </div>
                            
                            {/* Trend Arrow */}
                            {(() => {
                                const current = (customer.satisfaction.trust + customer.satisfaction.attention + customer.satisfaction.equality) / 3;
                                const previous = customer.satisfaction.previousAverage;
                                if (previous === undefined) return <span className="text-gray-400 text-xs">•</span>;
                                if (current > previous) return <span className="text-green-600 text-xs font-bold">↗</span>;
                                if (current < previous) return <span className="text-red-600 text-xs font-bold">↘</span>;
                                return <span className="text-gray-500 text-xs font-bold">=</span>;
                            })()}

                            {/* Date */}
                            <span className="text-[10px] opacity-70 border-l pl-2 border-current">
                              {new Date(customer.satisfaction.lastUpdated).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                            </span>
                          </div>
                        ) : (
                          <span>Klanttevredenheid</span>
                        )}
                      </button>
                    </div>
                </div>
            </div>
          </div>
       </div>

       {/* Status Change Modal */}
       {showStatusModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
             <h3 className="font-bold text-lg mb-4">Status wijzigen naar '{getStatusLabel(pendingStatus || '')}'</h3>
             <div className="space-y-4">
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                 <input 
                   type="date" 
                   value={statusDate}
                   onChange={(e) => setStatusDate(e.target.value)}
                   className="w-full border p-2 rounded"
                 />
               </div>
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Toelichting / Reden</label>
                 <textarea 
                   value={statusReason}
                   onChange={(e) => setStatusReason(e.target.value)}
                   className="w-full border p-2 rounded h-24"
                   placeholder="Bijv. Contract afgelopen, nieuwe strategie..."
                 />
               </div>
               <div className="flex justify-end gap-2 pt-2">
                 <button 
                   onClick={() => { setShowStatusModal(false); setPendingStatus(null); }}
                   className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                 >
                   Annuleren
                 </button>
                 <button 
                   onClick={handleSaveStatusChange}
                   className="px-4 py-2 bg-richting-orange text-white rounded font-bold hover:bg-orange-600"
                 >
                   Opslaan
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

       {/* Satisfaction Modal */}
       {showSatisfactionModal && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-xl p-6 w-[500px] shadow-xl">
             <h3 className="font-bold text-lg mb-4 flex items-center gap-2">⭐ Klanttevredenheid</h3>
             <div className="space-y-6">
               <div className="space-y-4">
                 <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-sm font-medium text-gray-700">Vertrouwen</label>
                     <span className="font-bold text-richting-orange">{satisfactionTrust}/10</span>
                   </div>
                   <input 
                     type="range" min="0" max="10" step="0.5"
                     value={satisfactionTrust}
                     onChange={(e) => setSatisfactionTrust(parseFloat(e.target.value))}
                     className="w-full accent-richting-orange"
                   />
                 </div>
                 <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-sm font-medium text-gray-700">Aandacht & Oprechte interesse</label>
                     <span className="font-bold text-richting-orange">{satisfactionAttention}/10</span>
                   </div>
                   <input 
                     type="range" min="0" max="10" step="0.5"
                     value={satisfactionAttention}
                     onChange={(e) => setSatisfactionAttention(parseFloat(e.target.value))}
                     className="w-full accent-richting-orange"
                   />
                 </div>
                 <div>
                   <div className="flex justify-between mb-1">
                     <label className="text-sm font-medium text-gray-700">Gelijkwaardigheid</label>
                     <span className="font-bold text-richting-orange">{satisfactionEquality}/10</span>
                   </div>
                   <input 
                     type="range" min="0" max="10" step="0.5"
                     value={satisfactionEquality}
                     onChange={(e) => setSatisfactionEquality(parseFloat(e.target.value))}
                     className="w-full accent-richting-orange"
                   />
                 </div>
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Peildatum</label>
                 <input 
                   type="date" 
                   value={satisfactionDate}
                   onChange={(e) => setSatisfactionDate(e.target.value)}
                   className="w-full border p-2 rounded text-sm"
                 />
               </div>
               
               <div>
                 <label className="block text-sm font-medium text-gray-700 mb-1">Toelichting</label>
                 <textarea 
                   value={satisfactionNotes}
                   onChange={(e) => setSatisfactionNotes(e.target.value)}
                   className="w-full border p-2 rounded h-24 text-sm"
                   placeholder="Licht de scores toe..."
                 />
               </div>

               <div className="flex justify-end gap-2 pt-2 border-t">
                 <button 
                   onClick={() => setShowSatisfactionModal(false)}
                   className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                 >
                   Annuleren
                 </button>
                 <button 
                   onClick={handleSaveSatisfaction}
                   className="px-4 py-2 bg-richting-orange text-white rounded font-bold hover:bg-orange-600"
                 >
                   Opslaan
                 </button>
               </div>

               {/* History Section */}
               {customer.satisfactionHistory && customer.satisfactionHistory.length > 0 && (
                 <div className="border-t pt-4 mt-4">
                   <h4 className="text-sm font-bold text-slate-700 mb-2">Historie</h4>
                   <div className="max-h-40 overflow-y-auto space-y-2">
                     {[...customer.satisfactionHistory]
                       .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                       .map((entry, idx) => (
                       <div key={idx} className="bg-gray-50 p-2 rounded text-xs border border-gray-100">
                         <div className="flex justify-between items-center mb-1">
                           <span className="font-semibold text-slate-700">
                             {new Date(entry.date).toLocaleDateString('nl-NL')}
                           </span>
                           <span className={`font-bold ${entry.average >= 7 ? 'text-green-600' : entry.average >= 6 ? 'text-yellow-600' : 'text-red-600'}`}>
                             {entry.average.toFixed(1)}
                           </span>
                         </div>
                         <div className="text-gray-500 flex gap-2 mb-1">
                           <span>V: {entry.trust}</span>
                           <span>A: {entry.attention}</span>
                           <span>G: {entry.equality}</span>
                         </div>
                         {entry.notes && (
                           <p className="text-gray-600 italic">"{entry.notes}"</p>
                         )}
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </div>
       )}

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* LOCATIONS SECTION */}
         <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><MapIcon/> Locaties</h3>
               <div className="flex gap-2">
                 {customer.website && (
                   <button 
                     onClick={handleFetchLocations} 
                     disabled={isFetchingLocations}
                     className={`text-xs px-2 py-1 rounded font-medium ${
                       isFetchingLocations 
                         ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                         : 'bg-richting-orange text-white hover:bg-orange-600'
                     }`}
                   >
                     {isFetchingLocations ? '⏳ Ophalen...' : '🔍 Locaties ophalen'}
                   </button>
                 )}
                 <button onClick={() => setIsAddingLoc(true)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-slate-700 font-medium">+ Toevoegen</button>
               </div>
            </div>

            {isAddingLoc && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in">
                 <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Nieuwe Locatie</h4>
                 <div className="space-y-3">
                    <input type="text" placeholder="Naam (bijv. Hoofdkantoor)" className="w-full text-sm border p-2 rounded" value={locName} onChange={e => setLocName(e.target.value)} />
                    <input type="text" placeholder="Adres" className="w-full text-sm border p-2 rounded" value={locAddress} onChange={e => setLocAddress(e.target.value)} />
                    <input type="text" placeholder="Stad" className="w-full text-sm border p-2 rounded" value={locCity} onChange={e => setLocCity(e.target.value)} />
                    <input 
                      type="number" 
                      placeholder="Aantal medewerkers (optioneel)" 
                      className="w-full text-sm border p-2 rounded" 
                      value={locEmployeeCount || ''} 
                      onChange={e => setLocEmployeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                      min="0"
                    />
                    <div className="flex gap-2 pt-2">
                       <button onClick={handleAddLocation} className="bg-richting-orange text-white text-xs px-3 py-2 rounded font-bold">Opslaan</button>
                       <button onClick={() => {
                         setIsAddingLoc(false);
                         setLocName(''); setLocAddress(''); setLocCity(''); setLocEmployeeCount(undefined);
                       }} className="text-gray-500 text-xs px-3 py-2">Annuleren</button>
                    </div>
                 </div>
              </div>
            )}

            <div className="space-y-3">
               {locations.length === 0 && !isAddingLoc && (
                 <div className="text-sm text-gray-400 italic">
                   <p>Nog geen locaties toegevoegd.</p>
                   <p className="text-xs mt-1 text-gray-300">Tip: Start de Klantreis om automatisch locaties te vinden.</p>
                 </div>
               )}
               {locations.map(loc => (
                 <div key={loc.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm group hover:border-richting-orange transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div className="flex-1">
                          <p className="font-bold text-slate-800 text-sm">{loc.name}</p>
                          <p className="text-xs text-gray-500">{loc.address}, {loc.city}</p>
                          {loc.employeeCount ? (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-gray-600">👥</span>
                              <span className="text-xs font-semibold text-richting-orange">{loc.employeeCount.toLocaleString('nl-NL')} medewerkers</span>
                            </div>
                          ) : (
                            <div className="mt-1 flex items-center gap-1">
                              <span className="text-xs text-gray-400 italic">👥 Geen medewerkersaantal opgegeven</span>
                            </div>
                          )}
                          {loc.richtingLocatieNaam && (
                            <div className="mt-2 flex items-center gap-1">
                              <span className="text-xs text-richting-orange font-medium">📍 Richtingvestiging:</span>
                              <span className="text-xs text-slate-700 font-semibold">{loc.richtingLocatieNaam}</span>
                              {loc.richtingLocatieAfstand !== undefined && (
                                <span className="text-xs text-gray-500">({loc.richtingLocatieAfstand.toFixed(1)} km)</span>
                              )}
                            </div>
                          )}
                       </div>
                       <div className="flex items-center gap-1">
                         <button
                           onClick={() => handleEditLocation(loc)}
                           className="text-gray-400 hover:text-richting-orange p-2 flex-shrink-0 transition-colors"
                           title="Bewerk locatie"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                           </svg>
                         </button>
                         <button
                           onClick={() => setDeletingLocation(loc)}
                           className="text-gray-400 hover:text-red-500 p-2 flex-shrink-0 transition-colors"
                           title="Verwijder locatie"
                         >
                           <TrashIcon />
                         </button>
                         <a 
                           href={getGoogleMapsLink(loc)} 
                           target="_blank" 
                           rel="noreferrer"
                           className="text-gray-400 hover:text-richting-orange p-2 flex-shrink-0 transition-colors"
                           title="Bekijk op kaart"
                         >
                           <MapIcon />
                         </a>
                       </div>
                    </div>
                 </div>
               ))}
            </div>
            
            {/* Edit Location Modal */}
            {editingLocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => {
                setEditingLocation(null);
                setEditLocEmployeeCount(undefined);
              }}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Bewerk Locatie</h3>
                      <button
                        onClick={() => {
                          setEditingLocation(null);
                          setEditLocEmployeeCount(undefined);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="font-bold text-slate-800 text-sm mb-1">{editingLocation.name}</p>
                        <p className="text-xs text-gray-500 mb-4">{editingLocation.address}, {editingLocation.city}</p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Aantal medewerkers
                        </label>
                        <input
                          type="number"
                          placeholder="Voer aantal medewerkers in"
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-richting-orange focus:border-richting-orange"
                          value={editLocEmployeeCount || ''}
                          onChange={e => setEditLocEmployeeCount(e.target.value ? parseInt(e.target.value) : undefined)}
                          min="0"
                        />
                        {editingLocation.employeeCount && (
                          <p className="text-xs text-gray-500 mt-1">
                            Huidig: {editingLocation.employeeCount.toLocaleString('nl-NL')} medewerkers
                          </p>
                        )}
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleSaveLocationEdit}
                          className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                        >
                          Opslaan
                        </button>
                        <button
                          onClick={() => {
                            setEditingLocation(null);
                            setEditLocEmployeeCount(undefined);
                          }}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Delete Location Confirmation Modal */}
            {deletingLocation && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setDeletingLocation(null)}>
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-900">Locatie Verwijderen</h3>
                      <button
                        onClick={() => setDeletingLocation(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-700 mb-2">
                          Weet je zeker dat je deze locatie wilt verwijderen?
                        </p>
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <p className="font-bold text-slate-800 text-sm">{deletingLocation.name}</p>
                          <p className="text-xs text-gray-500">{deletingLocation.address}, {deletingLocation.city}</p>
                          {deletingLocation.employeeCount && (
                            <p className="text-xs text-gray-500 mt-1">
                              {deletingLocation.employeeCount.toLocaleString('nl-NL')} medewerkers
                            </p>
                          )}
                        </div>
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          ⚠️ Deze actie kan niet ongedaan worden gemaakt.
                        </p>
                      </div>
                      
                      <div className="flex gap-3 pt-4">
                        <button
                          onClick={handleDeleteLocation}
                          className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                        >
                          Verwijderen
                        </button>
                        <button
                          onClick={() => setDeletingLocation(null)}
                          className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                        >
                          Annuleren
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
         </div>

         {/* CONTACTS SECTION */}
         <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><UserIcon/> Contactpersonen</h3>
               <button onClick={() => setIsAddingContact(true)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-slate-700 font-medium">+ Toevoegen</button>
            </div>

            {isAddingContact && (
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4 animate-fade-in">
                    <h4 className="text-xs font-bold uppercase text-gray-500 mb-3">Nieuw Contact</h4>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input type="text" placeholder="Voornaam" className="w-full text-sm border p-2 rounded" value={contactFirst} onChange={e => setContactFirst(e.target.value)} />
                            <input type="text" placeholder="Achternaam" className="w-full text-sm border p-2 rounded" value={contactLast} onChange={e => setContactLast(e.target.value)} />
                        </div>
                        <input type="email" placeholder="Email" className="w-full text-sm border p-2 rounded" value={contactEmail} onChange={e => setContactEmail(e.target.value)} />
                        <input type="text" placeholder="Rol (bijv. HR Manager)" className="w-full text-sm border p-2 rounded" value={contactRole} onChange={e => setContactRole(e.target.value)} />
                        <div className="flex gap-2 pt-2">
                            <button onClick={handleAddContact} className="bg-richting-orange text-white text-xs px-3 py-2 rounded font-bold">Opslaan</button>
                            <button onClick={() => setIsAddingContact(false)} className="text-gray-500 text-xs px-3 py-2">Annuleren</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
               {contacts.length === 0 && !isAddingContact && <p className="text-sm text-gray-400 italic">Nog geen contactpersonen.</p>}
               {contacts.map(contact => (
                   <div key={contact.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                       <p className="font-bold text-slate-800 text-sm">{contact.firstName} {contact.lastName}</p>
                       <p className="text-xs text-gray-500">{contact.role}</p>
                       <a 
                         href={`https://mail.google.com/mail/?view=cm&fs=1&to=${contact.email}`} 
                         target="_blank" 
                         rel="noreferrer"
                         className="text-xs text-richting-orange hover:underline block mt-1 flex items-center gap-1"
                       >
                          {contact.email} <ExternalLinkIcon />
                       </a>
                   </div>
               ))}
            </div>
         </div>
       </div>


       {/* ORGANISATIE ANALYSE SECTION */}
       <div className="pt-8 border-t border-gray-200">
         <div className="flex justify-between items-center mb-4">
           <h3 className="font-bold text-slate-900 text-lg">Organisatie Analyse</h3>
           <div className="flex gap-2">
             <button
               onClick={async () => {
                 setIsAnalyzingOrganisatie(true);
                 setOrganisatieAnalyseResultaat(null);
                 setAnalyseStap(0);
                 setHoofdstukkenResultaten({});
                 
                 try {
                   // Start stapsgewijze analyse
                   const functionsUrl = `${FUNCTIONS_BASE_URL}/analyseBrancheStapsgewijs`;
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       organisatieNaam: customer.name,
                       website: customer.website || '',
                       customerId: customer.id
                     })
                   });

                   if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                     throw new Error(`HTTP error! status: ${response.status} - ${errorData.error || 'Unknown error'}`);
                   }

                   const data = await response.json();
                   const newAnalyseId = data.analyseId;
                   if (!newAnalyseId) {
                     throw new Error('Geen analyseId ontvangen van server');
                   }
                   setAnalyseId(newAnalyseId);
                   
                   // Poll for progress
                   const progressUrl = `${FUNCTIONS_BASE_URL}/getAnalyseProgress`;
                   const pollInterval = setInterval(async () => {
                     try {
                       const progressResponse = await fetch(`${progressUrl}?analyseId=${newAnalyseId}`);
                       if (!progressResponse.ok) {
                         clearInterval(pollInterval);
                         return;
                       }
                       
                       const progress = await progressResponse.json();
                       
                       // Update progress
                       setAnalyseStap(progress.progress.huidigeStap || 0);
                       
                       // Update hoofdstukken resultaten
                       const nieuweResultaten: {[key: string]: string} = {};
                       Object.keys(progress.hoofdstukken || {}).forEach(key => {
                         const hoofdstuk = progress.hoofdstukken[key];
                         if (hoofdstuk.status === 'completed' && hoofdstuk.content) {
                           nieuweResultaten[key] = hoofdstuk.content;
                         }
                       });
                       setHoofdstukkenResultaten(nieuweResultaten);
                       
                       // Check if completed
                       if (progress.status === 'completed') {
                         clearInterval(pollInterval);
                         setIsAnalyzingOrganisatie(false);
                         
                         // AUTOMATISCH: Refresh documenten in Klantdossier
                         // Het document wordt automatisch aangemaakt door de backend
                         // We moeten de documenten opnieuw ophalen
                         try {
                           const refreshedDocs = await dbService.getDocumentsForCustomer(customer.id);
                           setDocs(refreshedDocs);
                           console.log('✅ Documenten gerefresht na voltooide analyse');
                         } catch (error) {
                           console.error('❌ Error refreshing documents:', error);
                         }
                         
                         // Show volledig rapport if available
                         if (progress.volledigRapport) {
                           setOrganisatieAnalyseResultaat(progress.volledigRapport);
                         } else {
                           // Combine all hoofdstukken
                           const combined = Object.keys(nieuweResultaten).sort().map(key => {
                             return `## Hoofdstuk ${key}: ${ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}\n\n${nieuweResultaten[key]}\n\n`;
                           }).join('');
                           setOrganisatieAnalyseResultaat(combined);
                         }
                         
                         // Reload organisatie profiel
                         const profiel = await customerService.getOrganisatieProfiel(customer.id);
                         if (profiel) {
                           setOrganisatieProfiel(profiel);
                         }
                       } else if (progress.status === 'failed') {
                         clearInterval(pollInterval);
                         setIsAnalyzingOrganisatie(false);
                         setOrganisatieAnalyseResultaat(`Fout bij analyse: ${progress.error || 'Onbekende fout'}`);
                       }
                     } catch (pollError) {
                       console.error("Error polling progress:", pollError);
                     }
                   }, 2000); // Poll every 2 seconds
                   
                   // Cleanup on unmount
                   return () => clearInterval(pollInterval);
                 } catch (error: any) {
                   console.error("Organisatie analyse error:", error);
                   setOrganisatieAnalyseResultaat(`Fout bij starten analyse: ${error.message || 'Onbekende fout'}`);
                   setIsAnalyzingOrganisatie(false);
                 }
               }}
               disabled={isAnalyzingOrganisatie}
               className="bg-richting-orange text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingOrganisatie ? "⏳ Analyseren..." : "📊 Publiek Organisatie Profiel"}
             </button>
             <button
               onClick={async () => {
                 setIsAnalyzingCultuur(true);
                 setCultuurAnalyseResultaat(null);
                 setCultuurAnalyseStap(0);
                 
                 // Start progress steps for cultuur analyse
                 const cultuurStappen = [
                   "CultuurDNA Analyse",
                   "Cultuurvolwassenheid Assessment",
                   "Performance & Engagement Analyse",
                   "Gaps & Barrières Identificatie",
                   "Opportuniteiten & Thema's",
                   "Gedragingen Analyse",
                   "Interventies & Actieplan",
                   "Risico's Psychosociale Arbeidsbelasting",
                   "Aanbevelingen Formulering",
                   "Prioriteitsmatrix Opstellen",
                   "Rapportage Genereren",
                   "Resultaat Opslaan"
                 ];
                 
                 // Simulate progress through steps
                 const stepInterval = setInterval(() => {
                   setCultuurAnalyseStap(prev => {
                     if (prev >= 12) {
                       clearInterval(stepInterval);
                       return 12;
                     }
                     return prev + 1;
                   });
                 }, 2000); // Update every 2 seconds
                 
                 try {
                   // Use Firebase Function to get active prompt from Firestore
                   const functionsUrl = `${FUNCTIONS_BASE_URL}/analyseCultuurTest`;
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       organisatieNaam: customer.name,
                       website: customer.website || ''
                     })
                   });

                   if (!response.ok) {
                     throw new Error(`HTTP error! status: ${response.status}`);
                   }

                   const data = await response.json();
                   
                   // The Firebase Function returns JSON with the full cultuur profiel
                   // Use volledigRapport if available, otherwise format the JSON
                   let result = '';
                   if (data.volledigRapport) {
                     result = data.volledigRapport;
                   } else {
                     // Format as markdown
                     result = `# Cultuur Analyse Resultaat\n\n`;
                     if (data.scores) {
                       result += `## The Executive Pulse\n\n`;
                       result += `- Cultuurvolwassenheid: ${data.scores.cultuurvolwassenheid || 0}/100\n`;
                       result += `- Groeidynamiek: ${data.scores.groeidynamiekScore || 0}/100\n`;
                       result += `- Cultuurfit: ${data.scores.cultuurfit || 0}/100\n`;
                       result += `- Cultuursterkte: ${data.scores.cultuursterkte || 'gemiddeld'}\n`;
                       result += `- Dynamiek Type: ${data.scores.dynamiekType || 'organisch_groeiend'}\n\n`;
                     }
                     if (data.dna) {
                       result += `## Het Cultuur DNA\n\n`;
                       result += `- Dominant Type: ${data.dna.dominantType || 'hybride'}\n`;
                       if (data.dna.kernwaarden && data.dna.kernwaarden.length > 0) {
                         result += `\n### Kernwaarden:\n`;
                         data.dna.kernwaarden.forEach((kw: any) => {
                           result += `- ${kw.waarde}: ${kw.score || 0}/100 (${kw.status || 'neutraal'})\n`;
                         });
                       }
                     }
                     if (data.gaps && data.gaps.length > 0) {
                       result += `\n## Gaps & Barrières\n\n`;
                       data.gaps.forEach((gap: any) => {
                         result += `- ${gap.dimensie}: Gap van ${gap.gap || 0} (Urgentie: ${gap.urgentie || 'gemiddeld'})\n`;
                       });
                     }
                     if (data.interventies && data.interventies.length > 0) {
                       result += `\n## Interventies & Actieplan\n\n`;
                       data.interventies.forEach((int: any) => {
                         result += `- ${int.naam} (${int.type || 'strategisch'}): ${int.beschrijving || ''}\n`;
                       });
                     }
                   }
                   
                   clearInterval(stepInterval);
                   setCultuurAnalyseStap(12); // Mark all steps as complete
                   setCultuurAnalyseResultaat(result);
                   
                   // Save to Firestore as CultuurProfiel (if we have a collection for this)
                   // Note: This might need to be added to customerService if not already present
                 } catch (error) {
                   clearInterval(stepInterval);
                   console.error("Cultuur analyse error:", error);
                   setCultuurAnalyseResultaat("Fout bij analyse. Probeer het opnieuw.");
                   setCultuurAnalyseStap(0);
                 } finally {
                   setIsAnalyzingCultuur(false);
                 }
               }}
               disabled={isAnalyzingCultuur}
               className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-600 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingCultuur ? "⏳ Analyseren..." : "🎭 Cultuur Analyse"}
             </button>
             <button
               onClick={async () => {
                 setIsAnalyzingRisico(true);
                 setRisicoProfielData(null);
                 
                 try {
                   const functionsUrl = `${FUNCTIONS_BASE_URL}/analyseRisicoProfiel`;
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ 
                       customerId: customer.id,
                       organisatieNaam: customer.name,
                       website: customer.website || '',
                       userId: user.id
                     })
                   });

                   if (!response.ok) {
                     const errorData = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
                     throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                   }

                   const data = await response.json();
                   
                   if (data.success) {
                     // Reload data from Firestore
                     const [processen, functies, stoffen, risicos] = await Promise.all([
                       processService.getProcessesByCustomer(customer.id),
                       functionService.getFunctionsByCustomer(customer.id),
                       substanceService.getSubstancesByCustomer(customer.id),
                       getRisksByCustomer(customer.id)
                     ]);
                     
                     setRisicoProfielData({
                       processen,
                       functies,
                       stoffen,
                       risicos
                     });
                     
                     alert(`✅ Risico profiel analyse voltooid!\n\n${data.summary.processen} processen\n${data.summary.functies} functies\n${data.summary.stoffen} stoffen\n${data.summary.risicos} risico's`);
                   } else {
                     throw new Error(data.error || 'Onbekende fout');
                   }
                 } catch (error: any) {
                   console.error("Risico analyse error:", error);
                   alert(`❌ Fout bij risico analyse: ${error.message || 'Onbekende fout'}`);
                 } finally {
                   setIsAnalyzingRisico(false);
                 }
               }}
               disabled={isAnalyzingRisico}
               className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
             >
               {isAnalyzingRisico ? "⏳ Analyseren..." : "⚠️ Risico Profiel"}
             </button>
           </div>
         </div>

         {/* Analyse Progress Steps */}
         {isAnalyzingOrganisatie && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <span className="animate-spin">⏳</span> Analyse in uitvoering...
             </h4>
             <div className="space-y-3">
               {ORGANISATIE_ANALYSE_HOOFDSTUKKEN_ARRAY.map((stap, index) => {
                 const stapNummer = index + 1;
                 const isVoltooid = analyseStap > stapNummer;
                 const isHuidige = analyseStap === stapNummer;
                 
                 return (
                   <div 
                     key={index}
                     className={`flex items-center gap-3 p-2 rounded transition-colors ${
                       isHuidige ? 'bg-orange-50 border border-orange-200' : ''
                     }`}
                   >
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                       isVoltooid 
                         ? 'bg-green-500 text-white' 
                         : isHuidige 
                         ? 'bg-richting-orange text-white animate-pulse' 
                         : 'bg-gray-200 text-gray-400'
                     }`}>
                       {isVoltooid ? (
                         <span className="text-xs font-bold">✓</span>
                       ) : isHuidige ? (
                         <span className="text-xs font-bold animate-spin">⟳</span>
                       ) : (
                         <span className="text-xs font-bold">{stapNummer}</span>
                       )}
                     </div>
                     <span className={`text-sm ${
                       isVoltooid 
                         ? 'text-gray-600 line-through' 
                         : isHuidige 
                         ? 'text-richting-orange font-bold' 
                         : 'text-gray-400'
                     }`}>
                       {stapNummer}. {stap}
                     </span>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>Voortgang: {analyseStap} van 13 stappen</span>
                 <div className="w-32 bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-richting-orange h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(analyseStap / 13) * 100}%` }}
                   ></div>
                 </div>
               </div>
             </div>
             
             {/* Tussentijds Resultaten per Hoofdstuk */}
             {Object.keys(hoofdstukkenResultaten).length > 0 && (
               <div className="mt-4 pt-4 border-t border-gray-200">
                 <h5 className="text-sm font-bold text-slate-900 mb-3">Tussentijds Resultaten:</h5>
                 <div className="space-y-3 max-h-96 overflow-y-auto">
                   {Object.keys(hoofdstukkenResultaten).sort().map(key => {
                     return (
                       <div key={key} className="bg-green-50 border border-green-200 rounded p-3">
                         <h6 className="text-xs font-bold text-green-700 mb-1">
                           ✅ Hoofdstuk {key}: {ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}
                         </h6>
                         <p className="text-xs text-gray-600 line-clamp-3">
                           {hoofdstukkenResultaten[key].substring(0, 200)}...
                         </p>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}
           </div>
         )}

         {/* Analyse Resultaten - Verbeterde Layout */}
         {organisatieAnalyseResultaat && (
           <div className="bg-white border border-orange-200 rounded-xl shadow-lg p-6 mb-4">
             <div className="flex items-center justify-between mb-4">
               <h4 className="font-bold text-richting-orange text-xl flex items-center gap-2">📊 Publiek Organisatie Profiel Resultaat</h4>
               {organisatieProfiel && (
                 <button
                   onClick={handleGeneratePDF}
                   className="px-4 py-2 bg-richting-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                 >
                   📄 PDF Toevoegen aan Dossier
                 </button>
               )}
             </div>
             
             {/* Per Hoofdstuk Weergave */}
             {Object.keys(hoofdstukkenResultaten).length > 0 ? (
               <div className="space-y-6">
                 {Object.keys(hoofdstukkenResultaten).sort((a, b) => parseInt(a) - parseInt(b)).map((key) => {
                   return (
                     <div key={key} className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border border-gray-200 shadow-sm">
                       <h5 className="text-xl font-bold text-richting-orange mb-4 pb-2 border-b-2 border-richting-orange">
                         Hoofdstuk {key}: {ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`}
                       </h5>
                       <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                         <ReactMarkdown>{hoofdstukkenResultaten[key]}</ReactMarkdown>
                       </div>
                     </div>
                   );
                 })}
               </div>
             ) : (
               <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-6 border-2 border-gray-200">
                 <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                   <ReactMarkdown>{organisatieAnalyseResultaat}</ReactMarkdown>
                 </div>
               </div>
             )}
           </div>
         )}

         {/* Cultuur Analyse Progress Steps */}
         {isAnalyzingCultuur && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <span className="animate-spin">⏳</span> Cultuur Analyse in uitvoering...
             </h4>
             <div className="space-y-3">
               {[
                 "CultuurDNA Analyse",
                 "Cultuurvolwassenheid Assessment",
                 "Performance & Engagement Analyse",
                 "Gaps & Barrières Identificatie",
                 "Opportuniteiten & Thema's",
                 "Gedragingen Analyse",
                 "Interventies & Actieplan",
                 "Risico's Psychosociale Arbeidsbelasting",
                 "Aanbevelingen Formulering",
                 "Prioriteitsmatrix Opstellen",
                 "Rapportage Genereren",
                 "Resultaat Opslaan"
               ].map((stap, index) => {
                 const stapNummer = index + 1;
                 const isVoltooid = cultuurAnalyseStap > stapNummer;
                 const isHuidige = cultuurAnalyseStap === stapNummer;
                 
                 return (
                   <div 
                     key={index}
                     className={`flex items-center gap-3 p-2 rounded transition-colors ${
                       isHuidige ? 'bg-slate-50 border border-slate-200' : ''
                     }`}
                   >
                     <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                       isVoltooid 
                         ? 'bg-green-500 text-white' 
                         : isHuidige 
                         ? 'bg-slate-700 text-white animate-pulse' 
                         : 'bg-gray-200 text-gray-400'
                     }`}>
                       {isVoltooid ? (
                         <span className="text-xs font-bold">✓</span>
                       ) : isHuidige ? (
                         <span className="text-xs font-bold animate-spin">⟳</span>
                       ) : (
                         <span className="text-xs font-bold">{stapNummer}</span>
                       )}
                     </div>
                     <span className={`text-sm ${
                       isVoltooid 
                         ? 'text-gray-600 line-through' 
                         : isHuidige 
                         ? 'text-slate-700 font-bold' 
                         : 'text-gray-400'
                     }`}>
                       {stapNummer}. {stap}
                     </span>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>Voortgang: {cultuurAnalyseStap} van 12 stappen</span>
                 <div className="w-32 bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-slate-700 h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(cultuurAnalyseStap / 12) * 100}%` }}
                   ></div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {cultuurAnalyseResultaat && (
           <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
             <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">🎭 Cultuur Analyse Resultaat</h4>
             <p className="text-sm text-gray-700 whitespace-pre-wrap">{cultuurAnalyseResultaat}</p>
           </div>
         )}

         {/* Risico Profiel Data Display */}
         {risicoProfielData && (
           <div className="bg-white border border-red-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-red-700 mb-4 flex items-center gap-2">⚠️ Risico Profiel</h4>
             
             {/* Tabs */}
             <div className="flex gap-2 mb-4 border-b border-gray-200">
               {(['overview', 'processen', 'functies', 'stoffen', 'risicos'] as const).map(tab => (
                 <button
                   key={tab}
                   onClick={() => setActiveRisicoTab(tab)}
                   className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                     activeRisicoTab === tab
                       ? 'bg-red-50 text-red-700 border-b-2 border-red-600'
                       : 'text-gray-600 hover:text-red-600'
                   }`}
                 >
                   {tab === 'overview' ? '📊 Overzicht' : 
                    tab === 'processen' ? `⚙️ Processen (${risicoProfielData.processen.length})` :
                    tab === 'functies' ? `👥 Functies (${risicoProfielData.functies.length})` :
                    tab === 'stoffen' ? `🧪 Stoffen (${risicoProfielData.stoffen.length})` :
                    `⚠️ Risico's (${risicoProfielData.risicos.length})`}
                 </button>
               ))}
             </div>
             
             {/* Tab Content */}
             <div className="mt-4">
               {activeRisicoTab === 'overview' && (
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <div className="bg-blue-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Processen</p>
                     <p className="text-2xl font-bold text-blue-700">{risicoProfielData.processen.length}</p>
                   </div>
                   <div className="bg-green-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Functies</p>
                     <p className="text-2xl font-bold text-green-700">{risicoProfielData.functies.length}</p>
                   </div>
                   <div className="bg-yellow-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Stoffen</p>
                     <p className="text-2xl font-bold text-yellow-700">{risicoProfielData.stoffen.length}</p>
                   </div>
                   <div className="bg-red-50 p-4 rounded-lg">
                     <p className="text-sm text-gray-600">Risico's</p>
                     <p className="text-2xl font-bold text-red-700">{risicoProfielData.risicos.length}</p>
                   </div>
                 </div>
               )}
               
               {activeRisicoTab === 'processen' && (
                 <div className="space-y-3">
                   {risicoProfielData.processen.map(proc => (
                     <div key={proc.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{proc.name}</h5>
                       {proc.description && <p className="text-sm text-gray-600 mt-1">{proc.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'functies' && (
                 <div className="space-y-3">
                   {risicoProfielData.functies.map(func => (
                     <div key={func.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{func.name}</h5>
                       {func.department && <p className="text-xs text-gray-500">{func.department}</p>}
                       {func.description && <p className="text-sm text-gray-600 mt-1">{func.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'stoffen' && (
                 <div className="space-y-3">
                   {risicoProfielData.stoffen.map(stof => (
                     <div key={stof.id} className="border border-gray-200 rounded-lg p-4">
                       <h5 className="font-bold text-gray-800">{stof.name}</h5>
                       {stof.casNumber && <p className="text-xs text-gray-500">CAS: {stof.casNumber}</p>}
                       {stof.hazardPhrases && stof.hazardPhrases.length > 0 && (
                         <p className="text-xs text-red-600 mt-1">H-zinnen: {stof.hazardPhrases.join(', ')}</p>
                       )}
                       {stof.description && <p className="text-sm text-gray-600 mt-1">{stof.description}</p>}
                     </div>
                   ))}
                 </div>
               )}
               
               {activeRisicoTab === 'risicos' && (
                 <div className="space-y-3">
                   {risicoProfielData.risicos.map(risico => (
                     <div key={risico.id} className={`border rounded-lg p-4 ${
                       risico.calculatedScore >= 400 ? 'border-red-500 bg-red-50' :
                       risico.calculatedScore >= 200 ? 'border-orange-500 bg-orange-50' :
                       risico.calculatedScore >= 100 ? 'border-yellow-500 bg-yellow-50' :
                       'border-gray-200 bg-gray-50'
                     }`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h5 className="font-bold text-gray-800">{risico.riskName}</h5>
                            <p className="text-xs text-gray-500 mt-1">
                              Score: {risico.calculatedScore} | 
                              Prioriteit: {['', 'Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'][risico.priority]} | 
                              Kans: {risico.probability} | 
                              Effect: {risico.effect} | 
                              Blootstelling: {risico.exposure}
                            </p>
                          </div>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            risico.priority === 1 ? 'bg-red-600 text-white' :
                            risico.priority === 2 ? 'bg-orange-500 text-white' :
                            risico.priority === 3 ? 'bg-yellow-500 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {['', 'Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'][risico.priority]}
                          </span>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
         )}

         {organisatieProfiel && (
           <>
             {/* Header met Organisatie Info */}
             <div className="bg-gradient-to-r from-richting-orange to-orange-600 rounded-xl shadow-lg p-6 mb-6 text-white">
               <div className="flex items-center justify-between mb-4">
                 <div>
                   <h3 className="text-2xl font-bold mb-1">Publiek Organisatie Profiel</h3>
                   <p className="text-orange-100 text-sm">{organisatieProfiel.organisatieNaam || customer.name}</p>
                 </div>
                 <div className="text-right">
                   <p className="text-xs text-orange-100 mb-1">Analyse Datum</p>
                   <p className="text-sm font-bold">{new Date(organisatieProfiel.analyseDatum).toLocaleDateString('nl-NL')}</p>
                 </div>
               </div>
               <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-orange-400/30">
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Risico's</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.risicos?.length || 0}</p>
                 </div>
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Processen</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.processen?.length || 0}</p>
                 </div>
                 <div>
                   <p className="text-xs text-orange-100 mb-1">Functies</p>
                   <p className="text-2xl font-bold">{organisatieProfiel.functies?.length || 0}</p>
                 </div>
               </div>
             </div>

           {/* Risico's Overzicht */}
           {organisatieProfiel.risicos && organisatieProfiel.risicos.length > 0 && (
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
               <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <span className="text-2xl">⚠️</span> Risico Overzicht
               </h4>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                 {['psychisch', 'fysiek', 'overige'].map(cat => {
                   const risicosInCat = organisatieProfiel.risicos.filter(r => r.categorie === cat);
                   const gemiddeldeRisico = risicosInCat.length > 0
                     ? risicosInCat.reduce((sum, r) => {
                         // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                         const kans = r.kans;
                         const effect = r.effect;
                         return sum + (kans * effect);
                       }, 0) / risicosInCat.length
                     : 0;
                   const categorieLabels = { 'psychisch': 'Psychisch', 'fysiek': 'Fysiek', 'overige': 'Overige' };
                   const categorieColors = {
                     'psychisch': 'bg-purple-100 text-purple-700 border-purple-200',
                     'fysiek': 'bg-blue-100 text-blue-700 border-blue-200',
                     'overige': 'bg-gray-100 text-gray-700 border-gray-200'
                   };
                   return (
                     <div key={cat} className={`p-4 rounded-lg border-2 ${categorieColors[cat as keyof typeof categorieColors]}`}>
                       <p className="text-sm font-bold mb-2">{categorieLabels[cat as keyof typeof categorieLabels]}</p>
                       <p className="text-3xl font-bold mb-1">{risicosInCat.length}</p>
                       <p className="text-xs opacity-75">Gemiddeld risico: {Math.round(gemiddeldeRisico)}</p>
                     </div>
                   );
                 })}
               </div>
               <div className="space-y-2 max-h-64 overflow-y-auto">
                 {organisatieProfiel.risicos
                   .map(risico => {
                     // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                     const kans = risico.kans;
                     const effect = risico.effect;
                     const risicogetal = kans * effect;
                     const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                     return { risico, kans, effect, risicogetal, prioriteitNiveau };
                   })
                   .sort((a, b) => b.risicogetal - a.risicogetal)
                   .slice(0, 10)
                   .map(({ risico, kans, effect, risicogetal, prioriteitNiveau }) => {
                     const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                     const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                     const categorieColors = {
                       'psychisch': 'bg-purple-50 text-purple-700',
                       'fysiek': 'bg-blue-50 text-blue-700',
                       'overige': 'bg-gray-50 text-gray-700'
                     };
                     return (
                       <div key={risico.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-richting-orange transition-colors">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 mb-1">
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                               {risico.categorie}
                             </span>
                             <span className="text-sm font-bold text-slate-900">{risico.naam}</span>
                           </div>
                           <div className="flex items-center gap-4 text-xs text-gray-500">
                             <span>Kans: {kans}</span>
                             <span>Effect: {effect}</span>
                             <span className="font-bold text-slate-700">Risico: {risicogetal}</span>
                           </div>
                         </div>
                         <span className={`px-3 py-1 rounded text-xs font-bold border ${prioriteitColors[prioriteitNiveau - 1]}`}>
                           {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                         </span>
                       </div>
                     );
                   })}
               </div>
             </div>
           )}

           {/* Processen en Functies Overzicht */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
             {/* Processen */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">⚙️</span> Processen ({organisatieProfiel.processen?.length || 0})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(organisatieProfiel.processen || [])
                  .map(proces => {
                    try {
                      const risicos = proces.risicos || [];
                      // Bereken prioriteit voor dit proces
                      const risicosMetBerekening = risicos.map(item => {
                        const risico = item.risico || (organisatieProfiel.risicos || []).find(r => r.id === item.risicoId);
                        if (!risico) return null;
                        const blootstelling = item.blootstelling || 3;
                        // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                        const kans = risico.kans;
                        const effect = risico.effect;
                        const risicogetal = blootstelling * kans * effect;
                        return { risico, blootstelling, kans, effect, risicogetal };
                      }).filter(Boolean);
                      const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                        ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                        : 0;
                      const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                      return { proces, prioriteitNiveau, risicos };
                    } catch (error) {
                      console.error(`Error processing proces ${proces.id}:`, error);
                      return { proces, prioriteitNiveau: 5, risicos: [] };
                    }
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ proces, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={proces.id} 
                        onClick={() => setSelectedProces(proces)}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-richting-orange hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-base text-slate-900 group-hover:text-richting-orange transition-colors">{proces.naam}</h5>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{proces.beschrijving}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ml-3 flex-shrink-0 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-richting-orange">⚠️</span> {risicos.length} risico{risicos.length !== 1 ? "'s" : ""}
                          </span>
                          <span className="text-xs text-richting-orange font-medium group-hover:underline">Details bekijken →</span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>

             {/* Functies */}
             <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h4 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <span className="text-2xl">👥</span> Functies ({organisatieProfiel.functies?.length || 0})
              </h4>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {(organisatieProfiel.functies || [])
                  .map(functie => {
                    try {
                      const risicos = functie.risicos || [];
                      // Bereken prioriteit voor deze functie
                      const risicosMetBerekening = risicos.map(item => {
                        const risico = item.risico || (organisatieProfiel.risicos || []).find(r => r.id === item.risicoId);
                        if (!risico) return null;
                        const blootstelling = item.blootstelling || 3;
                        // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                        const kans = risico.kans;
                        const effect = risico.effect;
                        const risicogetal = blootstelling * kans * effect;
                        return { risico, blootstelling, kans, effect, risicogetal };
                      }).filter(Boolean);
                      const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                        ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                        : 0;
                      const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                      return { functie, prioriteitNiveau, risicos };
                    } catch (error) {
                      console.error(`Error processing functie ${functie.id}:`, error);
                      return { functie, prioriteitNiveau: 5, risicos: [] };
                    }
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ functie, prioriteitNiveau, risicos }) => {
                    const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                    const prioriteitColors = ['bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-yellow-100 text-yellow-700', 'bg-blue-100 text-blue-700', 'bg-green-100 text-green-700'];
                    
                    return (
                      <div 
                        key={functie.id} 
                        onClick={async () => {
                          setSelectedFunctie(functie);
                          // Haal risico's op voor deze functie
                          try {
                            const functieRisicos = await getRisksByFunction(functie.id);
                            setSelectedFunctieRisicos(functieRisicos);
                            console.log(`✅ ${functieRisicos.length} risico's opgehaald voor functie ${functie.naam}`);
                          } catch (error) {
                            console.error('❌ Error loading risks for function:', error);
                            setSelectedFunctieRisicos([]);
                          }
                        }}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-richting-orange hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-base text-slate-900 group-hover:text-richting-orange transition-colors">{functie.naam}</h5>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{functie.beschrijving}</p>
                          </div>
                          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ml-3 flex-shrink-0 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                            {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                          </span>
                        </div>
                        {functie.fysiek !== undefined && functie.psychisch !== undefined && (
                          <div className="flex items-center gap-4 mt-2 mb-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">💪 Fysiek:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={`w-3 h-3 rounded-full ${i <= functie.fysiek ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-blue-600 ml-1">{functie.fysiek}/5</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">🧠 Psychisch:</span>
                              <div className="flex gap-0.5">
                                {[1, 2, 3, 4, 5].map(i => (
                                  <div key={i} className={`w-3 h-3 rounded-full ${i <= functie.psychisch ? 'bg-purple-500' : 'bg-gray-200'}`} />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-purple-600 ml-1">{functie.psychisch}/5</span>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-richting-orange">⚠️</span> {functieRisicoCounts[functie.id] ?? risicos.length} risico{(functieRisicoCounts[functie.id] ?? risicos.length) !== 1 ? "'s" : ""}
                          </span>
                          <span className="text-xs text-richting-orange font-medium group-hover:underline">Details bekijken →</span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
           </div>

           {/* Volledig Rapport - Verbeterde Layout met Markdown */}
           {organisatieProfiel.volledigRapport && (
             <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 mb-6">
               <div className="flex items-center justify-between mb-6">
                 <h4 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                   <span className="text-3xl">📄</span> Volledig Rapport
                 </h4>
                 <div className="flex gap-2">
                   <button
                     onClick={handleGeneratePDF}
                     className="px-4 py-2 bg-richting-orange text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-2"
                   >
                     📄 PDF Toevoegen aan Dossier
                   </button>
                   <button
                     onClick={() => {
                       const printWindow = window.open('', '_blank');
                       if (printWindow) {
                         printWindow.document.write(`
                           <!DOCTYPE html>
                           <html>
                             <head>
                               <title>Organisatie Profiel - ${organisatieProfiel.organisatieNaam || customer.name}</title>
                               <style>
                                 body { font-family: 'Inter', sans-serif; padding: 40px; line-height: 1.6; color: #1a202c; }
                                 h1 { color: #F36F21; border-bottom: 3px solid #F36F21; padding-bottom: 10px; }
                                 h2 { color: #2d3748; margin-top: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                                 h3 { color: #4a5568; margin-top: 20px; }
                                 table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                                 th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
                                 th { background-color: #f7fafc; font-weight: bold; }
                                 .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
                               </style>
                             </head>
                             <body>
                               ${organisatieProfiel.volledigRapport.replace(/\n/g, '<br>')}
                             </body>
                           </html>
                         `);
                         printWindow.document.close();
                         setTimeout(() => printWindow.print(), 250);
                       }
                     }}
                     className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors flex items-center gap-2"
                   >
                     🖨️ Print / Export
                   </button>
                 </div>
               </div>
               <div className="bg-gradient-to-br from-gray-50 to-white rounded-lg p-8 border-2 border-gray-200 shadow-inner">
                 <div className="prose prose-lg max-w-none prose-headings:text-slate-900 prose-headings:font-bold prose-p:text-gray-700 prose-p:leading-relaxed prose-strong:text-slate-900 prose-ul:text-gray-700 prose-ol:text-gray-700 prose-li:my-2 prose-table:w-full prose-th:bg-gray-100 prose-th:font-bold prose-th:p-3 prose-td:p-3 prose-a:text-richting-orange prose-a:no-underline hover:prose-a:underline">
                   <ReactMarkdown>{organisatieProfiel.volledigRapport}</ReactMarkdown>
                 </div>
               </div>
             </div>
           )}

           {/* Detail Modal voor Proces of Functie */}
           {(selectedProces || selectedFunctie) && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
                 <div className="bg-gradient-to-r from-richting-orange to-orange-600 px-6 py-4 flex justify-between items-center">
                   <h3 className="font-bold text-white text-lg">
                     {selectedProces ? `⚙️ Proces: ${selectedProces.naam}` : `👥 Functie: ${selectedFunctie?.naam}`}
                   </h3>
                   <button 
                     onClick={() => { 
                       setSelectedProces(null); 
                       setSelectedFunctie(null);
                       setSelectedFunctieRisicos([]);
                     }}
                     className="text-white hover:text-gray-200 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
                   >
                     ✕
                   </button>
                 </div>
                 <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                   {selectedProces && (
                     <>
                       <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded mb-6">
                         <p className="text-sm text-gray-700 leading-relaxed">{selectedProces.beschrijving}</p>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                         <span>⚠️</span> Risico's ({selectedProces.risicos?.length || 0})
                       </h4>
                       <div className="overflow-x-auto border border-gray-200 rounded-lg">
                         <table className="min-w-full divide-y divide-gray-200">
                           <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                             <tr>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risico</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Categorie</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Blootstelling (B)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kans (W)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Effect (E)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risicogetal (R)</th>
                               <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Prioriteit</th>
                             </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-200">
                             {selectedProces.risicos
                               ?.map((item, idx) => {
                                 const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                 if (!risico) return null;
                                 const blootstelling = item.blootstelling || 3;
                                 // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                 const kans = risico.kans;
                                 const effect = risico.effect;
                                 const risicogetal = blootstelling * kans * effect;
                                 const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                                 return { item, risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau, idx };
                               })
                               .filter(Boolean)
                               .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                               .map((data) => {
                                 if (!data) return null;
                                 const { risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau } = data;
                                 const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                                 const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                                 const categorieColors = {
                                   'fysiek': 'bg-blue-50 text-blue-700',
                                   'psychisch': 'bg-purple-50 text-purple-700',
                                   'overige': 'bg-gray-50 text-gray-700'
                                 };
                                 
                                 return (
                                   <tr key={data.idx} className="hover:bg-gray-50 transition-colors">
                                     <td className="px-4 py-3 text-sm font-medium text-gray-900">{risico.naam}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risico.categorie] || categorieColors.overige}`}>
                                         {risico.categorie}
                                       </span>
                                     </td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{blootstelling}</td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{kans}</td>
                                     <td className="px-4 py-3 text-sm text-gray-700 font-medium">{effect}</td>
                                     <td className="px-4 py-3 text-sm font-bold text-richting-orange">{risicogetal}</td>
                                     <td className="px-4 py-3">
                                       <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                         {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                       </span>
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                           <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50">
                             <tr>
                               <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal Risicogetal:</td>
                               <td className="px-4 py-3 text-sm font-bold text-richting-orange text-lg">
                                 {selectedProces.risicos
                                   ?.map(item => {
                                     const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                     if (!risico) return 0;
                                     const blootstelling = item.blootstelling || 3;
                                     // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                     const kans = risico.kans;
                                     const effect = risico.effect;
                                     return blootstelling * kans * effect;
                                   })
                                   .reduce((sum, val) => sum + val, 0) || 0}
                               </td>
                             </tr>
                           </tfoot>
                         </table>
                       </div>
                     </>
                   )}
                   {selectedFunctie && (
                     <>
                       <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded mb-6">
                         <p className="text-sm text-gray-700 leading-relaxed">{selectedFunctie.beschrijving}</p>
                       </div>
                       <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                         <span>📊</span> Functiebelasting
                       </h4>
                       <div className="mb-6 grid grid-cols-2 gap-4">
                         <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                           <span className="text-xs text-gray-600 font-medium block mb-2">💪 Fysieke Belasting</span>
                           <div className="flex items-center gap-3">
                             <div className="flex gap-1">
                               {[1, 2, 3, 4, 5].map(i => (
                                 <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= (selectedFunctie.fysiek || 0) ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                   {i}
                                 </div>
                               ))}
                             </div>
                             <p className="text-3xl font-bold text-blue-600">{selectedFunctie.fysiek || 0}/5</p>
                           </div>
                         </div>
                         <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                           <span className="text-xs text-gray-600 font-medium block mb-2">🧠 Psychische Belasting</span>
                           <div className="flex items-center gap-3">
                             <div className="flex gap-1">
                               {[1, 2, 3, 4, 5].map(i => (
                                 <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${i <= (selectedFunctie.psychisch || 0) ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                   {i}
                                 </div>
                               ))}
                             </div>
                             <p className="text-3xl font-bold text-purple-600">{selectedFunctie.psychisch || 0}/5</p>
                           </div>
                         </div>
                       </div>
                      {(() => {
                        const risicoRows =
                          (selectedFunctieRisicos.length > 0
                            ? selectedFunctieRisicos.map((risk, idx) => ({
                                key: risk.id || idx,
                                naam: risk.riskName,
                                categorie: risk.category || 'Overige',
                                blootstelling: risk.exposure ?? 3,
                                kans: risk.probability ?? 3,
                                effect: risk.effect ?? 3,
                                score: risk.calculatedScore ?? ((risk.exposure ?? 3) * (risk.probability ?? 3) * (risk.effect ?? 3))
                              }))
                            : (selectedFunctie?.risicos || []).map((item, idx) => {
                                const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                if (!risico) return null;
                                const blootstelling = item.blootstelling || 3;
                                // Direct Fine & Kinney waarden gebruiken (geen conversie meer)
                                const kans = risico.kans;
                                const effect = risico.effect;
                                const score = blootstelling * kans * effect;
                                return {
                                  key: risico.id || idx,
                                  naam: risico.naam,
                                  categorie: risico.categorie || 'Overige',
                                  blootstelling,
                                  kans,
                                  effect,
                                  score
                                };
                              }).filter(Boolean)) as Array<{
                                key: string | number;
                                naam: string;
                                categorie: string;
                                blootstelling: number;
                                kans: number;
                                effect: number;
                                score: number;
                              }>;

                        const prioriteitLabels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
                        const prioriteitColors = ['bg-red-100 text-red-700 border-red-300', 'bg-orange-100 text-orange-700 border-orange-300', 'bg-yellow-100 text-yellow-700 border-yellow-300', 'bg-blue-100 text-blue-700 border-blue-300', 'bg-green-100 text-green-700 border-green-300'];
                        const categorieColors: {[key: string]: string} = {
                          'Fysiek': 'bg-blue-100 text-blue-700',
                          'Psychisch': 'bg-purple-100 text-purple-700',
                          'Chemisch': 'bg-orange-100 text-orange-700',
                          'Biologisch': 'bg-green-100 text-green-700',
                          'Ergonomisch': 'bg-yellow-100 text-yellow-700',
                          'Overige': 'bg-gray-100 text-gray-700'
                        };

                        return (
                          <>
                            <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                              <span>⚠️</span> Risico's ({risicoRows.length})
                            </h4>
                            {risicoRows.length === 0 ? (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                <p className="text-gray-500 text-sm">Geen risico's gekoppeld aan deze functie.</p>
                              </div>
                            ) : (
                              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                  <thead className="bg-gradient-to-r from-gray-100 to-gray-50">
                                    <tr>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risico</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Categorie</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Blootstelling (B)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Kans (W)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Effect (E)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Risicogetal (R)</th>
                                      <th className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase">Prioriteit</th>
                                    </tr>
                                  </thead>
                                  <tbody className="bg-white divide-y divide-gray-200">
                                    {risicoRows.map((risk, idx) => {
                                      const prioriteitNiveau = risk.score >= 400 ? 1 : risk.score >= 200 ? 2 : risk.score >= 100 ? 3 : risk.score >= 50 ? 4 : 5;
                                      return (
                                        <tr key={risk.key ?? idx} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{risk.naam}</td>
                                          <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${categorieColors[risk.categorie] || categorieColors['Overige']}`}>
                                              {risk.categorie}
                                            </span>
                                          </td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.blootstelling}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.kans}</td>
                                          <td className="px-4 py-3 text-sm text-gray-700 font-medium">{risk.effect}</td>
                                          <td className="px-4 py-3 text-sm font-bold text-richting-orange">{risk.score}</td>
                                          <td className="px-4 py-3">
                                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${prioriteitColors[prioriteitNiveau - 1]}`}>
                                              {prioriteitNiveau}. {prioriteitLabels[prioriteitNiveau - 1]}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                  <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50">
                                    <tr>
                                      <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal Risicogetal:</td>
                                      <td className="px-4 py-3 text-sm font-bold text-richting-orange text-lg">
                                        {risicoRows.reduce((sum, risk) => sum + (risk.score || 0), 0)}
                                      </td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            )}
                          </>
                        );
                      })()}
                     </>
                   )}
                 </div>
               </div>
             </div>
           )}
           </>
         )}
       </div>

       {/* DOCUMENTS SECTION */}
       <div className="pt-8 border-t border-gray-200">
          <h3 className="font-bold text-slate-900 mb-4 text-lg">Klant Dossier</h3>
          {docs.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Nog geen documenten gekoppeld aan dit dossier.</p>
          ) : (
              <div className="grid grid-cols-1 gap-3">
                  {docs.map(doc => (
                      <div key={doc.id} onClick={() => onOpenDoc(doc)} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-richting-orange cursor-pointer group">
                          <div className="flex items-center gap-3">
                              <div className="text-gray-600">
                                {getDocIcon(doc.type)}
                              </div>
                              <div>
                                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-richting-orange">{doc.title}</h4>
                                  <p className="text-xs text-gray-500">{new Date(doc.uploadedAt).toLocaleDateString()} - {getCategoryLabel(doc.mainCategoryId)}</p>
                              </div>
                          </div>
                          <button className="text-xs text-richting-orange font-bold uppercase">Openen</button>
                      </div>
                  ))}
              </div>
          )}
       </div>
    </div>
  );
};

// --- CUSTOMERS VIEW ---
const CustomersView = ({ user, onOpenDoc }: { user: User, onOpenDoc: (d: DocumentSource) => void }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
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
    // setShowKlantreis(false); // Don't auto-show Klantreis, show detail view instead
    
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
             // Ensure assignedUserIds is an array to prevent crashes
             const assignedUsers = cust.assignedUserIds || [];

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

