import jsPDF from 'jspdf';
import { ORGANISATIE_ANALYSE_HOOFDSTUKKEN } from './organisatieAnalyseConstants';

/**
 * Genereer PDF van het publiek organisatie profiel
 */
export async function generateOrganisatieProfielPDF(
  organisatieNaam: string,
  analyseDatum: string,
  hoofdstukken: { [key: string]: string },
  volledigRapport?: string
): Promise<Blob> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const maxWidth = pageWidth - 2 * margin;
  let yPos = margin;

  // Helper functie om tekst toe te voegen met automatische pagina breaks
  const addText = (text: string, fontSize: number, isBold: boolean = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setTextColor(color[0], color[1], color[2]);
    if (isBold) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }

    const lines = doc.splitTextToSize(text, maxWidth);
    
    for (const line of lines) {
      if (yPos + fontSize / 2 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin, yPos);
      yPos += fontSize / 2 + 2;
    }
  };

  // Header
  doc.setFillColor(243, 111, 33); // Richting orange
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Publiek Organisatie Profiel', margin, 25);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(organisatieNaam, margin, 35);
  yPos = 50;

  // Analyse datum
  addText(`Analyse datum: ${new Date(analyseDatum).toLocaleDateString('nl-NL')}`, 10, false, [100, 100, 100]);
  yPos += 5;

  // Als volledig rapport beschikbaar is, gebruik dat
  if (volledigRapport) {
    // Parse markdown en voeg toe
    const sections = volledigRapport.split(/\n(?=##\s)/);
    
    for (const section of sections) {
      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      // Check voor hoofdstuk titel (##)
      if (section.startsWith('## ')) {
        const lines = section.split('\n');
        const title = lines[0].replace('## ', '').trim();
        yPos += 10;
        addText(title, 16, true, [243, 111, 33]);
        yPos += 5;
        
        // Voeg rest van sectie toe
        const content = lines.slice(1).join('\n').trim();
        if (content) {
          // Verwijder markdown formatting voor PDF
          const cleanContent = content
            .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
            .replace(/\*(.*?)\*/g, '$1') // Italic
            .replace(/`(.*?)`/g, '$1') // Code
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links
          
          addText(cleanContent, 10, false, [0, 0, 0]);
        }
      } else {
        // Normale tekst
        const cleanContent = section
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/\*(.*?)\*/g, '$1')
          .replace(/`(.*?)`/g, '$1')
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        addText(cleanContent, 10, false, [0, 0, 0]);
      }
    }
  } else {
    // Gebruik hoofdstukken
    const sortedKeys = Object.keys(hoofdstukken).sort((a, b) => parseInt(a) - parseInt(b));
    
    for (const key of sortedKeys) {
      const titel = ORGANISATIE_ANALYSE_HOOFDSTUKKEN[key] || `Hoofdstuk ${key}`;
      const content = hoofdstukken[key];

      if (yPos + 20 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      yPos += 10;
      addText(titel, 16, true, [243, 111, 33]);
      yPos += 5;

      // Clean markdown
      const cleanContent = content
        .replace(/\*\*(.*?)\*\*/g, '$1')
        .replace(/\*(.*?)\*/g, '$1')
        .replace(/`(.*?)`/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

      addText(cleanContent, 10, false, [0, 0, 0]);
      yPos += 10;
    }
  }

  // Footer op elke pagina
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Pagina ${i} van ${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  }

  return doc.output('blob');
}

