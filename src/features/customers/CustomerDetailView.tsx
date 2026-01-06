  // Functie om documenten te importeren uit Google Drive
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
        headers: {
          'Content-Type': 'application/json',
          // Voeg eventueel auth headers toe als je functions beveiligd zijn
          // 'Authorization': `Bearer ${token}` 
        },
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
      
      if (result.success) {
          alert(`✅ Import geslaagd!\n\n${result.message}`);
          // Refresh documenten of hele view indien nodig
          onUpdate(customer); // Simpele trigger voor refresh als parent dat ondersteunt, anders reload
          // Idealiter roep je hier een functie aan om de documentenlijst opnieuw op te halen
      } else {
          alert(`⚠️ Import voltooid met waarschuwingen: ${result.message}`);
      }

    } catch (error: any) {
      console.error("Drive Import Error:", error);
      alert(`❌ Fout bij importeren: ${error.message}`);
    } finally {
      setIsImportingDrive(false);
    }
  };
