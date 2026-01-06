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
export const SettingsView = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'autorisatie' | 'promptbeheer' | 'databeheer' | 'typebeheer'>('autorisatie');
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptType, setPromptType] = useState<string>('publiek_organisatie_profiel');
  const [promptTypes, setPromptTypes] = useState<{type: string, label: string}[]>([]);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeLabel, setNewTypeLabel] = useState('');
  const [editingType, setEditingType] = useState<{type: string, label: string} | null>(null);
  const [editingTypeLabel, setEditingTypeLabel] = useState('');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [viewingFile, setViewingFile] = useState<{name: string, content: string} | null>(null);
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);
  
  // Locatie management state
  const [showAddLocatieModal, setShowAddLocatieModal] = useState(false);
  const [editingLocatie, setEditingLocatie] = useState<RichtingLocatie | null>(null);
  const [newLocatieVestiging, setNewLocatieVestiging] = useState('');
  const [newLocatieStad, setNewLocatieStad] = useState('');
  const [newLocatieRegio, setNewLocatieRegio] = useState('');
  const [newLocatieAdres, setNewLocatieAdres] = useState('');
  const [newLocatieVolledigAdres, setNewLocatieVolledigAdres] = useState('');
  const [newLocatieLatitude, setNewLocatieLatitude] = useState('');
  const [newLocatieLongitude, setNewLocatieLongitude] = useState('');
  const [savingLocatie, setSavingLocatie] = useState(false);
  
  // Data management sub tabs
  const [dataManagementSubTab, setDataManagementSubTab] = useState<'klanten' | 'locaties' | 'documents' | 'logo'>('klanten');
  
  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  
  // Import customers state
  const [showImportCustomersModal, setShowImportCustomersModal] = useState(false);
  const [importCustomersFile, setImportCustomersFile] = useState<File | null>(null);
  const [importCustomersPreview, setImportCustomersPreview] = useState<Partial<Customer>[] | null>(null);
  const [importingCustomers, setImportingCustomers] = useState(false);
  
  // Bulk location import state
  const [bulkImportingLocations, setBulkImportingLocations] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState<{current: number, total: number} | null>(null);
  
  // User management state
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>(UserRole.EDITOR);
  const [creatingUser, setCreatingUser] = useState(false);
  
  // Edit user state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>(UserRole.EDITOR);
  const [updatingUser, setUpdatingUser] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [usersData, promptsData, locatiesData, typesWithLabelsData, logoUrlData] = await Promise.all([
          authService.getAllUsers(),
          promptService.getPrompts(),
          richtingLocatiesService.getAllLocaties(),
          promptService.getPromptTypesWithLabels(),
          logoService.getLogoUrl()
        ]);
        setUsers(usersData);
        setPrompts(promptsData);
        setRichtingLocaties(locatiesData);
        setLogoUrl(logoUrlData);
        
        // Alleen loggen als er geen prompts zijn (voor debugging)
        if (promptsData.length === 0) {
          console.warn('⚠️ No prompts found. Check Firestore collection "prompts" in database "richting01"');
        }
        // Verwijder normale logging - te veel noise in console tijdens analyse
        
        // Use types with labels directly from service
        setPromptTypes(typesWithLabelsData);
      } catch (error) {
        console.error("❌ Error loading settings data:", error);
        // Show error to user
        alert(`Fout bij laden van data: ${error instanceof Error ? error.message : 'Onbekende fout'}`);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);
  
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Alleen afbeeldingsbestanden zijn toegestaan (PNG, JPG, etc.)');
      return;
    }
    
    setUploadingLogo(true);
    try {
      const url = await logoService.uploadLogo(file);
      setLogoUrl(url);
      alert('✅ Logo succesvol geüpload! Ververs de pagina om het nieuwe logo te zien.');
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      alert(`❌ Fout bij uploaden logo: ${error.message || 'Onbekende fout'}`);
    } finally {
      setUploadingLogo(false);
    }
  };


  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await authService.updateUserRole(userId, newRole);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      if (user.id === userId) {
        window.location.reload(); // Reload if current user's role changed
      }
    } catch (error) {
      console.error("Error updating user role:", error);
      alert("Fout bij het bijwerken van de rol. Probeer het opnieuw.");
    }
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) {
      alert('Vul naam en e-mailadres in');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newUserEmail)) {
      alert('Voer een geldig e-mailadres in');
      return;
    }

    setCreatingUser(true);
    try {
      const newUser = await authService.createUserByAdmin(newUserEmail, newUserName, newUserRole);
      const updatedUsers = await authService.getAllUsers();
      setUsers(updatedUsers);
      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserRole(UserRole.EDITOR);
      alert(`✅ Gebruiker "${newUserName}" is aangemaakt!\n\nEen wachtwoord reset email is verzonden naar ${newUserEmail}. De gebruiker kan hiermee een eigen wachtwoord instellen.`);
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(`❌ Fout bij aanmaken gebruiker: ${error.message || 'Onbekende fout'}`);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserEmail(user.email);
    setEditUserRole(user.role);
  };

  const handleImportCustomersFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportCustomersFile(file);
    
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        alert('CSV bestand is leeg');
        return;
      }

      // Parse CSV header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'naam' || h === 'klant');
      const industryIdx = headers.findIndex(h => h === 'industry' || h === 'branche');
      const websiteIdx = headers.findIndex(h => h === 'website');
      const statusIdx = headers.findIndex(h => h === 'status');
      const employeeCountIdx = headers.findIndex(h => h === 'employeecount' || h === 'aantal_medewerkers' || h === 'aantal medewerkers');

      if (nameIdx === -1) {
        alert('CSV moet minimaal een "name", "naam" of "klant" kolom bevatten');
        return;
      }

      // Parse data rows
      const customers: Partial<Customer>[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length < 1) continue;

        const name = values[nameIdx];
        if (!name) continue;

        // Parse employeeCount als getal
        let employeeCount: number | undefined = undefined;
        if (employeeCountIdx >= 0 && values[employeeCountIdx]) {
          const parsed = parseInt(values[employeeCountIdx], 10);
          if (!isNaN(parsed)) {
            employeeCount = parsed;
          }
        }

        // Parse status - normaliseer naar geldige waarden
        let status: Customer['status'] = 'active';
        if (statusIdx >= 0 && values[statusIdx]) {
          const statusValue = values[statusIdx].toLowerCase().trim();
          if (['active', 'actief'].includes(statusValue)) {
            status = 'active';
          } else if (['prospect'].includes(statusValue)) {
            status = 'prospect';
          } else if (['churned', 'archief'].includes(statusValue)) {
            status = 'churned';
          } else if (['rejected', 'afgewezen'].includes(statusValue)) {
            status = 'rejected';
          } else {
            status = 'active'; // Default naar active
          }
        }

        customers.push({
          name,
          industry: industryIdx >= 0 ? values[industryIdx] : undefined,
          website: websiteIdx >= 0 ? values[websiteIdx] : undefined,
          status: status,
          employeeCount: employeeCount,
          assignedUserIds: [],
          createdAt: new Date().toISOString()
        });
      }

      setImportCustomersPreview(customers);
    } catch (error: any) {
      console.error("Error parsing CSV:", error);
      alert(`Fout bij lezen CSV: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleImportCustomers = async () => {
    if (!importCustomersPreview || importCustomersPreview.length === 0) {
      alert('Geen klanten om te importeren');
      return;
    }

    setImportingCustomers(true);
    try {
      const result = await customerService.importCustomers(importCustomersPreview as Omit<Customer, 'id'>[]);
      alert(`✅ ${result.success} klanten geïmporteerd${result.errors.length > 0 ? `\n\n⚠️ ${result.errors.length} fouten:\n${result.errors.slice(0, 5).join('\n')}` : ''}`);
      setShowImportCustomersModal(false);
      setImportCustomersFile(null);
      setImportCustomersPreview(null);
    } catch (error: any) {
      console.error("Error importing customers:", error);
      alert(`❌ Fout bij importeren: ${error.message || 'Onbekende fout'}`);
    } finally {
      setImportingCustomers(false);
    }
  };

  const handleExportCustomers = async () => {
    try {
      const customers = await customerService.getAllCustomers();
      const csv = [
        ['name', 'industry', 'website', 'status', 'Aantal_medewerkers'].join(','),
        ...customers.map(c => [
          c.name,
          c.industry,
          c.website || '',
          c.status,
          c.employeeCount || ''
        ].map(v => `"${v}"`).join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `klanten-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ ${customers.length} klanten geëxporteerd`);
    } catch (error: any) {
      console.error("Error exporting customers:", error);
      alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
    }
  };

  // Bulk-import locaties voor alle klanten zonder locaties (maar met website)
  const handleBulkImportLocations = async () => {
    if (!window.confirm('Dit haalt locaties op voor alle klanten met een website maar zonder locaties. Dit kan even duren. Doorgaan?')) {
      return;
    }

    setBulkImportingLocations(true);
    setBulkImportProgress({ current: 0, total: 0 });

    try {
      // Haal alle klanten op
      const allCustomers = await customerService.getAllCustomers();
      
      // Filter: klanten met website maar zonder locaties
      const customersWithoutLocations = [];
      for (const customer of allCustomers) {
        if (customer.website) {
          const locations = await customerService.getLocations(customer.id);
          if (locations.length === 0) {
            customersWithoutLocations.push(customer);
          }
        }
      }

      if (customersWithoutLocations.length === 0) {
        alert('Geen klanten gevonden zonder locaties (met website).');
        setBulkImportingLocations(false);
        setBulkImportProgress(null);
        return;
      }

      setBulkImportProgress({ current: 0, total: customersWithoutLocations.length });

      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      // Verwerk elke klant
      for (let i = 0; i < customersWithoutLocations.length; i++) {
        const customer = customersWithoutLocations[i];
        setBulkImportProgress({ current: i + 1, total: customersWithoutLocations.length });

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

          if (fetchedLocaties.length > 0) {
            // Verwerk elke gevonden locatie
            for (const locData of fetchedLocaties) {
              try {
                // Geocodeer adres
                const geocodeResponse = await fetch(
                  `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${locData.adres}, ${locData.stad}, Nederland`)}&limit=1&countrycodes=nl`,
                  {
                    headers: {
                      'User-Agent': 'Richting-Kennisbank/1.0 (contact@richting.nl)'
                    }
                  }
                );
                
                let coordinates: { latitude: number; longitude: number } | null = null;
                if (geocodeResponse.ok) {
                  const geocodeData = await geocodeResponse.json();
                  if (geocodeData && geocodeData.length > 0) {
                    coordinates = {
                      latitude: parseFloat(geocodeData[0].lat),
                      longitude: parseFloat(geocodeData[0].lon)
                    };
                  }
                }

                // Vind dichtstbijzijnde Richting locatie
                let richtingLocatie = null;
                if (coordinates) {
                  const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
                  const locatiesMetCoordinaten = allRichtingLocaties.filter(
                    rl => rl.latitude !== undefined && rl.longitude !== undefined
                  );
                  
                  if (locatiesMetCoordinaten.length > 0) {
                    let nearest: { id: string; naam: string; distance: number } | null = null;
                    let minDistance = Infinity;
                    
                    for (const rl of locatiesMetCoordinaten) {
                      if (rl.latitude && rl.longitude) {
                        const R = 6371; // Earth radius in km
                        const dLat = (rl.latitude - coordinates.latitude) * Math.PI / 180;
                        const dLon = (rl.longitude - coordinates.longitude) * Math.PI / 180;
                        const a = 
                          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                          Math.cos(coordinates.latitude * Math.PI / 180) * Math.cos(rl.latitude * Math.PI / 180) *
                          Math.sin(dLon / 2) * Math.sin(dLon / 2);
                        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                        const distance = R * c;
                        
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
                    richtingLocatie = nearest;
                  }
                }

                const locationToSave: Location = {
                  id: `loc_${Date.now()}_${i}_${Math.random()}`,
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

                await customerService.addLocation(locationToSave);
              } catch (error: any) {
                console.error(`Error processing location ${locData.naam} for ${customer.name}:`, error);
              }
            }

            // Update customer.employeeCount
            const updatedLocations = await customerService.getLocations(customer.id);
            const totalEmployees = updatedLocations.reduce((sum, loc) => sum + (loc.employeeCount || 0), 0);
            if (totalEmployees > 0) {
              await customerService.updateCustomer(customer.id, { employeeCount: totalEmployees });
            }

            successCount++;
          } else {
            errorCount++;
            errors.push(`${customer.name}: Geen locaties gevonden`);
          }
        } catch (error: any) {
          errorCount++;
          errors.push(`${customer.name}: ${error.message || 'Onbekende fout'}`);
          console.error(`Error fetching locations for ${customer.name}:`, error);
        }

        // Kleine delay om rate limiting te voorkomen
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      alert(`✅ Bulk-import voltooid!\n\n✅ ${successCount} klanten verwerkt\n❌ ${errorCount} fouten${errors.length > 0 ? `\n\nFouten:\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n... en ${errors.length - 10} meer` : ''}` : ''}`);
    } catch (error: any) {
      console.error('Error in bulk import:', error);
      alert(`❌ Fout bij bulk-import: ${error.message || 'Onbekende fout'}`);
    } finally {
      setBulkImportingLocations(false);
      setBulkImportProgress(null);
    }
  };

  const handleExportDocuments = async () => {
    try {
      const documents = await dbService.getDocuments();
      const data = JSON.stringify(documents, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert(`✅ ${documents.length} documents geëxporteerd`);
    } catch (error: any) {
      console.error("Error exporting documents:", error);
      alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;
    
    if (!editUserName || !editUserEmail) {
      alert('Vul naam en e-mailadres in');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editUserEmail)) {
      alert('Voer een geldig e-mailadres in');
      return;
    }

    setUpdatingUser(true);
    try {
      await authService.updateUser(editingUser.id, {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole
      });
      
      const updatedUsers = await authService.getAllUsers();
      setUsers(updatedUsers);
      setEditingUser(null);
      setEditUserName('');
      setEditUserEmail('');
      setEditUserRole(UserRole.EDITOR);
      alert('✅ Gebruiker bijgewerkt!');
      
      // Reload if current user was edited
      if (user.id === editingUser.id) {
        window.location.reload();
      }
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
    } finally {
      setUpdatingUser(false);
    }
  };

  const handleSavePrompt = async () => {
    if (!promptName || !promptContent) {
      alert("Vul naam en inhoud in");
      return;
    }

    try {
      const promptData = {
        name: promptName,
        type: promptType,
        promptTekst: promptContent,
        versie: selectedPrompt?.versie || 1,
        isActief: selectedPrompt?.isActief ?? false,
        files: selectedPrompt?.files || []
      };

      await promptService.savePrompt(
        selectedPrompt ? { ...promptData, id: selectedPrompt.id } : promptData,
        user.id
      );

      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      setShowPromptEditor(false);
      setSelectedPrompt(null);
      setPromptName('');
      setPromptContent('');
    } catch (error) {
      console.error("Error saving prompt:", error);
      alert("Fout bij het opslaan van de prompt. Probeer het opnieuw.");
    }
  };

  const handleActivatePrompt = async (promptId: string, type: string) => {
    if (!window.confirm('Weet je zeker dat je deze prompt wilt activeren? Dit deactiveert alle andere prompts van dit type (maar andere types blijven actief).')) {
      return;
    }

    try {
      await promptService.activatePrompt(promptId, type);
      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      // Update selected prompt if it's the one we activated
      if (selectedPrompt && selectedPrompt.id === promptId) {
        const updated = await promptService.getPrompt(promptId);
        if (updated) setSelectedPrompt(updated);
      }
      alert('Prompt geactiveerd!');
    } catch (error) {
      console.error("Error activating prompt:", error);
      alert("Fout bij het activeren van de prompt. Probeer het opnieuw.");
    }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (!window.confirm('Weet je zeker dat je deze prompt wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.')) {
      return;
    }

    try {
      await promptService.deletePrompt(promptId);
      const updatedPrompts = await promptService.getPrompts();
      setPrompts(updatedPrompts);
      if (selectedPrompt && selectedPrompt.id === promptId) {
        setSelectedPrompt(null);
        setShowPromptEditor(false);
      }
      alert('✅ Prompt verwijderd');
    } catch (error: any) {
      console.error("Error deleting prompt:", error);
      alert(`❌ Fout bij verwijderen: ${error.message || 'Onbekende fout'}`);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, promptId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await promptService.addFileToPrompt(promptId, file.name, content);
        
        // Update selectedPrompt to show the new file immediately
        const updatedPrompt = await promptService.getPrompt(promptId);
        if (updatedPrompt) {
          setSelectedPrompt(updatedPrompt);
        }
        
        // Update prompts list
        const updatedPrompts = await promptService.getPrompts();
        setPrompts(updatedPrompts);
        
        // Reset file input so same file can be selected again
        event.target.value = '';
        
        setUploadingFile(false);
        alert(`✅ Bestand "${file.name}" succesvol toegevoegd!`);
      };
      reader.onerror = () => {
        console.error("Error reading file");
        alert("Fout bij het lezen van het bestand.");
        setUploadingFile(false);
        event.target.value = '';
      };
      reader.readAsText(file);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      alert(`❌ Fout bij het uploaden van het bestand: ${error.message || 'Onbekende fout'}`);
      setUploadingFile(false);
      event.target.value = '';
    }
  };

  const handleEditPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setPromptName(prompt.name);
    setPromptContent(prompt.promptTekst || '');
    setPromptType(prompt.type);
    setShowPromptEditor(true);
  };

  const handleNewPrompt = () => {
    setSelectedPrompt(null);
    setPromptName('');
    setPromptContent('');
    setPromptType('publiek_organisatie_profiel');
    setShowPromptEditor(true);
  };

  if (loading) {
    return <div className="text-center py-10 text-gray-500">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Instellingen</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('autorisatie')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'autorisatie'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🔐 Autorisatie
        </button>
        <button
          onClick={() => setActiveTab('promptbeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'promptbeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 Promptbeheer
        </button>
        <button
          onClick={() => setActiveTab('databeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'databeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          💾 Data Beheer
        </button>
        <button
          onClick={() => setActiveTab('typebeheer')}
          className={`px-6 py-3 text-sm font-medium transition-colors ${
            activeTab === 'typebeheer'
              ? 'text-richting-orange border-b-2 border-richting-orange'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          🏷️ Type Beheer
        </button>
      </div>

      {/* Autorisatie Tab */}
      {activeTab === 'autorisatie' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-slate-900">Gebruikers</h3>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
            >
              + Toevoegen
            </button>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Nieuwe Gebruiker Toevoegen</h3>
                  <button
                    onClick={() => {
                      setShowAddUserModal(false);
                      setNewUserName('');
                      setNewUserEmail('');
                      setNewUserRole(UserRole.EDITOR);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="Bijv. Jan Jansen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mailadres</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="bijv. jan@richting.nl"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                    <p className="text-sm text-blue-700">
                      <strong>Let op:</strong> Na het aanmaken wordt automatisch een wachtwoord reset email verzonden. De gebruiker kan hiermee een eigen wachtwoord instellen.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleAddUser}
                      disabled={creatingUser}
                      className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {creatingUser ? 'Aanmaken...' : 'Gebruiker Aanmaken'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddUserModal(false);
                        setNewUserName('');
                        setNewUserEmail('');
                        setNewUserRole(UserRole.EDITOR);
                      }}
                      disabled={creatingUser}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Edit User Modal */}
          {editingUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">Gebruiker Bewerken</h3>
                  <button
                    onClick={() => {
                      setEditingUser(null);
                      setEditUserName('');
                      setEditUserEmail('');
                      setEditUserRole(UserRole.EDITOR);
                    }}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                    <input
                      type="text"
                      value={editUserName}
                      onChange={(e) => setEditUserName(e.target.value)}
                      placeholder="Bijv. Jan Jansen"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-mailadres</label>
                    <input
                      type="email"
                      value={editUserEmail}
                      onChange={(e) => setEditUserEmail(e.target.value)}
                      placeholder="bijv. jan@richting.nl"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rol</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                    <p className="text-sm text-yellow-700">
                      <strong>Let op:</strong> E-mailadres wijzigingen worden alleen in Firestore opgeslagen. Voor wijzigingen in Firebase Authentication is extra configuratie nodig.
                    </p>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleUpdateUser}
                      disabled={updatingUser}
                      className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                    >
                      {updatingUser ? 'Bijwerken...' : 'Opslaan'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingUser(null);
                        setEditUserName('');
                        setEditUserEmail('');
                        setEditUserRole(UserRole.EDITOR);
                      }}
                      disabled={updatingUser}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <p>Nog geen gebruikers gevonden.</p>
              </div>
            ) : (
              users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-richting-orange transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} alt={u.name} className="w-10 h-10 rounded-full" />
                    <div className="flex-1">
                      <p className="font-bold text-slate-900">{u.name}</p>
                      <p className="text-sm text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400 mt-1">Rol: {u.role}</p>
                    </div>
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-richting-orange focus:border-richting-orange"
                    >
                      <option value={UserRole.ADMIN}>Admin</option>
                      <option value={UserRole.EDITOR}>Editor</option>
                      <option value={UserRole.READER}>Reader</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleEditUser(u)}
                      className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={async () => {
                        if (!window.confirm(`Weet je zeker dat je gebruiker "${u.name}" wilt verwijderen?`)) {
                          return;
                        }
                        try {
                          await authService.deleteUser(u.id);
                          const updatedUsers = await authService.getAllUsers();
                          setUsers(updatedUsers);
                          alert('✅ Gebruiker verwijderd');
                        } catch (error: any) {
                          alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                        }
                      }}
                      className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Promptbeheer Tab */}
      {activeTab === 'promptbeheer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Prompts</h3>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  try {
                    const result = await promptService.restoreDefaultPrompts(user.id);
                    alert(`✅ ${result.message}`);
                    const updatedPrompts = await promptService.getPrompts();
                    setPrompts(updatedPrompts);
                  } catch (error: any) {
                    alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
              >
                🔄 Herstel Default Prompts
              </button>
              <button
                onClick={async () => {
                  try {
                    const exportData = await promptService.exportPrompts();
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `prompts-backup-${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    alert('✅ Prompts geëxporteerd');
                  } catch (error: any) {
                    alert(`❌ Fout bij exporteren: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
              >
                📥 Exporteer
              </button>
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (!file) return;
                    
                    const text = await file.text();
                    const overwrite = window.confirm('Wil je bestaande prompts overschrijven? (Nee = alleen nieuwe toevoegen)');
                    
                    try {
                      const result = await promptService.importPrompts(text, user.id, overwrite);
                      alert(`✅ ${result.message}`);
                      const updatedPrompts = await promptService.getPrompts();
                      setPrompts(updatedPrompts);
                    } catch (error: any) {
                      alert(`❌ Fout bij importeren: ${error.message || 'Onbekende fout'}`);
                    }
                  };
                  input.click();
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
              >
                📤 Importeer
              </button>
              <button
                onClick={handleNewPrompt}
                className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + Toevoegen
              </button>
            </div>
          </div>

          {showPromptEditor ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h4 className="text-lg font-bold text-slate-900 mb-4">
                {selectedPrompt ? 'Prompt Bewerken' : 'Nieuwe Prompt'}
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Naam</label>
                  <input
                    type="text"
                    value={promptName}
                    onChange={(e) => setPromptName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                    placeholder="Bijv. Branche Analyse Prompt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  >
                    {promptTypes.map(type => (
                      <option key={type.type} value={type.type}>{type.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inhoud (promptTekst)</label>
                  <textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    rows={15}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange font-mono text-sm"
                    placeholder="Voer de prompt inhoud in..."
                  />
                </div>
                {selectedPrompt && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActief"
                      checked={selectedPrompt.isActief || false}
                      onChange={async (e) => {
                        if (selectedPrompt && (selectedPrompt.type === 'publiek_organisatie_profiel' || selectedPrompt.type === 'publiek_cultuur_profiel')) {
                          if (e.target.checked) {
                            await handleActivatePrompt(selectedPrompt.id, selectedPrompt.type as 'publiek_organisatie_profiel' | 'publiek_cultuur_profiel');
                            const updated = await promptService.getPrompt(selectedPrompt.id);
                            if (updated) setSelectedPrompt(updated);
                          } else {
                            // Deactivate
                            await updateDoc(doc(db, 'prompts', selectedPrompt.id), { 
                              isActief: false,
                              updatedAt: new Date().toISOString()
                            });
                            const updated = await promptService.getPrompt(selectedPrompt.id);
                            if (updated) setSelectedPrompt(updated);
                            const allPrompts = await promptService.getPrompts();
                            setPrompts(allPrompts);
                          }
                        }
                      }}
                      disabled={selectedPrompt.type === 'other'}
                      className="w-4 h-4 text-richting-orange border-gray-300 rounded focus:ring-richting-orange"
                    />
                    <label htmlFor="isActief" className="text-sm text-gray-700">
                      Actief (alleen voor Branche Analyse / Publiek Cultuur Profiel)
                    </label>
                  </div>
                )}
                {selectedPrompt && selectedPrompt.files && selectedPrompt.files.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bijgevoegde Bestanden</label>
                    <div className="space-y-2">
                      {selectedPrompt.files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border hover:bg-gray-100 transition-colors">
                          <button
                            onClick={() => setViewingFile({ name: file.name, content: file.content })}
                            className="flex-1 text-left text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium"
                          >
                            📄 {file.name}
                          </button>
                          <button
                            onClick={async () => {
                              if (selectedPrompt) {
                                if (!window.confirm(`Weet je zeker dat je "${file.name}" wilt verwijderen?`)) {
                                  return;
                                }
                                await promptService.deleteFileFromPrompt(selectedPrompt.id, file.id);
                                const updated = await promptService.getPrompt(selectedPrompt.id);
                                if (updated) setSelectedPrompt(updated);
                                const allPrompts = await promptService.getPrompts();
                                setPrompts(allPrompts);
                                alert('✅ Bestand verwijderd');
                              }
                            }}
                            className="text-red-500 hover:text-red-700 text-sm ml-2 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPrompt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bestand Toevoegen</label>
                    <input
                      type="file"
                      onChange={(e) => selectedPrompt && handleFileUpload(e, selectedPrompt.id)}
                      disabled={uploadingFile}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {uploadingFile && <p className="text-sm text-gray-500 mt-2">Uploaden...</p>}
                  </div>
                )}
                <div className="flex gap-4">
                  <button
                    onClick={handleSavePrompt}
                    className="bg-richting-orange text-white px-6 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => {
                      setShowPromptEditor(false);
                      setSelectedPrompt(null);
                      setPromptName('');
                      setPromptContent('');
                    }}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {prompts.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
                  <p className="mb-2">Nog geen prompts gevonden.</p>
                  <p className="text-xs text-gray-400 mb-4">Controleer de browser console (F12) voor details.</p>
                  <button
                    onClick={async () => {
                      try {
                        const result = await promptService.restoreDefaultPrompts(user.id);
                        alert(`✅ ${result.message}`);
                        const updatedPrompts = await promptService.getPrompts();
                        setPrompts(updatedPrompts);
                      } catch (error: any) {
                        alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                      }
                    }}
                    className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    Herstel Default Prompts
                  </button>
                </div>
              ) : (
                prompts
                  .slice()
                  .sort((a, b) => {
                    // Sorteer primair op nummer aan het begin van de naam (bijv. "1. ..."), anders op naam
                    const getNum = (p: Prompt) => {
                      const match = (p.name || '').trim().match(/^(\d+)/);
                      return match ? parseInt(match[1], 10) : Number.MAX_SAFE_INTEGER;
                    };
                    const na = getNum(a);
                    const nb = getNum(b);
                    if (na !== nb) return na - nb;
                    // Fallback: sorteer op versie desc om nieuwste eerst binnen hetzelfde nummer te tonen
                    return (b.versie || 0) - (a.versie || 0);
                  })
                  .map(prompt => {
                    return (
                      <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-richting-orange transition-colors">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-bold text-slate-900">{prompt.name}</h4>
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold">
                                Versie {prompt.versie || 1}
                              </span>
                              {prompt.isActief && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-bold">
                                  ✓ Actief
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400">
                              Aangemaakt: {new Date(prompt.createdAt).toLocaleDateString('nl-NL')}
                              {prompt.files && prompt.files.length > 0 && (
                                <span className="ml-2">• {prompt.files.length} bestand(en)</span>
                              )}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {prompt.type !== 'other' && !prompt.isActief && (
                              <button
                                onClick={() => handleActivatePrompt(prompt.id, prompt.type)}
                                className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                              >
                                Activeer
                              </button>
                            )}
                            <button
                              onClick={() => handleEditPrompt(prompt)}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                            >
                              Bewerken
                            </button>
                            <button
                              onClick={() => handleDeletePrompt(prompt.id)}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                            >
                              Verwijderen
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                          <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap line-clamp-3">
                            {prompt.promptTekst?.substring(0, 300) || ''}...
                          </p>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          )}

          {/* File Viewer Modal */}
          {viewingFile && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-900">📄 {viewingFile.name}</h3>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="flex-1 overflow-auto border border-gray-200 rounded-lg bg-gray-50">
                  <pre className="p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono overflow-auto max-h-[70vh]">
                    {viewingFile.content}
                  </pre>
                </div>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      const blob = new Blob([viewingFile.content], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = viewingFile.name;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                  >
                    📥 Downloaden
                  </button>
                  <button
                    onClick={() => setViewingFile(null)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                  >
                    Sluiten
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Type Beheer Tab */}
      {activeTab === 'typebeheer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Types</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                placeholder="Type ID (bijv. nieuwe_analyse)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
              />
              <input
                type="text"
                value={newTypeLabel}
                onChange={(e) => setNewTypeLabel(e.target.value)}
                placeholder="Label (bijv. Nieuwe Analyse)"
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
              />
              <button
                onClick={async () => {
                  if (!newTypeName || !newTypeLabel) {
                    alert('Vul type ID en label in');
                    return;
                  }
                  try {
                    await promptService.addPromptType(newTypeName, newTypeLabel, user.id);
                    const typesWithLabels = await promptService.getPromptTypesWithLabels();
                    setPromptTypes(typesWithLabels);
                    setNewTypeName('');
                    setNewTypeLabel('');
                    alert('✅ Type toegevoegd');
                  } catch (error: any) {
                    alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                  }
                }}
                className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + Toevoegen
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {promptTypes.map(type => (
              <div key={type.type} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {editingType?.type === type.type ? (
                  // Edit mode
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Type ID (niet wijzigbaar)</label>
                      <input
                        type="text"
                        value={type.type}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                      <input
                        type="text"
                        value={editingTypeLabel}
                        onChange={(e) => setEditingTypeLabel(e.target.value)}
                        placeholder="Label (bijv. Nieuwe Analyse)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (!editingTypeLabel.trim()) {
                            alert('Label mag niet leeg zijn');
                            return;
                          }
                          try {
                            await promptService.updatePromptType(type.type, editingTypeLabel, user.id);
                            const typesWithLabels = await promptService.getPromptTypesWithLabels();
                            setPromptTypes(typesWithLabels);
                            setEditingType(null);
                            setEditingTypeLabel('');
                            alert('✅ Type bijgewerkt');
                          } catch (error: any) {
                            alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                          }
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => {
                          setEditingType(null);
                          setEditingTypeLabel('');
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-300 transition-colors"
                      >
                        Annuleren
                      </button>
                    </div>
                  </div>
                ) : (
                  // View mode
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-slate-900">{type.label}</h4>
                      <p className="text-xs text-gray-500">ID: {type.type}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {prompts.filter(p => p.type === type.type).length} prompt(s) van dit type
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingType(type);
                          setEditingTypeLabel(type.label);
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`Weet je zeker dat je het type "${type.label}" wilt verwijderen? Dit kan alleen als er geen prompts meer van dit type zijn.`)) {
                            return;
                          }
                          try {
                            await promptService.deletePromptType(type.type);
                            const typesWithLabels = await promptService.getPromptTypesWithLabels();
                            setPromptTypes(typesWithLabels);
                            alert('✅ Type verwijderd');
                          } catch (error: any) {
                            alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                          }
                        }}
                        className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Beheer Tab */}
      {activeTab === 'databeheer' && (
        <div className="space-y-6">
          {/* Backup Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">💾 Volledige Backup</h3>
            <p className="text-sm text-gray-600 mb-4">
              Maak een volledige backup van alle data (gebruikers, documenten, klanten, locaties, contactpersonen).
            </p>
            <button
              onClick={handleBackup}
              className="bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Volledige Backup
            </button>
          </div>

          {/* Data Management Tabs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex gap-2 mb-6 border-b border-gray-200">
              <button
                onClick={() => setDataManagementSubTab('klanten')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'klanten'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                👥 Klanten
              </button>
              <button
                onClick={() => setDataManagementSubTab('locaties')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'locaties'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                📍 Richting Locaties
              </button>
              <button
                onClick={() => setDataManagementSubTab('documents')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'documents'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                📄 Documents
              </button>
              <button
                onClick={() => setDataManagementSubTab('logo')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                  dataManagementSubTab === 'logo'
                    ? 'text-richting-orange border-richting-orange'
                    : 'text-gray-500 border-transparent hover:text-gray-700'
                }`}
              >
                🎨 Logo
              </button>
            </div>

            {/* Klanten Section */}
            {dataManagementSubTab === 'klanten' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Klanten Beheer</h3>
                  <div className="flex gap-2">
                    {/* Cleanup Button - Temporary Fix */}
                    <button
                      onClick={async () => {
                        if (!window.confirm('Dit verwijdert alle klanten zonder naam (spook-klanten) en klanten met ongeldige data. Doorgaan?')) return;
                        
                        try {
                          // Fetch all customers
                          const allCustomers = await customerService.getAllCustomers();
                          // Filter ghosts (no name or empty name)
                          const ghosts = allCustomers.filter(c => !c.name || c.name.trim() === '');
                          
                          if (ghosts.length === 0) {
                            alert('Geen spook-klanten gevonden.');
                            return;
                          }
                          
                          // Delete ghosts
                          let deletedCount = 0;
                          for (const ghost of ghosts) {
                            await customerService.deleteCustomer(ghost.id);
                            deletedCount++;
                          }
                          
                          alert(`✅ ${deletedCount} spook-klanten verwijderd. Herlaad de pagina.`);
                          window.location.reload();
                        } catch (error: any) {
                          console.error('Error cleaning ghosts:', error);
                          alert(`Fout bij opruimen: ${error.message}`);
                        }
                      }}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-lg font-bold hover:bg-red-200 transition-colors text-sm border border-red-200"
                    >
                      🧹 Ruim spook-klanten op
                    </button>
                    <button
                      onClick={handleExportCustomers}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
                    >
                      📥 Exporteer
                    </button>
                    <button
                      onClick={() => setShowImportCustomersModal(true)}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition-colors text-sm"
                    >
                      📤 Importeer (CSV/Google Sheets)
                    </button>
                    <button
                      onClick={handleBulkImportLocations}
                      disabled={bulkImportingLocations}
                      className={`px-4 py-2 rounded-lg font-bold transition-colors text-sm ${
                        bulkImportingLocations
                          ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                          : 'bg-richting-orange text-white hover:bg-orange-600'
                      }`}
                    >
                      {bulkImportingLocations 
                        ? `⏳ Ophalen... ${bulkImportProgress ? `(${bulkImportProgress.current}/${bulkImportProgress.total})` : ''}`
                        : '🔍 Locaties ophalen (bulk)'
                      }
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                  <p className="text-sm text-blue-700">
                    <strong>💡 Tip:</strong> Exporteer je Google Spreadsheet als CSV (Bestand → Downloaden → CSV) en importeer het hier.
                  </p>
                </div>
                <div className="text-sm text-gray-600">
                  <p className="font-bold mb-2">Verwachte CSV kolommen:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><code>name</code> of <code>naam</code> of <code>klant</code> - Klantnaam (verplicht)</li>
                    <li><code>industry</code> of <code>branche</code> - Branche (optioneel)</li>
                    <li><code>website</code> - Website URL (optioneel)</li>
                    <li><code>status</code> - Status: active, prospect, churned, rejected (optioneel, default: active)</li>
                    <li><code>Aantal_medewerkers</code> of <code>employeeCount</code> - Aantal medewerkers (optioneel, numeriek)</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Richting Locaties Section */}
            {dataManagementSubTab === 'locaties' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Richting Locaties</h3>
                  <button
                    onClick={() => {
                      setEditingLocatie(null);
                      setNewLocatieVestiging('');
                      setNewLocatieStad('');
                      setNewLocatieRegio('');
                      setNewLocatieAdres('');
                      setNewLocatieVolledigAdres('');
                      setNewLocatieLatitude('');
                      setNewLocatieLongitude('');
                      setShowAddLocatieModal(true);
                    }}
                    className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
                  >
                    + Toevoegen
                  </button>
                </div>
                <div className="space-y-4">
                  {richtingLocaties.length === 0 ? (
                    <div className="text-center py-10 text-gray-500">
                      <p>Nog geen locaties gevonden.</p>
                    </div>
                  ) : (
                    richtingLocaties.map(loc => (
                      <div key={loc.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-richting-orange transition-colors">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{loc.vestiging}</p>
                          <p className="text-sm text-gray-500">{loc.stad}</p>
                          {loc.regio && (
                            <p className="text-xs text-gray-400 mt-1">Regio: {loc.regio}</p>
                          )}
                          {loc.volledigAdres && (
                            <p className="text-xs text-gray-400 mt-1">{loc.volledigAdres}</p>
                          )}
                          {loc.latitude && loc.longitude && (
                            <p className="text-xs text-gray-400 mt-1">
                              📍 {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => {
                              setEditingLocatie(loc);
                              setNewLocatieVestiging(loc.vestiging);
                              setNewLocatieStad(loc.stad);
                              setNewLocatieRegio(loc.regio || '');
                              setNewLocatieAdres(loc.adres || '');
                              setNewLocatieVolledigAdres(loc.volledigAdres || '');
                              setNewLocatieLatitude(loc.latitude?.toString() || '');
                              setNewLocatieLongitude(loc.longitude?.toString() || '');
                              setShowAddLocatieModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
                          >
                            Bewerken
                          </button>
                          <button
                            onClick={async () => {
                              if (!window.confirm(`Weet je zeker dat je locatie "${loc.vestiging}" wilt verwijderen?`)) {
                                return;
                              }
                              try {
                                await richtingLocatiesService.deleteLocatie(loc.id);
                                const updatedLocaties = await richtingLocatiesService.getAllLocaties();
                                setRichtingLocaties(updatedLocaties);
                                alert('✅ Locatie verwijderd');
                              } catch (error: any) {
                                alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                              }
                            }}
                            className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Documents Section */}
            {dataManagementSubTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Documents Beheer</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportDocuments}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors text-sm"
                    >
                      📥 Exporteer
                    </button>
                  </div>
                </div>
                <div className="text-center py-10 text-gray-500">
                  <p>Document beheer functionaliteit komt binnenkort.</p>
                </div>
              </div>
            )}

            {/* Logo Section */}
            {dataManagementSubTab === 'logo' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-slate-900">Logo Beheer</h3>
                </div>
                
                <div className="bg-white rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Upload Nieuw Logo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        Ondersteunde formaten: PNG, JPG, SVG (max. 5MB)
                      </p>
                    </div>
                    
                    {uploadingLogo && (
                      <div className="text-richting-orange font-medium">
                        ⏳ Logo wordt geüpload...
                      </div>
                    )}
                    
                    {logoUrl && (
                      <div className="mt-6">
                        <p className="text-sm font-medium text-gray-700 mb-3">Huidig Logo:</p>
                        <div className="flex justify-center">
                          <img 
                            src={logoUrl} 
                            alt="Richting Logo" 
                            className="max-h-32 max-w-full object-contain border border-gray-200 rounded-lg p-4 bg-white"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-3">
                          💡 Ververs de pagina om het nieuwe logo in de sidebar te zien.
                        </p>
                      </div>
                    )}
                    
                    {!logoUrl && !uploadingLogo && (
                      <div className="text-gray-500 text-sm">
                        <p>Nog geen logo geüpload. Het standaard logo wordt gebruikt.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Import Customers Modal */}
      {showImportCustomersModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Klanten Importeren (CSV/Google Sheets)</h3>
              <button
                onClick={() => {
                  setShowImportCustomersModal(false);
                  setImportCustomersFile(null);
                  setImportCustomersPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">CSV Bestand Selecteren</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCustomersFileSelect}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Exporteer je Google Spreadsheet als CSV (Bestand → Downloaden → CSV)
                </p>
              </div>
              {importCustomersPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preview ({importCustomersPreview.length} klanten)</label>
                  <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Naam</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Branche</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Website</th>
                          <th className="px-3 py-2 text-left font-bold text-gray-700">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importCustomersPreview.slice(0, 10).map((customer, idx) => (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-3 py-2">{customer.name}</td>
                            <td className="px-3 py-2">{customer.industry}</td>
                            <td className="px-3 py-2">{customer.website || '-'}</td>
                            <td className="px-3 py-2">{getStatusLabel(customer.status || 'prospect')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importCustomersPreview.length > 10 && (
                      <p className="text-xs text-gray-500 p-2 text-center">
                        ... en {importCustomersPreview.length - 10} meer
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleImportCustomers}
                  disabled={!importCustomersPreview || importingCustomers}
                  className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {importingCustomers ? 'Importeren...' : `Importeer ${importCustomersPreview?.length || 0} klanten`}
                </button>
                <button
                  onClick={() => {
                    setShowImportCustomersModal(false);
                    setImportCustomersFile(null);
                    setImportCustomersPreview(null);
                  }}
                  disabled={importingCustomers}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Locatie Modal */}
      {(showAddLocatieModal || editingLocatie) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingLocatie ? 'Locatie Bewerken' : 'Nieuwe Locatie Toevoegen'}
              </h3>
              <button
                onClick={() => {
                  setShowAddLocatieModal(false);
                  setEditingLocatie(null);
                  setNewLocatieVestiging('');
                  setNewLocatieStad('');
                  setNewLocatieRegio('');
                  setNewLocatieAdres('');
                  setNewLocatieVolledigAdres('');
                  setNewLocatieLatitude('');
                  setNewLocatieLongitude('');
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Vestiging *</label>
                <input
                  type="text"
                  value={newLocatieVestiging}
                  onChange={(e) => setNewLocatieVestiging(e.target.value)}
                  placeholder="Bijv. Hoofdkantoor Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Stad *</label>
                <input
                  type="text"
                  value={newLocatieStad}
                  onChange={(e) => setNewLocatieStad(e.target.value)}
                  placeholder="Bijv. Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Regio</label>
                <input
                  type="text"
                  value={newLocatieRegio}
                  onChange={(e) => setNewLocatieRegio(e.target.value)}
                  placeholder="Bijv. Noord-Holland"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adres</label>
                <input
                  type="text"
                  value={newLocatieAdres}
                  onChange={(e) => setNewLocatieAdres(e.target.value)}
                  placeholder="Bijv. Damrak 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Volledig Adres</label>
                <input
                  type="text"
                  value={newLocatieVolledigAdres}
                  onChange={(e) => setNewLocatieVolledigAdres(e.target.value)}
                  placeholder="Bijv. Damrak 1, 1012 LG Amsterdam"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocatieLatitude}
                    onChange={(e) => setNewLocatieLatitude(e.target.value)}
                    placeholder="52.3676"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={newLocatieLongitude}
                    onChange={(e) => setNewLocatieLongitude(e.target.value)}
                    placeholder="4.9041"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    if (!newLocatieVestiging || !newLocatieStad) {
                      alert('Vul minimaal vestiging en stad in');
                      return;
                    }

                    setSavingLocatie(true);
                    try {
                      const locatieData: Partial<RichtingLocatie> = {
                        vestiging: newLocatieVestiging,
                        stad: newLocatieStad,
                        regio: newLocatieRegio || undefined,
                        adres: newLocatieAdres || undefined,
                        volledigAdres: newLocatieVolledigAdres || undefined,
                        latitude: newLocatieLatitude ? parseFloat(newLocatieLatitude) : undefined,
                        longitude: newLocatieLongitude ? parseFloat(newLocatieLongitude) : undefined
                      };

                      if (editingLocatie) {
                        await richtingLocatiesService.updateLocatie(editingLocatie.id, locatieData);
                        alert('✅ Locatie bijgewerkt!');
                      } else {
                        await richtingLocatiesService.addLocatie(locatieData as Omit<RichtingLocatie, 'id'>);
                        alert('✅ Locatie toegevoegd!');
                      }

                      const updatedLocaties = await richtingLocatiesService.getAllLocaties();
                      setRichtingLocaties(updatedLocaties);
                      setShowAddLocatieModal(false);
                      setEditingLocatie(null);
                      setNewLocatieVestiging('');
                      setNewLocatieStad('');
                      setNewLocatieRegio('');
                      setNewLocatieAdres('');
                      setNewLocatieVolledigAdres('');
                      setNewLocatieLatitude('');
                      setNewLocatieLongitude('');
                    } catch (error: any) {
                      console.error("Error saving locatie:", error);
                      alert(`❌ Fout: ${error.message || 'Onbekende fout'}`);
                    } finally {
                      setSavingLocatie(false);
                    }
                  }}
                  disabled={savingLocatie}
                  className="flex-1 bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {savingLocatie ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button
                  onClick={() => {
                    setShowAddLocatieModal(false);
                    setEditingLocatie(null);
                    setNewLocatieVestiging('');
                    setNewLocatieStad('');
                    setNewLocatieRegio('');
                    setNewLocatieAdres('');
                    setNewLocatieVolledigAdres('');
                    setNewLocatieLatitude('');
                    setNewLocatieLongitude('');
                  }}
                  disabled={savingLocatie}
                  className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300 disabled:opacity-50 transition-colors"
                >
                  Annuleren
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

