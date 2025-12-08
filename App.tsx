import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { User, DocumentSource, KNOWLEDGE_STRUCTURE, DocType, GeminiAnalysisResult, ChatMessage, Customer, Location, UserRole, ContactPerson, OrganisatieProfiel, Risico, Proces, Functie } from './types';
import { authService, dbService, customerService, promptService, richtingLocatiesService, Prompt, RichtingLocatie } from './services/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './services/firebase';
import { Layout, RichtingLogo } from './components/Layout';
import { analyzeContent, askQuestion, analyzeOrganisatieBranche, analyzeCultuur } from './services/geminiService';

// --- ICONS ---
const EyeIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>;
const HeartIcon = ({ filled }: { filled: boolean }) => <svg className={`w-4 h-4 ${filled ? 'fill-richting-orange text-richting-orange' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
const ExternalLinkIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const ArchiveIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;
const SendIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>;
const MapIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const TrashIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;
const UserIcon = () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;

// New Document Type Icons
const EmailIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>;
const GoogleDocIcon = () => <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM6 20V4h5v7h7v9H6z"/></svg>;
const PdfIcon = () => <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-8.5 7.5c0 .83-.67 1.5-1.5 1.5H9v2H7.5V7H10c.83 0 1.5.67 1.5 1.5v1zm5 2c0 .83-.67 1.5-1.5 1.5h-2.5V7H15c.83 0 1.5.67 1.5 1.5v3zm4-3H19v1h1.5v1.5H19v2h-1.5V7h2V8.5zm-5 0h1v3h-1v-3zM9 9.5h1v-1H9v1z" transform="translate(0, 1)"/></svg>;

// --- HELPER ---
const getCategoryLabel = (mainId: string, subId?: string) => {
  const main = KNOWLEDGE_STRUCTURE.find(c => c.id === mainId);
  if (!subId) return main?.label || mainId;
  const sub = main?.subCategories.find(s => s.id === subId);
  return sub?.label || subId;
};

// Fine & Kinney conversie functies
// Converteert oude waarden (1-5) naar Fine & Kinney waarden
const convertKansToFineKinney = (oldValue: number | undefined | null): number => {
  if (!oldValue || isNaN(oldValue)) return 0;
  
  // Fine & Kinney Kans (W) waarden: 0.5, 1, 3, 6, 10
  const validFineKinneyKans = [0.5, 1, 3, 6, 10];
  
  // Als waarde al een geldige Fine & Kinney waarde is, gebruik die
  if (validFineKinneyKans.includes(oldValue)) return oldValue;
  
  // Anders, converteer van oude schaal (1-5) naar Fine & Kinney
  const mapping: Record<number, number> = {
    1: 0.5,
    2: 1,
    3: 3,
    4: 6,
    5: 10
  };
  
  return mapping[oldValue] || oldValue;
};

const convertEffectToFineKinney = (oldValue: number | undefined | null): number => {
  if (!oldValue || isNaN(oldValue)) return 0;
  
  // Fine & Kinney Effect (E) waarden: 1, 3, 7, 15, 40
  const validFineKinneyEffect = [1, 3, 7, 15, 40];
  
  // Als waarde al een geldige Fine & Kinney waarde is, gebruik die
  if (validFineKinneyEffect.includes(oldValue)) return oldValue;
  
  // Anders, converteer van oude schaal (1-5) naar Fine & Kinney
  const mapping: Record<number, number> = {
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 40
  };
  
  return mapping[oldValue] || oldValue;
};

// Centrale prioriteit styling functies
const getPrioriteitLabel = (niveau: number): string => {
  const labels = ['Zeer hoog', 'Hoog', 'Middel', 'Laag', 'Zeer laag'];
  return labels[niveau - 1] || 'Onbekend';
};

const getPrioriteitColors = (niveau: number): string => {
  const colors = [
    'bg-red-100 text-red-700 border-red-300',      // 1. Zeer hoog
    'bg-orange-100 text-orange-700 border-orange-300', // 2. Hoog
    'bg-yellow-100 text-yellow-700 border-yellow-300', // 3. Middel
    'bg-blue-100 text-blue-700 border-blue-300',   // 4. Laag
    'bg-green-100 text-green-700 border-green-300' // 5. Zeer laag
  ];
  return colors[niveau - 1] || colors[4]; // Default naar zeer laag
};

const getPrioriteitBadge = (niveau: number, showNumber: boolean = true): React.ReactNode => {
  const label = getPrioriteitLabel(niveau);
  const colors = getPrioriteitColors(niveau);
  return (
    <span className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 ${colors}`}>
      {showNumber ? `${niveau}. ` : ''}{label}
    </span>
  );
};

// Helper functie om prioriteit tekst te herkennen en converteren naar niveau
const parsePrioriteitFromText = (text: string): number | null => {
  if (!text) return null;
  
  const lowerText = text.toLowerCase().trim();
  
  // Check voor nummer (1-5) - kan voorkomen als "1", "1.", "Prioriteit 1", etc.
  const numMatch = lowerText.match(/\b([1-5])\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1]);
    if (num >= 1 && num <= 5) return num;
  }
  
  // Check voor tekst labels (case-insensitive, met of zonder spaties)
  if (lowerText.includes('zeer hoog') || lowerText.includes('zeerhoog') || lowerText === 'zeer hoog' || lowerText === 'zeerhoog') return 1;
  if ((lowerText.includes('hoog') || lowerText === 'hoog') && !lowerText.includes('zeer')) return 2;
  if (lowerText.includes('middel') || lowerText.includes('gemiddeld') || lowerText === 'middel' || lowerText === 'gemiddeld') return 3;
  if ((lowerText.includes('laag') || lowerText === 'laag') && !lowerText.includes('zeer')) return 4;
  if (lowerText.includes('zeer laag') || lowerText.includes('zeerlaag') || lowerText === 'zeer laag' || lowerText === 'zeerlaag') return 5;
  
  return null;
};

// Helper functie om prioriteiten in tekst te vervangen door badges
const replacePrioriteitenInText = (text: string): React.ReactNode[] => {
  // Patronen om prioriteiten te vinden: "Prioriteit: Hoog", "Prioriteit 2", "Prioriteit: Zeer hoog", etc.
  const prioriteitPatterns = [
    /(?:Prioriteit|prioriteit|PRIORITEIT)[\s:]*([1-5]|zeer\s*hoog|hoog|middel|gemiddeld|laag|zeer\s*laag)/gi,
    /([1-5])\.?\s*(?:Prioriteit|prioriteit|PRIORITEIT)/gi,
    /\b([1-5])\.\s*(?:Zeer\s*hoog|Hoog|Middel|Gemiddeld|Laag|Zeer\s*laag)\b/gi,
    /\b(Zeer\s*hoog|Hoog|Middel|Gemiddeld|Laag|Zeer\s*laag)\s*\(([1-5])\)/gi,
  ];
  
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let keyCounter = 0;
  
  // Zoek alle matches
  const matches: Array<{match: string, index: number, prioriteit: number}> = [];
  
  prioriteitPatterns.forEach(pattern => {
    // Reset regex lastIndex voor elke pattern
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      // Try to parse prioriteit from different capture groups
      const prioriteit = parsePrioriteitFromText(match[1] || match[2] || match[0]);
      if (prioriteit) {
        matches.push({
          match: match[0],
          index: match.index,
          prioriteit
        });
      }
    }
  });
  
  // Sorteer matches op index en verwijder duplicaten
  matches.sort((a, b) => a.index - b.index);
  const uniqueMatches = matches.filter((match, idx, arr) => {
    // Remove overlapping matches (keep first one)
    return idx === 0 || match.index >= arr[idx - 1].index + arr[idx - 1].match.length;
  });
  
  // Bouw de parts array
  uniqueMatches.forEach(({match, index, prioriteit}) => {
    // Voeg tekst voor de match toe
    if (index > lastIndex) {
      const beforeText = text.substring(lastIndex, index);
      if (beforeText) {
        parts.push(
          <span key={`text-${keyCounter++}`} dangerouslySetInnerHTML={{ 
            __html: beforeText
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
              .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
          }} />
        );
      }
    }
    
    // Voeg de badge toe
    parts.push(
      <span key={`badge-${keyCounter++}`} className="inline-block ml-1 mr-1">
        {getPrioriteitBadge(prioriteit)}
      </span>
    );
    
    lastIndex = index + match.length;
  });
  
  // Voeg resterende tekst toe
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push(
        <span key={`text-${keyCounter++}`} dangerouslySetInnerHTML={{ 
          __html: remainingText
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
        }} />
      );
    }
  }
  
  // Als er geen matches zijn, retourneer de originele tekst
  if (parts.length === 0) {
    return [<span key="text-0" dangerouslySetInnerHTML={{ 
      __html: text
        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
        .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
    }} />];
  }
  
  return parts;
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'ACTIEF';
    case 'churned': return 'Gearchiveerd';
    case 'prospect': return 'PROSPECT';
    case 'rejected': return 'Afgewezen';
    default: return status;
  }
};

// Markdown Renderer Component voor Volledig Rapport
const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;

  // Split content into lines for processing
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentTable: string[] = [];
  let inTable = false;
  let listItems: string[] = [];
  let inList = false;

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-outside space-y-2 mb-5 ml-6 pl-2">
          {listItems.map((item, idx) => {
            const trimmedItem = item.trim();
            const prioriteit = parsePrioriteitFromText(trimmedItem);
            
            if (prioriteit && /(?:Prioriteit|prioriteit|PRIORITEIT)/i.test(trimmedItem)) {
              // Replace prioriteit text with badge
              const prioriteitParts = replacePrioriteitenInText(trimmedItem);
              return (
                <li key={idx} className="text-gray-700 leading-relaxed text-base">
                  {prioriteitParts}
                </li>
              );
            }
            
            const processedItem = trimmedItem
              .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
              .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
              .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
            
            return (
              <li key={idx} className="text-gray-700 leading-relaxed text-base" dangerouslySetInnerHTML={{ __html: processedItem }} />
            );
          })}
        </ul>
      );
      listItems = [];
    }
    inList = false;
  };

  const flushTable = () => {
    if (currentTable.length > 0) {
      const tableRows = currentTable.filter(row => row.trim() && !row.match(/^[\|\s\-:]+$/));
      if (tableRows.length > 0) {
        // Parse headers (first row)
        const headerRow = tableRows[0];
        const headers = headerRow.split('|')
          .map(h => h.trim())
          .filter(h => h && !h.match(/^[\-:]+$/));
        
        // Parse data rows (skip separator row if present)
        const dataRows = tableRows.slice(1)
          .filter(row => !row.match(/^[\|\s\-:]+$/))
          .map(row => 
            row.split('|')
              .map(cell => cell.trim())
              .filter((cell, idx, arr) => {
                // Filter out empty cells at start/end if they're just from markdown formatting
                if (idx === 0 && cell === '') return false;
                if (idx === arr.length - 1 && cell === '') return false;
                return true;
              })
          );

        if (headers.length > 0 && dataRows.length > 0) {
          elements.push(
            <div key={`table-${elements.length}`} className="overflow-x-auto mb-6 shadow-md rounded-lg border border-gray-300 my-4">
              <table className="min-w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-gradient-to-r from-richting-orange to-orange-600 text-white">
                    {headers.map((header, idx) => (
                      <th key={idx} className="border border-orange-400 px-4 py-3 text-left text-sm font-bold whitespace-nowrap">
                        {header.replace(/\*\*/g, '').replace(/\*/g, '').trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={`transition-colors ${rowIdx % 2 === 0 ? 'bg-white hover:bg-orange-50' : 'bg-gray-50 hover:bg-orange-50'}`}>
                      {row.slice(0, headers.length).map((cell, cellIdx) => {
                        // Check if cell contains prioriteit
                        const prioriteit = parsePrioriteitFromText(cell);
                        
                        if (prioriteit) {
                          // Replace prioriteit text with badge
                          const cellWithoutPrioriteit = cell.replace(/(?:Prioriteit|prioriteit|PRIORITEIT)[\s:]*([1-5]|zeer\s*hoog|hoog|middel|gemiddeld|laag|zeer\s*laag)/gi, '').trim();
                          const hasOtherContent = cellWithoutPrioriteit.length > 0;
                          
                          return (
                            <td key={cellIdx} className="border border-gray-300 px-4 py-3 text-sm text-gray-700 align-top">
                              {hasOtherContent && (
                                <span className="mr-2" dangerouslySetInnerHTML={{ 
                                  __html: cellWithoutPrioriteit
                                    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
                                    .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
                                    .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
                                }} />
                              )}
                              {getPrioriteitBadge(prioriteit)}
                            </td>
                          );
                        }
                        
                        // Process cell content normally (remove markdown formatting)
                        const processedCell = cell
                          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-slate-900">$1</strong>')
                          .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
                          .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>');
                        
                        return (
                          <td key={cellIdx} className="border border-gray-300 px-4 py-3 text-sm text-gray-700 align-top">
                            <span dangerouslySetInnerHTML={{ __html: processedCell || '&nbsp;' }} />
                          </td>
                        );
                      })}
                      {/* Fill missing cells if row is shorter than headers */}
                      {Array.from({ length: Math.max(0, headers.length - row.length) }).map((_, idx) => (
                        <td key={`empty-${idx}`} className="border border-gray-300 px-4 py-3 text-sm text-gray-400">
                          &nbsp;
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
      }
      currentTable = [];
    }
    inTable = false;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Check for table
    if (trimmed.includes('|') && trimmed.split('|').length > 2) {
      if (!inTable) {
        flushList();
        inTable = true;
      }
      // Skip separator rows (|---|---|)
      if (!trimmed.match(/^[\|\s\-:]+$/)) {
        currentTable.push(trimmed);
      }
      return;
    } else if (inTable) {
      flushTable();
    }

    // Check for headers
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={`h1-${index}`} className="text-3xl font-bold text-slate-900 mt-10 mb-5 pb-3 border-b-2 border-richting-orange first:mt-0">
          {trimmed.substring(2).trim()}
        </h1>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={`h2-${index}`} className="text-2xl font-bold text-slate-800 mt-8 mb-4 pt-2">
          {trimmed.substring(3).trim()}
        </h2>
      );
    } else if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={`h3-${index}`} className="text-xl font-bold text-slate-700 mt-6 mb-3 pt-1">
          {trimmed.substring(4).trim()}
        </h3>
      );
    } else if (trimmed.startsWith('#### ')) {
      flushList();
      elements.push(
        <h4 key={`h4-${index}`} className="text-lg font-bold text-slate-700 mt-4 mb-2">
          {trimmed.substring(5).trim()}
        </h4>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (!inList) {
        flushTable();
        inList = true;
      }
      listItems.push(trimmed.substring(2));
    } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      flushList();
      elements.push(
        <p key={`bold-${index}`} className="font-bold text-slate-900 mb-2">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      );
    } else if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(
        <hr key={`hr-${index}`} className="my-6 border-t-2 border-gray-300" />
      );
    } else if (trimmed) {
      flushList();
      // Regular paragraph - check if it contains prioriteiten
      const prioriteit = parsePrioriteitFromText(trimmed);
      
      if (prioriteit && /(?:Prioriteit|prioriteit|PRIORITEIT)/i.test(trimmed)) {
        // Replace prioriteit text with badge
        const textWithoutPrioriteit = trimmed.replace(/(?:Prioriteit|prioriteit|PRIORITEIT)[\s:]*([1-5]|zeer\s*hoog|hoog|middel|gemiddeld|laag|zeer\s*laag)/gi, '').trim();
        const prioriteitParts = replacePrioriteitenInText(trimmed);
        
        elements.push(
          <p key={`p-${index}`} className="text-gray-700 leading-relaxed mb-4 text-base">
            {prioriteitParts}
          </p>
        );
      } else {
        // Regular paragraph - check if it contains links
        let processedText = trimmed
          .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
          .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
          .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800">$1</code>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-richting-orange hover:text-orange-600 underline font-medium">$1</a>');
        
        elements.push(
          <p key={`p-${index}`} className="text-gray-700 leading-relaxed mb-4 text-base" dangerouslySetInnerHTML={{ __html: processedText }} />
        );
      }
    } else if (trimmed === '') {
      // Empty line - flush lists/tables if needed
      flushList();
      if (!inTable) {
        elements.push(<br key={`br-${index}`} />);
      }
    }
  });

  // Flush any remaining lists or tables
  flushList();
  flushTable();

  return (
    <div className="prose prose-slate max-w-none">
      <div className="text-base leading-relaxed space-y-4">
        {elements.length > 0 ? (
          <div className="space-y-6">
            {elements}
          </div>
        ) : (
          <div className="text-gray-500 italic">Geen inhoud beschikbaar</div>
        )}
      </div>
    </div>
  );
};

const ensureUrl = (url: string) => {
  if (!url) return '';
  url = url.trim();
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
}

// Helper functie om afstand tussen twee coördinaten te berekenen (Haversine formule)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Straal van de aarde in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Afstand in kilometers
}

// Helper functie om coördinaten te krijgen van een adres (via geocoding API)
const geocodeAddress = async (address: string, city: string): Promise<{ lat: number; lng: number } | null> => {
  try {
    // Gebruik een gratis geocoding service (bijv. Nominatim van OpenStreetMap)
    const query = encodeURIComponent(`${address}, ${city}, Nederland`);
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1&countrycodes=nl`, {
      headers: {
        'User-Agent': 'RichtingKennisbank/1.0' // Vereist door Nominatim
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    }
  } catch (e) {
    console.warn(`Geocoding failed for ${address}, ${city}:`, e);
  }
  return null;
}

// Helper functie om de dichtstbijzijnde Richting locatie te vinden
const findNearestRichtingLocation = async (
  loc: Location, 
  allRichtingLocaties: RichtingLocatie[]
): Promise<RichtingLocatie | null> => {
  if (!loc.city) return null;

  // Stap 1: Probeer geocoding voor de klant locatie
  let customerCoords: { lat: number; lng: number } | null = null;
  if (loc.address && loc.city) {
    customerCoords = await geocodeAddress(loc.address, loc.city);
  }

  // Stap 2: Als we coördinaten hebben, gebruik afstand berekening
  if (customerCoords) {
    let nearest: RichtingLocatie | null = null;
    let minDistance = Infinity;

    for (const rl of allRichtingLocaties) {
      if (rl.latitude && rl.longitude) {
        const distance = calculateDistance(
          customerCoords.lat,
          customerCoords.lng,
          rl.latitude,
          rl.longitude
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = rl;
        }
      }
    }

    if (nearest) {
      console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${nearest.vestiging} op basis van afstand (${minDistance.toFixed(1)} km)`);
      return nearest;
    }
  }

  // Stap 3: Fallback naar verbeterde tekst matching
  const cityLower = loc.city.toLowerCase().trim();
  
  // Verbeterde matching logica met meer speciale gevallen
  const cityMappings: Record<string, string[]> = {
    'amsterdam': ['amsterdam', 'amstelveen', 'haarlem', 'zaandam'],
    'rotterdam': ['rotterdam', 'schiedam', 'dordrecht', 'gouda', 'capelle aan den ijssel', 'capelle a/d ijssel'],
    'den haag': ['den haag', 's-gravenhage', 'gravenhage', 'zoetermeer', 'delft', 'leiden', 'haarlem'],
    'utrecht': ['utrecht', 'amersfoort', 'hilversum', 'zeist', 'nieuwegein'],
    'eindhoven': ['eindhoven', 'helmond', 'tilburg', 'den bosch', 's-hertogenbosch', 'hertogenbosch'],
    'groningen': ['groningen', 'assen', 'leeuwarden'],
    'enschede': ['enschede', 'almelo', 'hengelo', 'zwolle'],
    'maastricht': ['maastricht', 'heerlen', 'sittard', 'roermond', 'venlo'],
    'arnhem': ['arnhem', 'nijmegen', 'apeldoorn', 'ede'],
    'breda': ['breda', 'tilburg', 'roosendaal', 'bergen op zoom'],
    'leeuwarden': ['leeuwarden', 'groningen', 'drachten'],
    'zwolle': ['zwolle', 'kampen', 'deventer', 'apeldoorn'],
    'haarlem': ['haarlem', 'amsterdam', 'alkmaar', 'zaandam'],
    'almere': ['almere', 'amsterdam', 'hilversum'],
    'apeldoorn': ['apeldoorn', 'arnhem', 'zwolle', 'deventer'],
    'tilburg': ['tilburg', 'eindhoven', 'breda', 'den bosch'],
    'nijmegen': ['nijmegen', 'arnhem', 'eindhoven'],
    'enschede': ['enschede', 'almelo', 'hengelo'],
    'haarlem': ['haarlem', 'amsterdam', 'alkmaar'],
    'gouda': ['gouda', 'rotterdam', 'utrecht', 'den haag'],
    'zoetermeer': ['zoetermeer', 'den haag', 'rotterdam', 'gouda'],
    'delft': ['delft', 'den haag', 'rotterdam'],
    'leiden': ['leiden', 'den haag', 'haarlem', 'amsterdam'],
    'alkmaar': ['alkmaar', 'amsterdam', 'haarlem'],
    'venlo': ['venlo', 'roermond', 'eindhoven'],
    'heerlen': ['heerlen', 'maastricht', 'sittard'],
    'sittard': ['sittard', 'maastricht', 'heerlen'],
    'roermond': ['roermond', 'venlo', 'maastricht'],
    'den bosch': ['den bosch', 's-hertogenbosch', 'hertogenbosch', 'eindhoven', 'tilburg'],
    's-hertogenbosch': ['s-hertogenbosch', 'hertogenbosch', 'den bosch', 'eindhoven'],
    'hertogenbosch': ['hertogenbosch', 's-hertogenbosch', 'den bosch', 'eindhoven'],
    'capelle aan den ijssel': ['capelle aan den ijssel', 'capelle a/d ijssel', 'rotterdam', 'gouda'],
    'capelle a/d ijssel': ['capelle a/d ijssel', 'capelle aan den ijssel', 'rotterdam', 'gouda'],
    'barendrecht': ['barendrecht', 'rotterdam', 'dordrecht'],
    'dordrecht': ['dordrecht', 'rotterdam', 'gouda'],
    'schiedam': ['schiedam', 'rotterdam', 'den haag'],
    'amstelveen': ['amstelveen', 'amsterdam', 'haarlem'],
    'zaandam': ['zaandam', 'amsterdam', 'haarlem'],
    'hilversum': ['hilversum', 'amsterdam', 'utrecht'],
    'amersfoort': ['amersfoort', 'utrecht', 'hilversum'],
    'nieuwegein': ['nieuwegein', 'utrecht', 'gouda'],
    'zeist': ['zeist', 'utrecht', 'hilversum'],
    'deventer': ['deventer', 'zwolle', 'apeldoorn'],
    'kampen': ['kampen', 'zwolle', 'apeldoorn'],
    'helmond': ['helmond', 'eindhoven', 'tilburg'],
    'roosendaal': ['roosendaal', 'breda', 'rotterdam'],
    'bergen op zoom': ['bergen op zoom', 'breda', 'rotterdam'],
    'drachten': ['drachten', 'leeuwarden', 'groningen'],
    'assen': ['assen', 'groningen', 'zwolle'],
    'almelo': ['almelo', 'enschede', 'zwolle'],
    'hengelo': ['hengelo', 'enschede', 'almelo']
  };

  // Zoek eerst op exacte match
  for (const rl of allRichtingLocaties) {
    const vestigingLower = rl.vestiging.toLowerCase().trim();
    const adresLower = rl.volledigAdres.toLowerCase();
    
    // Exacte match op stad naam
    if (cityLower === vestigingLower) {
      console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${rl.vestiging} (exacte match)`);
      return rl;
    }
    
    // Stad naam bevat vestiging naam of vice versa
    if (cityLower.includes(vestigingLower) || vestigingLower.includes(cityLower)) {
      console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${rl.vestiging} (naam match)`);
      return rl;
    }
    
    // Stad naam in adres
    if (adresLower.includes(cityLower)) {
      console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${rl.vestiging} (adres match)`);
      return rl;
    }
    
    // Vestiging naam in adres van locatie
    if (loc.address && loc.address.toLowerCase().includes(vestigingLower)) {
      console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${rl.vestiging} (adres bevat vestiging)`);
      return rl;
    }
  }

  // Zoek op city mappings
  for (const [cityKey, relatedCities] of Object.entries(cityMappings)) {
    if (cityLower.includes(cityKey) || cityKey.includes(cityLower)) {
      for (const rl of allRichtingLocaties) {
        const vestigingLower = rl.vestiging.toLowerCase().trim();
        const adresLower = rl.volledigAdres.toLowerCase();
        
        for (const relatedCity of relatedCities) {
          if (vestigingLower.includes(relatedCity) || adresLower.includes(relatedCity)) {
            console.log(`✅ Locatie "${loc.name}" (${loc.city}) gekoppeld aan ${rl.vestiging} (city mapping: ${cityKey} -> ${relatedCity})`);
            return rl;
          }
        }
      }
    }
  }

  return null;
}

const getCompanyLogoUrl = (websiteUrl: string | undefined) => {
  if (!websiteUrl) return null;
  const cleanUrl = ensureUrl(websiteUrl);
  return `https://t1.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(cleanUrl)}&size=128`;
};

const getFriendlyErrorMessage = (code: string): string => {
  console.log("Error code:", code);
  if (code.includes('auth/invalid-email')) return "Ongeldig e-mailadres.";
  if (code.includes('auth/user-not-found')) return "Geen account gevonden met dit e-mailadres.";
  if (code.includes('auth/wrong-password')) return "Onjuist wachtwoord.";
  if (code.includes('auth/email-already-in-use')) return "Dit e-mailadres is al in gebruik.";
  if (code.includes('auth/weak-password')) return "Wachtwoord moet minimaal 6 tekens zijn.";
  if (code.includes('auth/operation-not-allowed')) return "Inlogmethode staat uit. Ga naar Firebase Console > Authentication > Sign-in method en zet Email/Password of Google aan.";
  if (code.includes('auth/popup-closed-by-user')) return "Inlogscherm is gesloten voordat het klaar was.";
  if (code.includes('auth/popup-blocked')) return "De inlog pop-up werd geblokkeerd door je browser. Sta pop-ups toe.";
  if (code.includes('auth/unauthorized-domain')) {
    const domain = window.location.hostname || window.location.host || 'unknown';
    return `Domein fout. Voeg '${domain}' toe aan Authorized Domains in Firebase.`;
  }
  if (code.includes('FIREBASE_DB_NOT_FOUND')) return "Database 'richting01' niet gevonden. Maak deze aan in Firestore (Test Mode).";
  return `Er is iets misgegaan (${code}). Probeer het opnieuw.`;
};

const handleBackup = async () => {
  const json = await dbService.createBackup();
  if (!json) { alert("Backup mislukt"); return; }
  
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `richting_backup_${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// --- SUB COMPONENTS ---

const DatabaseErrorView = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div className="bg-white p-8 rounded-xl shadow-lg max-w-lg w-full text-center border-l-4 border-red-500">
      <div className="text-red-500 text-5xl mb-4">⚠️</div>
      <h2 className="text-2xl font-bold text-slate-900 mb-4">Database 'richting01' Niet Gevonden</h2>
      <p className="text-gray-600 mb-6 leading-relaxed">
        De applicatie probeert te verbinden met Firestore database: <br/>
        <code className="bg-gray-100 px-2 py-1 rounded font-bold text-red-600">richting01</code>
      </p>
      <div className="bg-slate-50 p-4 rounded-lg text-left text-sm text-slate-700 space-y-2 border border-gray-200">
        <p className="font-bold text-slate-900">Controleer in Firebase Console:</p>
        <ol className="list-decimal pl-4 space-y-1">
          <li>Ga naar <strong>Firestore Database</strong>.</li>
          <li>Kijk linksboven naast het kopje "Database".</li>
          <li>Heet de database daar <code>richting01</code>?</li>
          <li>Zo nee, maak hem aan.</li>
          <li>Zorg dat hij in <strong>Test Mode</strong> staat.</li>
        </ol>
      </div>
      <button onClick={() => window.location.reload()} className="mt-8 bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors w-full">
        Ik heb dit gecheckt, herlaad pagina
      </button>
    </div>
  </div>
);

interface AuthViewProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onGoogleLogin: () => Promise<void>;
  onRegister: (email: string, name: string, pass: string) => Promise<void>;
  onForgot: (email: string) => Promise<void>;
  loading: boolean;
  error: string;
  success: string;
  setAuthError: (msg: string) => void;
}

const AuthView: React.FC<AuthViewProps> = ({ onLogin, onGoogleLogin, onRegister, onForgot, loading, error, success, setAuthError }) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') onLogin(email, password);
    else if (mode === 'register') onRegister(email, name, password);
    else if (mode === 'forgot') onForgot(email);
  };

  const handleCopyDomain = () => {
    const domain = window.location.hostname || window.location.host || 'localhost';
    navigator.clipboard.writeText(domain);
    alert(`Domein gekopieerd: ${domain}`);
  };

  const detectedDomain = window.location.hostname || window.location.host || 'localhost';

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md p-8 bg-white">
        <div className="flex flex-col items-center mb-10">
          <RichtingLogo className="h-14 mb-6 w-auto" />
          <p className="mt-2 text-gray-500 uppercase text-xs tracking-widest">Kennis & Inzicht (Firebase Editie)</p>
        </div>

        {mode !== 'forgot' && (
          <div className="flex border-b border-gray-200 mb-6">
            <button 
              onClick={() => { setMode('login'); setAuthError(''); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'login' ? 'text-richting-orange border-b-2 border-richting-orange' : 'text-gray-500'}`}
            >
              Inloggen
            </button>
            <button 
              onClick={() => { setMode('register'); setAuthError(''); }}
              className={`flex-1 pb-3 text-sm font-medium transition-colors ${mode === 'register' ? 'text-richting-orange border-b-2 border-richting-orange' : 'text-gray-500'}`}
            >
              Registreren
            </button>
          </div>
        )}

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100">{error}</div>}
        {success && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-md border border-green-100">{success}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'register' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Volledige Naam</label>
              <input 
                type="text" required value={name} onChange={e => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700">E-mailadres</label>
            <input 
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
            />
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Wachtwoord</label>
              <input 
                type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-richting-orange focus:border-richting-orange"
              />
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-richting-orange hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-richting-orange transition-colors"
          >
            {loading ? 'Laden...' : mode === 'login' ? 'Inloggen' : mode === 'register' ? 'Account Aanmaken' : 'Stuur Herstel Link'}
          </button>
        </form>

        {mode === 'login' && (
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Of ga verder met</span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={() => onGoogleLogin()}
                type="button"
                className="w-full flex justify-center items-center gap-3 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-richting-orange transition-colors"
              >
                <div className="flex-shrink-0">
                   <GoogleIcon />
                </div>
                <span>Inloggen met Google</span>
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          {mode === 'login' && (
            <button onClick={() => setMode('forgot')} className="text-sm text-gray-500 hover:text-richting-orange">Wachtwoord vergeten?</button>
          )}
          {mode === 'forgot' && (
            <button onClick={() => setMode('login')} className="text-sm text-gray-500 hover:text-richting-orange">Terug naar inloggen</button>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 mb-2">Login werkt niet? Klik hieronder om je domein te kopiëren voor Firebase:</p>
          <div 
            onClick={handleCopyDomain}
            className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1 rounded text-xs text-slate-600 cursor-pointer hover:bg-gray-100 border border-gray-200"
            title="Klik om te kopiëren"
          >
            <code>{detectedDomain}</code>
            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomerDetailView = ({ 
  customer, 
  user,
  onBack, 
  onUpdate, 
  onDelete,
  onOpenDoc
}: { 
  customer: Customer, 
  user: User,
  onBack: () => void,
  onUpdate: (updated: Customer) => void,
  onDelete: (id: string) => void,
  onOpenDoc: (doc: DocumentSource) => void
}) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [contacts, setContacts] = useState<ContactPerson[]>([]);
  const [docs, setDocs] = useState<DocumentSource[]>([]);
  const [organisatieProfiel, setOrganisatieProfiel] = useState<OrganisatieProfiel | null>(null);
  const [selectedProces, setSelectedProces] = useState<Proces | null>(null);
  const [selectedFunctie, setSelectedFunctie] = useState<Functie | null>(null);
  const [isAddingLoc, setIsAddingLoc] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Location | null>(null);
  const [isAnalyzingOrganisatie, setIsAnalyzingOrganisatie] = useState(false);
  const [isAnalyzingCultuur, setIsAnalyzingCultuur] = useState(false);
  const [organisatieAnalyseResultaat, setOrganisatieAnalyseResultaat] = useState<string | null>(null);
  const [progressieveHoofdstukken, setProgressieveHoofdstukken] = useState<Array<{titel: string, content: string}>>([]);
  const [cultuurAnalyseResultaat, setCultuurAnalyseResultaat] = useState<string | null>(null);
  const [analyseStap, setAnalyseStap] = useState(0); // 0 = niet gestart, 1-12 = huidige stap
  const [cultuurAnalyseStap, setCultuurAnalyseStap] = useState(0); // 0 = niet gestart, 1-12 = huidige stap
  
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

  useEffect(() => {
    const loadData = async () => {
       try {
         // Laad basis data (zonder organisatieProfiel om index error te vermijden)
         const [locs, conts, documents] = await Promise.all([
            customerService.getLocations(customer.id),
            customerService.getContactPersons(customer.id),
            dbService.getDocumentsForCustomer(customer.id)
         ]);
         
         // Laad organisatie profiel apart (met error handling)
         let profiel = null;
         try {
           profiel = await customerService.getOrganisatieProfiel(customer.id);
         } catch (e) {
           console.warn("Could not load organisatie profiel (index may be missing):", e);
         }
         
         // Koppel locaties zonder richtingLocatieId aan dichtstbijzijnde Richting locatie
         try {
           const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
           const updatedLocations: Location[] = [];
           let linkedCount = 0;
           
           for (const loc of locs) {
             if (!loc.richtingLocatieId && loc.city) {
               // Gebruik de verbeterde findNearestRichtingLocation functie
               const matchingLocatie = await findNearestRichtingLocation(loc, allRichtingLocaties);
               
               if (matchingLocatie) {
                 const updatedLoc: Location = {
                   ...loc,
                   richtingLocatieId: matchingLocatie.id,
                   richtingLocatieNaam: matchingLocatie.vestiging
                 };
                 // Update in Firestore
                 try {
                   await customerService.addLocation(updatedLoc);
                   updatedLocations.push(updatedLoc);
                   linkedCount++;
                 } catch (e) {
                   console.error(`Error updating location ${loc.id}:`, e);
                   updatedLocations.push(loc);
                 }
               } else {
                 console.log(`⚠️ Geen match gevonden voor locatie "${loc.name}" in ${loc.city}`);
                 updatedLocations.push(loc);
               }
             } else {
               updatedLocations.push(loc);
             }
           }
           
           if (linkedCount > 0) {
             console.log(`✅ ${linkedCount} locaties automatisch gekoppeld`);
           }
           
           setLocations(updatedLocations);
         } catch (e) {
           console.error("Error linking locations:", e);
           setLocations(locs); // Gebruik originele locaties als koppeling faalt
         }
         
         setContacts(conts);
         setDocs(documents);
         setOrganisatieProfiel(profiel);
       } catch (error) {
         console.error("Error loading customer data:", error);
       }
    };
    loadData();
  }, [customer]);

  const handleAddLocation = async () => {
    if (!locName || !locAddress) return;
    
    // Try to get coordinates from address (using a simple geocoding approach)
    // For now, we'll add the location and try to find nearest Richting location based on city
    // In the future, we can integrate a geocoding service to get exact coordinates
    
    const newLoc: Location = {
      id: `loc_${Date.now()}`,
      customerId: customer.id,
      name: locName,
      address: locAddress,
      city: locCity,
      employeeCount: locEmployeeCount
    };
    
    // Try to find nearest Richting location using improved matching
    try {
      const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
      const matchingLocatie = await findNearestRichtingLocation(newLoc, allRichtingLocaties);
      
      if (matchingLocatie) {
        newLoc.richtingLocatieId = matchingLocatie.id;
        newLoc.richtingLocatieNaam = matchingLocatie.vestiging;
      }
    } catch (e) {
      console.error("Error finding nearest Richting location:", e);
    }
    
    await customerService.addLocation(newLoc);
    setLocations(prev => [...prev, newLoc]);
    setIsAddingLoc(false);
    setLocName(''); setLocAddress(''); setLocCity(''); setLocEmployeeCount(undefined);
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
  };

  const handleDeleteLocation = async () => {
    if (!deletingLocation) return;
    
    try {
      await customerService.deleteLocation(deletingLocation.id);
      setLocations(prev => prev.filter(loc => loc.id !== deletingLocation.id));
      setDeletingLocation(null);
    } catch (error) {
      console.error("Error deleting location:", error);
      alert("Kon locatie niet verwijderen. Probeer het opnieuw.");
    }
  };

  const handleAddContact = async () => {
    // Validatie
    if (!contactFirst || !contactFirst.trim()) {
      alert('Voornaam is verplicht');
      return;
    }
    if (!contactEmail || !contactEmail.trim()) {
      alert('Email is verplicht');
      return;
    }
    
    // Email validatie
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail.trim())) {
      alert('Voer een geldig e-mailadres in');
      return;
    }
    
    try {
      const newContact: ContactPerson = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        customerId: customer.id,
        firstName: contactFirst.trim(),
        lastName: contactLast.trim(),
        email: contactEmail.trim(),
        role: contactRole.trim() || undefined,
        phone: undefined
      };
      
      await customerService.addContactPerson(newContact);
      setContacts(prev => [...prev, newContact]);
      setIsAddingContact(false);
      setContactFirst(''); 
      setContactLast(''); 
      setContactEmail(''); 
      setContactRole('');
    } catch (error) {
      console.error('Error adding contact:', error);
      alert('Fout bij het toevoegen van contactpersoon. Probeer het opnieuw.');
    }
  };

  const handleChangeStatus = async (newStatus: 'active' | 'prospect' | 'churned' | 'rejected') => {
    await customerService.updateCustomerStatus(customer.id, newStatus);
    onUpdate({ ...customer, status: newStatus });
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

  const displayLogoUrl = customer.logoUrl || getCompanyLogoUrl(customer.website);

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
       <button onClick={onBack} className="text-gray-500 hover:text-richting-orange flex items-center gap-1 text-sm font-medium mb-4">
         ← Terug naar overzicht
       </button>

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
                    <select 
                        value={customer.status}
                        onChange={(e) => handleChangeStatus(e.target.value as any)}
                        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white text-gray-600 focus:ring-richting-orange"
                    >
                        <option value="prospect">Prospect</option>
                        <option value="active">Actief</option>
                        <option value="churned">Archief</option>
                        <option value="rejected">Afgewezen</option>
                    </select>

                    {user.role === 'ADMIN' && (
                        <button 
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className={`text-xs flex items-center gap-1 text-red-500 hover:text-red-700 font-medium bg-red-50 px-2 py-1 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <TrashIcon />
                            {isDeleting ? 'Bezig...' : 'Verwijderen'}
                        </button>
                    )}
                </div>

                <div className="w-16 h-16 bg-white border border-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {displayLogoUrl ? (
                    <img src={displayLogoUrl} alt={customer.name} className="w-14 h-14 object-contain" />
                ) : (
                    <div className="w-full h-full bg-gray-50"></div>
                )}
                </div>
            </div>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* LOCATIONS SECTION */}
         <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><MapIcon/> Locaties</h3>
               <button onClick={() => setIsAddingLoc(true)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-slate-700 font-medium">+ Toevoegen</button>
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
               {locations.length === 0 && !isAddingLoc && <p className="text-sm text-gray-400 italic">Nog geen locaties toegevoegd.</p>}
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
                          <div className="mt-2 flex items-center gap-1">
                            {loc.richtingLocatieNaam ? (
                              <>
                                <span className="text-xs text-richting-orange font-medium">📍 Dichtstbijzijnde Richting:</span>
                                <span className="text-xs text-slate-700 font-semibold">{loc.richtingLocatieNaam}</span>
                              </>
                            ) : (
                              <span className="text-xs text-gray-400 italic">📍 Richting vestiging wordt gekoppeld...</span>
                            )}
                          </div>
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
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleAddContact();
                    }} className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder="Voornaam *" 
                              className="w-full text-sm border border-gray-300 p-2 rounded focus:ring-richting-orange focus:border-richting-orange" 
                              value={contactFirst} 
                              onChange={e => setContactFirst(e.target.value)}
                              required
                            />
                            <input 
                              type="text" 
                              placeholder="Achternaam" 
                              className="w-full text-sm border border-gray-300 p-2 rounded focus:ring-richting-orange focus:border-richting-orange" 
                              value={contactLast} 
                              onChange={e => setContactLast(e.target.value)} 
                            />
                        </div>
                        <input 
                          type="email" 
                          placeholder="Email *" 
                          className="w-full text-sm border border-gray-300 p-2 rounded focus:ring-richting-orange focus:border-richting-orange" 
                          value={contactEmail} 
                          onChange={e => setContactEmail(e.target.value)}
                          required
                        />
                        <input 
                          type="text" 
                          placeholder="Rol (bijv. HR Manager)" 
                          className="w-full text-sm border border-gray-300 p-2 rounded focus:ring-richting-orange focus:border-richting-orange" 
                          value={contactRole} 
                          onChange={e => setContactRole(e.target.value)} 
                        />
                        <div className="flex gap-2 pt-2">
                            <button 
                              type="submit"
                              onClick={(e) => {
                                e.preventDefault();
                                handleAddContact();
                              }}
                              className="bg-richting-orange text-white text-xs px-4 py-2 rounded font-bold hover:bg-orange-600 transition-colors"
                            >
                              Opslaan
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setIsAddingContact(false);
                                setContactFirst('');
                                setContactLast('');
                                setContactEmail('');
                                setContactRole('');
                              }} 
                              className="text-gray-500 text-xs px-4 py-2 hover:text-gray-700"
                            >
                              Annuleren
                            </button>
                        </div>
                    </form>
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
                 setProgressieveHoofdstukken([]);
                 setAnalyseStap(0);
                 
                 // Declare timeout variable in outer scope for cleanup
                 let hoofdstukTimeout: NodeJS.Timeout | null = null;
                 
                 // Start progress steps met beschrijvingen - gelijkmatige timing
                 const stappen = [
                   { 
                     naam: "Inleiding en Branche-identificatie", 
                     beschrijving: "Analyseert de sector en actualiteiten op het gebied van mens en werk. Identificeert relevante CAO-thema's en betrokken organisaties.",
                     dataKey: 'brancheIdentificatie',
                     hoofdstukNummer: 1
                   },
                   { 
                     naam: "SBI-codes en Bedrijfsinformatie", 
                     beschrijving: "Bepaalt de juiste SBI-codes en analyseert personele omvang en vestigingslocaties in Nederland.",
                     dataKey: 'sbiCodes',
                     hoofdstukNummer: 2
                   },
                   { 
                     naam: "Arbocatalogus en Branche-RI&E", 
                     beschrijving: "Onderzoekt erkende arbo-instrumenten zoals Arbocatalogus en Branche-RI&E en hun actuele status.",
                     dataKey: 'arbocatalogus',
                     hoofdstukNummer: 3
                   },
                   { 
                     naam: "Risicocategorieën en Kwantificering", 
                     beschrijving: "Inventariseert en kwantificeert risico's (psychisch, fysiek, overige) met Fine & Kinney methodiek.",
                     dataKey: 'risicocategorieen',
                     hoofdstukNummer: 4
                   },
                   { 
                     naam: "Primaire Processen in de Branche", 
                     beschrijving: "Beschrijft de kernprocessen op de werkvloer die typerend zijn voor deze branche.",
                     dataKey: 'primairProcessen',
                     hoofdstukNummer: 5
                   },
                   { 
                     naam: "Werkzaamheden en Functies", 
                     beschrijving: "Inventariseert de meest voorkomende functies met taken en verantwoordelijkheden.",
                     dataKey: 'werkzaamheden',
                     hoofdstukNummer: 6
                   },
                   { 
                     naam: "Verzuim in de Branche", 
                     beschrijving: "Analyseert verzuimcijfers, belangrijkste oorzaken en vergelijkt met landelijk gemiddelde.",
                     dataKey: 'verzuim',
                     hoofdstukNummer: 7
                   },
                   { 
                     naam: "Beroepsziekten in de Branche", 
                     beschrijving: "Identificeert meest voorkomende beroepsziekten en koppelt deze aan geïdentificeerde risico's.",
                     dataKey: 'beroepsziekten',
                     hoofdstukNummer: 8
                   },
                   { 
                     naam: "Gevaarlijke Stoffen en Risico's", 
                     beschrijving: "Inventariseert gevaarlijke stoffen die in de sector worden gebruikt en bijbehorende risico's.",
                     dataKey: 'gevaarlijkeStoffen',
                     hoofdstukNummer: 9
                   },
                   { 
                     naam: "Risicomatrices", 
                     beschrijving: "Creëert overzichtelijke matrices die de samenhang tussen processen, functies en risico's tonen.",
                     dataKey: 'risicomatrices',
                     hoofdstukNummer: 10
                   },
                   { 
                     naam: "Vooruitblik en Speerpunten", 
                     beschrijving: "Analyseert verwachte effecten van CAO-thema's en formuleert concrete speerpunten voor verzuimreductie.",
                     dataKey: 'vooruitblik',
                     hoofdstukNummer: 11
                   },
                   { 
                     naam: "Stappenplan voor een Preventieve Samenwerking", 
                     beschrijving: "Genereert een volledig, op maat gemaakt stappenplan met concrete diensten en interventies.",
                     dataKey: 'stappenplan',
                     hoofdstukNummer: 12
                   }
                 ];
                 
                 // Gelijkmatige timing: verdeel tijd over alle stappen (bijv. 2.5 seconden per stap)
                 const timingPerStap = 2500; // 2.5 seconden per hoofdstuk
                 
                 try {
                   // Use Firebase Function to get active prompt from Firestore
                   const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseBranche';
                   
                   // Validate required data
                   if (!customer.name) {
                     throw new Error('Organisatienaam is verplicht');
                   }
                   
                   const requestBody = { 
                     organisatieNaam: customer.name,
                     website: customer.website || ''
                   };
                   
                   console.log('📤 Calling Publiek Organisatie Profiel analyse with:', requestBody);
                   
                   const response = await fetch(functionsUrl, {
                     method: 'POST',
                     headers: {
                       'Content-Type': 'application/json',
                     },
                     body: JSON.stringify(requestBody)
                   });

                   console.log('📥 Response status:', response.status, response.statusText);

                   if (!response.ok) {
                     const errorText = await response.text();
                     console.error('❌ HTTP error response:', errorText);
                     throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`);
                   }

                   const data = await response.json();
                   console.log('✅ Received data from function:', Object.keys(data));
                   
                   // Parse hoofdstukken uit data
                   const hoofdstukken: Array<{titel: string, content: string}> = [];
                   if (data.inleiding) {
                     hoofdstukken.push({ titel: data.inleiding, content: '' });
                   }
                   
                   // Map data keys naar hoofdstuk titels
                   const hoofdstukTitels: Record<string, string> = {
                     'brancheIdentificatie': 'Hoofdstuk 1: Introductie en Branche-identificatie',
                     'sbiCodes': 'Hoofdstuk 2: SBI-codes en Bedrijfsinformatie',
                     'arbocatalogus': 'Hoofdstuk 3: Arbocatalogus en Branche-RI&E',
                     'risicocategorieen': 'Hoofdstuk 4: Risicocategorieën en Kwantificering',
                     'primairProcessen': 'Hoofdstuk 5: Primaire Processen in de Branche',
                     'werkzaamheden': 'Hoofdstuk 6: Werkzaamheden en Functies',
                     'verzuim': 'Hoofdstuk 7: Verzuim in de Branche',
                     'beroepsziekten': 'Hoofdstuk 8: Beroepsziekten in de Branche',
                     'gevaarlijkeStoffen': 'Hoofdstuk 9: Gevaarlijke Stoffen en Risico\'s',
                     'risicomatrices': 'Hoofdstuk 10: Risicomatrices',
                     'vooruitblik': 'Hoofdstuk 11: Vooruitblik en Speerpunten',
                     'stappenplan': 'Hoofdstuk 12: Stappenplan voor een Preventieve Samenwerking'
                   };
                   
                   // Progressief hoofdstukken toevoegen
                   let hoofdstukIndex = 0;
                   const alleHoofdstukken: Array<{titel: string, content: string}> = [];
                   
                   // Voeg inleiding toe als die er is
                   if (data.inleiding) {
                     alleHoofdstukken.push({ titel: data.inleiding, content: '' });
                     setProgressieveHoofdstukken([{ titel: data.inleiding, content: '' }]);
                   }
                   
                   const addHoofdstuk = () => {
                     if (hoofdstukIndex < stappen.length) {
                       const stap = stappen[hoofdstukIndex];
                       const content = data[stap.dataKey];
                       
                       if (content) {
                         const titel = hoofdstukTitels[stap.dataKey] || stap.naam;
                         alleHoofdstukken.push({ titel, content });
                         
                         // Update state met alle hoofdstukken tot nu toe
                         setProgressieveHoofdstukken([...alleHoofdstukken]);
                         setAnalyseStap(hoofdstukIndex + 1);
                         
                         // Scroll naar nieuw hoofdstuk
                         setTimeout(() => {
                           const element = document.getElementById(`hoofdstuk-${hoofdstukIndex}`);
                           if (element) {
                             element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                           }
                         }, 100);
                       }
                       
                       hoofdstukIndex++;
                       if (hoofdstukIndex < stappen.length) {
                         setTimeout(addHoofdstuk, timingPerStap);
                       } else {
                         // Alle hoofdstukken zijn toegevoegd
                         setAnalyseStap(12);
                         setIsAnalyzingOrganisatie(false);
                         
                         // Build complete result voor opslaan
                         let result = '';
                         if (data.inleiding) result += `# ${data.inleiding}\n\n`;
                         alleHoofdstukken.forEach(h => {
                           if (h.content) {
                             result += `## ${h.titel}\n\n${h.content}\n\n`;
                           }
                         });
                         setOrganisatieAnalyseResultaat(result);
                         
                         // Save to Firestore as OrganisatieProfiel (na alle hoofdstukken)
                         if (data && customer.id) {
                           (async () => {
                             try {
                               // Transform data to OrganisatieProfiel format
                               const profielData: Partial<OrganisatieProfiel> = {
                                 organisatieNaam: customer.name,
                                 website: customer.website || '',
                                 volledigRapport: data.volledigRapport || result,
                                 risicos: data.risicos || [],
                                 processen: data.processen || [],
                                 functies: data.functies || [],
                                 geanalyseerdDoor: user.id,
                                 createdAt: new Date().toISOString(),
                                 updatedAt: new Date().toISOString()
                               };
                               
                               await customerService.saveOrganisatieProfiel(customer.id, profielData);
                               
                               // Reload the profile to show it immediately
                               const savedProfiel = await customerService.getOrganisatieProfiel(customer.id);
                               if (savedProfiel) {
                                 setOrganisatieProfiel(savedProfiel);
                               }
                               
                               // Import locaties from OrganisatieProfiel if available
                               if (data.locaties && Array.isArray(data.locaties)) {
                                 const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
                                 const currentLocations = await customerService.getLocations(customer.id);
                                 
                                 for (const profielLocatie of data.locaties) {
                                   // Check if location already exists
                                   const existingLoc = currentLocations.find(loc => 
                                     loc.name === profielLocatie.naam && 
                                     loc.address === profielLocatie.adres
                                   );
                                   
                                   if (!existingLoc) {
                                     const newLoc: Location = {
                                       id: `loc_${Date.now()}_${Math.random()}`,
                                       customerId: customer.id,
                                       name: profielLocatie.naam || 'Locatie',
                                       address: profielLocatie.adres || '',
                                       city: profielLocatie.stad || '',
                                       employeeCount: profielLocatie.aantalMedewerkers || undefined
                                     };
                                     
                                     // Find nearest Richting location using improved matching
                                     if (newLoc.city || profielLocatie.richtingLocatie) {
                                       // Eerst proberen exacte match op naam als die is opgegeven
                                       if (profielLocatie.richtingLocatie) {
                                         const exactMatch = allRichtingLocaties.find(rl => 
                                           rl.vestiging === profielLocatie.richtingLocatie ||
                                           rl.vestiging.toLowerCase() === profielLocatie.richtingLocatie.toLowerCase()
                                         );
                                         if (exactMatch) {
                                           newLoc.richtingLocatieId = exactMatch.id;
                                           newLoc.richtingLocatieNaam = exactMatch.vestiging;
                                         }
                                       }
                                       
                                       // Als geen exacte match, gebruik findNearestRichtingLocation
                                       if (!newLoc.richtingLocatieId && newLoc.city) {
                                         const matchingLocatie = await findNearestRichtingLocation(newLoc, allRichtingLocaties);
                                         if (matchingLocatie) {
                                           newLoc.richtingLocatieId = matchingLocatie.id;
                                           newLoc.richtingLocatieNaam = matchingLocatie.vestiging;
                                         }
                                       }
                                     }
                                     
                                     await customerService.addLocation(newLoc);
                                     setLocations(prev => [...prev, newLoc]);
                                   } else if (profielLocatie.aantalMedewerkers && !existingLoc.employeeCount) {
                                     // Update existing location with employee count if missing
                                     const updatedLoc = { ...existingLoc, employeeCount: profielLocatie.aantalMedewerkers };
                                     await customerService.addLocation(updatedLoc);
                                     setLocations(prev => prev.map(loc => loc.id === existingLoc.id ? updatedLoc : loc));
                                   }
                                 }
                               }
                             } catch (saveError) {
                               console.error("Error saving organisatie profiel:", saveError);
                             }
                           })();
                         }
                       }
                     }
                   };
                   
                   // Start met eerste hoofdstuk
                   hoofdstukTimeout = setTimeout(addHoofdstuk, timingPerStap);
                 } catch (error: any) {
                   isCancelled = true;
                   // Clear any pending hoofdstuk timeouts
                   if (hoofdstukTimeout) {
                     clearTimeout(hoofdstukTimeout);
                     hoofdstukTimeout = null;
                   }
                   console.error("❌ Organisatie analyse error:", error);
                   const errorMessage = error.message || 'Onbekende fout';
                   setOrganisatieAnalyseResultaat(`❌ Fout bij analyse: ${errorMessage}\n\nControleer de browser console voor meer details.`);
                   setProgressieveHoofdstukken([]);
                   setAnalyseStap(0);
                 } finally {
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
                   const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseCultuurTest';
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
           </div>
         </div>

         {/* Analyse Progress Steps */}
         {isAnalyzingOrganisatie && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4">
             <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
               <span className="animate-spin">⏳</span> Analyse in uitvoering...
             </h4>
             <div className="space-y-3">
               {[
                 { naam: "Inleiding en Branche-identificatie", beschrijving: "Analyseert de sector en actualiteiten op het gebied van mens en werk. Identificeert relevante CAO-thema's en betrokken organisaties." },
                 { naam: "SBI-codes en Bedrijfsinformatie", beschrijving: "Bepaalt de juiste SBI-codes en analyseert personele omvang en vestigingslocaties in Nederland." },
                 { naam: "Arbocatalogus en Branche-RI&E", beschrijving: "Onderzoekt erkende arbo-instrumenten zoals Arbocatalogus en Branche-RI&E en hun actuele status." },
                 { naam: "Risicocategorieën en Kwantificering", beschrijving: "Inventariseert en kwantificeert risico's (psychisch, fysiek, overige) met Fine & Kinney methodiek." },
                 { naam: "Primaire Processen in de Branche", beschrijving: "Beschrijft de kernprocessen op de werkvloer die typerend zijn voor deze branche." },
                 { naam: "Werkzaamheden en Functies", beschrijving: "Inventariseert de meest voorkomende functies met taken en verantwoordelijkheden." },
                 { naam: "Verzuim in de Branche", beschrijving: "Analyseert verzuimcijfers, belangrijkste oorzaken en vergelijkt met landelijk gemiddelde." },
                 { naam: "Beroepsziekten in de Branche", beschrijving: "Identificeert meest voorkomende beroepsziekten en koppelt deze aan geïdentificeerde risico's." },
                 { naam: "Gevaarlijke Stoffen en Risico's", beschrijving: "Inventariseert gevaarlijke stoffen die in de sector worden gebruikt en bijbehorende risico's." },
                 { naam: "Risicomatrices", beschrijving: "Creëert overzichtelijke matrices die de samenhang tussen processen, functies en risico's tonen." },
                 { naam: "Vooruitblik en Speerpunten", beschrijving: "Analyseert verwachte effecten van CAO-thema's en formuleert concrete speerpunten voor verzuimreductie." },
                 { naam: "Stappenplan voor een Preventieve Samenwerking", beschrijving: "Genereert een volledig, op maat gemaakt stappenplan met concrete diensten en interventies. Dit is het meest uitgebreide onderdeel." }
               ].map((stap, index) => {
                 const stapNummer = index + 1;
                 const isVoltooid = analyseStap > stapNummer;
                 const isHuidige = analyseStap === stapNummer;
                 
                 return (
                   <div 
                     key={index}
                     className={`p-3 rounded-lg transition-all ${
                       isHuidige 
                         ? 'bg-orange-50 border-2 border-richting-orange shadow-sm' 
                         : isVoltooid
                         ? 'bg-green-50 border border-green-200'
                         : 'bg-gray-50 border border-gray-200'
                     }`}
                   >
                     <div className="flex items-start gap-3">
                       <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                         isVoltooid 
                           ? 'bg-green-500 text-white' 
                           : isHuidige 
                           ? 'bg-richting-orange text-white animate-pulse' 
                           : 'bg-gray-300 text-gray-500'
                       }`}>
                         {isVoltooid ? (
                           <span className="text-xs font-bold">✓</span>
                         ) : isHuidige ? (
                           <span className="text-xs font-bold animate-spin">⟳</span>
                         ) : (
                           <span className="text-xs font-bold">{stapNummer}</span>
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className={`text-sm font-semibold mb-1 ${
                           isVoltooid 
                             ? 'text-gray-600' 
                             : isHuidige 
                             ? 'text-richting-orange' 
                             : 'text-gray-500'
                         }`}>
                           {stapNummer}. {stap.naam}
                         </div>
                         {isHuidige && (
                           <div className="text-xs text-gray-600 leading-relaxed mt-1">
                             {stap.beschrijving}
                           </div>
                         )}
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
             <div className="mt-4 pt-4 border-t border-gray-200">
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <span>Voortgang: {analyseStap} van 12 stappen</span>
                 <div className="w-32 bg-gray-200 rounded-full h-2">
                   <div 
                     className="bg-richting-orange h-2 rounded-full transition-all duration-300"
                     style={{ width: `${(analyseStap / 12) * 100}%` }}
                   ></div>
                 </div>
               </div>
             </div>
           </div>
         )}

         {/* Progressieve Hoofdstukken Weergave */}
         {progressieveHoofdstukken.length > 0 && (
           <div className="bg-white border border-gray-200 rounded-lg p-6 mb-4 shadow-sm">
             <h4 className="font-bold text-richting-orange mb-4 flex items-center gap-2 text-lg">
               📊 Publiek Organisatie Profiel
               {isAnalyzingOrganisatie && (
                 <span className="text-sm font-normal text-gray-500 ml-2">
                   (Genereren... {progressieveHoofdstukken.length} van 12 hoofdstukken)
                 </span>
               )}
             </h4>
             <div className="space-y-6 max-h-[800px] overflow-y-auto">
               {progressieveHoofdstukken.map((hoofdstuk, index) => (
                 <div 
                   key={index} 
                   id={`hoofdstuk-${index}`}
                   className={`border-l-4 pl-4 pb-4 ${
                     index === progressieveHoofdstukken.length - 1 
                       ? 'border-richting-orange bg-orange-50/30' 
                       : 'border-gray-300'
                   } transition-all duration-500`}
                 >
                   <h5 className="font-bold text-slate-800 mb-3 text-lg">{hoofdstuk.titel}</h5>
                   <div className="text-gray-700">
                     <MarkdownRenderer content={hoofdstuk.content} />
                   </div>
                 </div>
               ))}
             </div>
           </div>
         )}

         {/* Volledig Resultaat (alleen als alles klaar is en geen progressieve weergave) */}
         {organisatieAnalyseResultaat && progressieveHoofdstukken.length === 0 && (
           <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
             <h4 className="font-bold text-richting-orange mb-2 flex items-center gap-2">📊 Publiek Organisatie Profiel Resultaat</h4>
             <div className="max-h-[800px] overflow-y-auto">
               <MarkdownRenderer content={organisatieAnalyseResultaat} />
             </div>
           </div>
         )}

         {/* Call-to-action als er nog geen profiel is */}
         {!organisatieProfiel && !isAnalyzingOrganisatie && !organisatieAnalyseResultaat && (
           <div className="bg-gradient-to-r from-richting-orange/10 to-orange-100 border-2 border-richting-orange/30 rounded-xl p-6 mb-6">
             <div className="flex items-start gap-4">
               <div className="text-4xl">📊</div>
               <div className="flex-1">
                 <h3 className="text-xl font-bold text-slate-900 mb-2">Publiek Organisatie Profiel</h3>
                 <p className="text-gray-700 mb-4">
                   Genereer een volledig organisatieprofiel met risicoanalyse, processen en functies op basis van de branche en organisatiegegevens.
                 </p>
                 <button
                   onClick={async () => {
                     setIsAnalyzingOrganisatie(true);
                     setOrganisatieAnalyseResultaat(null);
                     setProgressieveHoofdstukken([]);
                     setAnalyseStap(0);
                     
                     // Declare timeout variable in outer scope for cleanup
                     let hoofdstukTimeout: NodeJS.Timeout | null = null;
                     
                     // Start progress steps met beschrijvingen - gelijkmatige timing
                     const stappen = [
                       { 
                         naam: "Inleiding en Branche-identificatie", 
                         beschrijving: "Analyseert de sector en actualiteiten op het gebied van mens en werk. Identificeert relevante CAO-thema's en betrokken organisaties.",
                         dataKey: 'brancheIdentificatie',
                         hoofdstukNummer: 1
                       },
                       { 
                         naam: "SBI-codes en Bedrijfsinformatie", 
                         beschrijving: "Bepaalt de juiste SBI-codes en analyseert personele omvang en vestigingslocaties in Nederland.",
                         dataKey: 'sbiCodes',
                         hoofdstukNummer: 2
                       },
                       { 
                         naam: "Arbocatalogus en Branche-RI&E", 
                         beschrijving: "Onderzoekt erkende arbo-instrumenten zoals Arbocatalogus en Branche-RI&E en hun actuele status.",
                         dataKey: 'arbocatalogus',
                         hoofdstukNummer: 3
                       },
                       { 
                         naam: "Risicocategorieën en Kwantificering", 
                         beschrijving: "Inventariseert en kwantificeert risico's (psychisch, fysiek, overige) met Fine & Kinney methodiek.",
                         dataKey: 'risicocategorieen',
                         hoofdstukNummer: 4
                       },
                       { 
                         naam: "Primaire Processen in de Branche", 
                         beschrijving: "Beschrijft de kernprocessen op de werkvloer die typerend zijn voor deze branche.",
                         dataKey: 'primairProcessen',
                         hoofdstukNummer: 5
                       },
                       { 
                         naam: "Werkzaamheden en Functies", 
                         beschrijving: "Inventariseert de meest voorkomende functies met taken en verantwoordelijkheden.",
                         dataKey: 'werkzaamheden',
                         hoofdstukNummer: 6
                       },
                       { 
                         naam: "Verzuim in de Branche", 
                         beschrijving: "Analyseert verzuimcijfers, belangrijkste oorzaken en vergelijkt met landelijk gemiddelde.",
                         dataKey: 'verzuim',
                         hoofdstukNummer: 7
                       },
                       { 
                         naam: "Beroepsziekten in de Branche", 
                         beschrijving: "Identificeert meest voorkomende beroepsziekten en koppelt deze aan geïdentificeerde risico's.",
                         dataKey: 'beroepsziekten',
                         hoofdstukNummer: 8
                       },
                       { 
                         naam: "Gevaarlijke Stoffen en Risico's", 
                         beschrijving: "Inventariseert gevaarlijke stoffen die in de sector worden gebruikt en bijbehorende risico's.",
                         dataKey: 'gevaarlijkeStoffen',
                         hoofdstukNummer: 9
                       },
                       { 
                         naam: "Risicomatrices", 
                         beschrijving: "Creëert overzichtelijke matrices die de samenhang tussen processen, functies en risico's tonen.",
                         dataKey: 'risicomatrices',
                         hoofdstukNummer: 10
                       },
                       { 
                         naam: "Vooruitblik en Speerpunten", 
                         beschrijving: "Analyseert verwachte effecten van CAO-thema's en formuleert concrete speerpunten voor verzuimreductie.",
                         dataKey: 'vooruitblik',
                         hoofdstukNummer: 11
                       },
                       { 
                         naam: "Stappenplan voor een Preventieve Samenwerking", 
                         beschrijving: "Genereert een volledig, op maat gemaakt stappenplan met concrete diensten en interventies.",
                         dataKey: 'stappenplan',
                         hoofdstukNummer: 12
                       }
                     ];
                     
                     // Gelijkmatige timing: verdeel tijd over alle stappen (bijv. 2.5 seconden per stap)
                     const timingPerStap = 2500; // 2.5 seconden per hoofdstuk
                     
                     try {
                       // Use Firebase Function to get active prompt from Firestore
                       const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/analyseBranche';
                       
                       // Validate required data
                       if (!customer.name) {
                         throw new Error('Organisatienaam is verplicht');
                       }
                       
                       const requestBody = { 
                         organisatieNaam: customer.name,
                         website: customer.website || ''
                       };
                       
                       console.log('📤 Calling Publiek Organisatie Profiel analyse with:', requestBody);
                       
                       const response = await fetch(functionsUrl, {
                         method: 'POST',
                         headers: {
                           'Content-Type': 'application/json',
                         },
                         body: JSON.stringify(requestBody)
                       });

                       console.log('📥 Response status:', response.status, response.statusText);

                       if (!response.ok) {
                         const errorText = await response.text();
                         console.error('❌ HTTP error response:', errorText);
                         throw new Error(`HTTP error! status: ${response.status} - ${errorText.substring(0, 200)}`);
                       }

                   let data;
                   try {
                     data = await response.json();
                     console.log('✅ Received data from function:', Object.keys(data));
                   } catch (jsonError) {
                     console.error('❌ Error parsing JSON response:', jsonError);
                     const errorText = await response.text();
                     throw new Error(`Failed to parse response as JSON. Response: ${errorText.substring(0, 500)}`);
                   }
                   
                   // Check if data is valid
                   if (!data || typeof data !== 'object') {
                     throw new Error('Invalid data received from server');
                   }
                   
                   // Map data keys naar hoofdstuk titels
                   const hoofdstukTitels: Record<string, string> = {
                     'brancheIdentificatie': 'Hoofdstuk 1: Introductie en Branche-identificatie',
                     'sbiCodes': 'Hoofdstuk 2: SBI-codes en Bedrijfsinformatie',
                     'arbocatalogus': 'Hoofdstuk 3: Arbocatalogus en Branche-RI&E',
                     'risicocategorieen': 'Hoofdstuk 4: Risicocategorieën en Kwantificering',
                     'primairProcessen': 'Hoofdstuk 5: Primaire Processen in de Branche',
                     'werkzaamheden': 'Hoofdstuk 6: Werkzaamheden en Functies',
                     'verzuim': 'Hoofdstuk 7: Verzuim in de Branche',
                     'beroepsziekten': 'Hoofdstuk 8: Beroepsziekten in de Branche',
                     'gevaarlijkeStoffen': 'Hoofdstuk 9: Gevaarlijke Stoffen en Risico\'s',
                     'risicomatrices': 'Hoofdstuk 10: Risicomatrices',
                     'vooruitblik': 'Hoofdstuk 11: Vooruitblik en Speerpunten',
                     'stappenplan': 'Hoofdstuk 12: Stappenplan voor een Preventieve Samenwerking'
                   };
                   
                   // Progressief hoofdstukken toevoegen
                   let hoofdstukIndex = 0;
                   const alleHoofdstukken: Array<{titel: string, content: string}> = [];
                   
                   // Voeg inleiding toe als die er is
                   if (data.inleiding) {
                     alleHoofdstukken.push({ titel: data.inleiding, content: '' });
                     setProgressieveHoofdstukken([{ titel: data.inleiding, content: '' }]);
                   }
                   
                   const addHoofdstuk = () => {
                     if (hoofdstukIndex < stappen.length) {
                       const stap = stappen[hoofdstukIndex];
                       const content = data[stap.dataKey];
                       
                       if (content) {
                         const titel = hoofdstukTitels[stap.dataKey] || stap.naam;
                         alleHoofdstukken.push({ titel, content });
                         
                         // Update state met alle hoofdstukken tot nu toe
                         setProgressieveHoofdstukken([...alleHoofdstukken]);
                         setAnalyseStap(hoofdstukIndex + 1);
                         
                         // Scroll naar nieuw hoofdstuk
                         setTimeout(() => {
                           const element = document.getElementById(`hoofdstuk-${hoofdstukIndex}`);
                           if (element) {
                             element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                           }
                         }, 100);
                       }
                       
                       hoofdstukIndex++;
                       if (hoofdstukIndex < stappen.length) {
                         hoofdstukTimeout = setTimeout(addHoofdstuk, timingPerStap);
                       } else {
                         // Alle hoofdstukken zijn toegevoegd
                         setAnalyseStap(12);
                         setIsAnalyzingOrganisatie(false);
                         
                         // Build complete result voor opslaan
                         let result = '';
                         if (data.inleiding) result += `# ${data.inleiding}\n\n`;
                         alleHoofdstukken.forEach(h => {
                           if (h.content) {
                             result += `## ${h.titel}\n\n${h.content}\n\n`;
                           }
                         });
                         setOrganisatieAnalyseResultaat(result);
                         
                         // Save to Firestore as OrganisatieProfiel (na alle hoofdstukken)
                         if (data && customer.id) {
                           (async () => {
                             try {
                               // Transform data to OrganisatieProfiel format
                               const profielData: Partial<OrganisatieProfiel> = {
                                 organisatieNaam: customer.name,
                                 website: customer.website || '',
                                 volledigRapport: data.volledigRapport || result,
                                 risicos: data.risicos || [],
                                 processen: data.processen || [],
                                 functies: data.functies || [],
                                 geanalyseerdDoor: user.id,
                                 createdAt: new Date().toISOString(),
                                 updatedAt: new Date().toISOString()
                               };
                               
                               await customerService.saveOrganisatieProfiel(customer.id, profielData);
                               
                               // Reload the profile to show it immediately
                               const savedProfiel = await customerService.getOrganisatieProfiel(customer.id);
                               if (savedProfiel) {
                                 setOrganisatieProfiel(savedProfiel);
                               }
                               
                               // Import locaties from OrganisatieProfiel if available
                               if (data.locaties && Array.isArray(data.locaties)) {
                                 const allRichtingLocaties = await richtingLocatiesService.getAllLocaties();
                                 const currentLocations = await customerService.getLocations(customer.id);
                                 
                                 for (const profielLocatie of data.locaties) {
                                   // Check if location already exists
                                   const existingLoc = currentLocations.find(loc => 
                                     loc.name === profielLocatie.naam && 
                                     loc.address === profielLocatie.adres
                                   );
                                   
                                   if (!existingLoc) {
                                     const newLoc: Location = {
                                       id: `loc_${Date.now()}_${Math.random()}`,
                                       customerId: customer.id,
                                       name: profielLocatie.naam || 'Locatie',
                                       address: profielLocatie.adres || '',
                                       city: profielLocatie.stad || '',
                                       employeeCount: profielLocatie.aantalMedewerkers || undefined
                                     };
                                     
                                     // Find nearest Richting location using improved matching
                                     if (newLoc.city || profielLocatie.richtingLocatie) {
                                       // Eerst proberen exacte match op naam als die is opgegeven
                                       if (profielLocatie.richtingLocatie) {
                                         const exactMatch = allRichtingLocaties.find(rl => 
                                           rl.vestiging === profielLocatie.richtingLocatie ||
                                           rl.vestiging.toLowerCase() === profielLocatie.richtingLocatie.toLowerCase()
                                         );
                                         if (exactMatch) {
                                           newLoc.richtingLocatieId = exactMatch.id;
                                           newLoc.richtingLocatieNaam = exactMatch.vestiging;
                                         }
                                       }
                                       
                                       // Als geen exacte match, gebruik findNearestRichtingLocation
                                       if (!newLoc.richtingLocatieId && newLoc.city) {
                                         const matchingLocatie = await findNearestRichtingLocation(newLoc, allRichtingLocaties);
                                         if (matchingLocatie) {
                                           newLoc.richtingLocatieId = matchingLocatie.id;
                                           newLoc.richtingLocatieNaam = matchingLocatie.vestiging;
                                         }
                                       }
                                     }
                                     
                                     await customerService.addLocation(newLoc);
                                     setLocations(prev => [...prev, newLoc]);
                                   } else if (profielLocatie.aantalMedewerkers && !existingLoc.employeeCount) {
                                     // Update existing location with employee count if missing
                                     const updatedLoc = { ...existingLoc, employeeCount: profielLocatie.aantalMedewerkers };
                                     await customerService.addLocation(updatedLoc);
                                     setLocations(prev => prev.map(loc => loc.id === existingLoc.id ? updatedLoc : loc));
                                   }
                                 }
                               }
                             } catch (saveError) {
                               console.error("Error saving organisatie profiel:", saveError);
                             }
                           })();
                         }
                       }
                     }
                   };
                   
                  // Start met eerste hoofdstuk
                  hoofdstukTimeout = setTimeout(addHoofdstuk, timingPerStap);
                    } catch (error: any) {
                      // Clear any pending hoofdstuk timeouts
                      if (hoofdstukTimeout) {
                        clearTimeout(hoofdstukTimeout);
                        hoofdstukTimeout = null;
                      }
                      console.error("❌ Organisatie analyse error:", error);
                      const errorMessage = error.message || 'Onbekende fout';
                      setOrganisatieAnalyseResultaat(`❌ Fout bij analyse: ${errorMessage}\n\nControleer de browser console voor meer details.`);
                      setProgressieveHoofdstukken([]);
                      setAnalyseStap(0);
                    } finally {
                      setIsAnalyzingOrganisatie(false);
                    }
                   }}
                   className="bg-richting-orange text-white px-6 py-3 rounded-lg font-bold hover:bg-orange-600 transition-colors flex items-center gap-2"
                 >
                   <span>📊</span>
                   <span>Genereer Publiek Organisatie Profiel</span>
                 </button>
               </div>
             </div>
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
                   const risicosInCat = organisatieProfiel.risicos.filter(r => {
                     // Check both exact match and case-insensitive match
                     const rCategorie = (r.categorie || '').toLowerCase();
                     return rCategorie === cat.toLowerCase();
                   });
                   const gemiddeldeRisico = risicosInCat.length > 0
                     ? risicosInCat.reduce((sum, r) => {
                         const kans = convertKansToFineKinney(r.kans);
                         const effect = convertEffectToFineKinney(r.effect);
                         const risicogetal = kans * effect;
                         return sum + risicogetal;
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
                     const kans = convertKansToFineKinney(risico.kans);
                     const effect = convertEffectToFineKinney(risico.effect);
                     const risicogetal = kans * effect;
                     const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                     return { risico, kans, effect, risicogetal, prioriteitNiveau };
                   })
                   .sort((a, b) => b.risicogetal - a.risicogetal)
                   .slice(0, 10)
                   .map(({ risico, kans, effect, risicogetal, prioriteitNiveau }) => {
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
                         {getPrioriteitBadge(prioriteitNiveau)}
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
                {organisatieProfiel.processen
                  ?.map(proces => {
                    const risicos = proces.risicos || [];
                    // Bereken prioriteit voor dit proces
                    const risicosMetBerekening = risicos.map(item => {
                      // Probeer eerst item.risico, dan zoek in organisatieProfiel.risicos
                      let risico = item.risico;
                      if (!risico && item.risicoId) {
                        risico = organisatieProfiel.risicos?.find(r => r.id === item.risicoId);
                      }
                      // Als nog steeds geen risico gevonden, probeer op naam te matchen
                      if (!risico && item.risicoId && organisatieProfiel.risicos) {
                        // Soms is risicoId een naam in plaats van een ID
                        risico = organisatieProfiel.risicos.find(r => r.naam === item.risicoId || r.id === item.risicoId);
                      }
                      if (!risico) {
                        console.warn(`⚠️ Risico niet gevonden voor proces ${proces.naam}: risicoId=${item.risicoId}`);
                        return null;
                      }
                      const blootstelling = item.blootstelling || 3;
                      const kans = convertKansToFineKinney(risico.kans);
                      const effect = convertEffectToFineKinney(risico.effect);
                      const risicogetal = blootstelling * kans * effect;
                      return { risico, blootstelling, kans, effect, risicogetal };
                    }).filter(Boolean);
                    const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                      ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                      : 0;
                    const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                    // Gebruik risicosMetBerekening.length voor het aantal gevonden risico's
                    const aantalRisicos = risicosMetBerekening.length;
                    return { proces, prioriteitNiveau, risicos, aantalRisicos };
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ proces, prioriteitNiveau, risicos, aantalRisicos }) => {
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
                          <div className="ml-3 flex-shrink-0">
                            {getPrioriteitBadge(prioriteitNiveau)}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="text-richting-orange">⚠️</span> {aantalRisicos} risico{aantalRisicos !== 1 ? "'s" : ""}
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
                {organisatieProfiel.functies
                  ?.map(functie => {
                    const risicos = functie.risicos || [];
                    // Bereken prioriteit voor deze functie
                    const risicosMetBerekening = risicos.map(item => {
                      // Probeer eerst item.risico, dan zoek in organisatieProfiel.risicos
                      let risico = item.risico;
                      if (!risico && item.risicoId) {
                        risico = organisatieProfiel.risicos?.find(r => r.id === item.risicoId);
                      }
                      // Als nog steeds geen risico gevonden, probeer op naam te matchen
                      if (!risico && item.risicoId && organisatieProfiel.risicos) {
                        // Soms is risicoId een naam in plaats van een ID
                        risico = organisatieProfiel.risicos.find(r => r.naam === item.risicoId || r.id === item.risicoId);
                      }
                      if (!risico) {
                        console.warn(`⚠️ Risico niet gevonden voor functie ${functie.naam}: risicoId=${item.risicoId}`);
                        return null;
                      }
                      const blootstelling = item.blootstelling || 3;
                      const kans = convertKansToFineKinney(risico.kans);
                      const effect = convertEffectToFineKinney(risico.effect);
                      const risicogetal = blootstelling * kans * effect;
                      return { risico, blootstelling, kans, effect, risicogetal };
                    }).filter(Boolean);
                    const gemiddeldePrioriteit = risicosMetBerekening.length > 0 
                      ? risicosMetBerekening.reduce((sum, r) => sum + (r?.risicogetal || 0), 0) / risicosMetBerekening.length
                      : 0;
                    const prioriteitNiveau = gemiddeldePrioriteit >= 400 ? 1 : gemiddeldePrioriteit >= 200 ? 2 : gemiddeldePrioriteit >= 100 ? 3 : gemiddeldePrioriteit >= 50 ? 4 : 5;
                    // Gebruik risicosMetBerekening.length voor het aantal gevonden risico's
                    const aantalRisicos = risicosMetBerekening.length;
                    return { functie, prioriteitNiveau, risicos, aantalRisicos };
                  })
                  .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                  .map(({ functie, prioriteitNiveau, risicos, aantalRisicos }) => {
                    return (
                      <div 
                        key={functie.id} 
                        onClick={() => setSelectedFunctie(functie)}
                        className="p-4 bg-gradient-to-r from-gray-50 to-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-richting-orange hover:shadow-md transition-all group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h5 className="font-bold text-base text-slate-900 group-hover:text-richting-orange transition-colors">{functie.naam}</h5>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{functie.beschrijving}</p>
                          </div>
                          <div className="ml-3 flex-shrink-0">
                            {getPrioriteitBadge(prioriteitNiveau)}
                          </div>
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
                            <span className="text-richting-orange">⚠️</span> {aantalRisicos} risico{aantalRisicos !== 1 ? "'s" : ""}
                          </span>
                          <span className="text-xs text-richting-orange font-medium group-hover:underline">Details bekijken →</span>
                        </div>
                      </div>
                    );
                  })}
               </div>
             </div>
           </div>

           {/* Volledig Rapport */}
           {organisatieProfiel.volledigRapport && (
             <div className="bg-white rounded-xl shadow-md border border-gray-300 p-6 mb-6">
               <h4 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 pb-3 border-b-2 border-richting-orange">
                 <span className="text-2xl">📄</span> Volledig Rapport
               </h4>
               <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200 max-h-[800px] overflow-y-auto shadow-inner">
                 <MarkdownRenderer content={organisatieProfiel.volledigRapport} />
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
                     onClick={() => { setSelectedProces(null); setSelectedFunctie(null); }}
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
                      
                      {/* Gerelateerde Functies */}
                      {(() => {
                        // Vind functies die dezelfde risico's hebben als dit proces
                        const procesRisicoIds = selectedProces.risicos?.map(r => r.risicoId).filter(Boolean) || [];
                        const gerelateerdeFuncties = organisatieProfiel.functies?.filter(functie => 
                          functie.risicos?.some(fr => procesRisicoIds.includes(fr.risicoId))
                        ) || [];
                        
                        if (gerelateerdeFuncties.length > 0) {
                          return (
                            <div className="mb-6">
                              <h4 className="font-bold text-slate-900 mb-3 text-lg flex items-center gap-2">
                                <span>👥</span> Gerelateerde Functies ({gerelateerdeFuncties.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {gerelateerdeFuncties.map(functie => (
                                  <div
                                    key={functie.id}
                                    onClick={() => { setSelectedProces(null); setSelectedFunctie(functie); }}
                                    className="p-3 bg-gradient-to-r from-purple-50 to-white border-2 border-purple-200 rounded-lg cursor-pointer hover:border-purple-400 hover:shadow-md transition-all"
                                  >
                                    <h5 className="font-bold text-sm text-slate-900">{functie.naam}</h5>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{functie.beschrijving}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs text-gray-500">⚠️ {functie.risicos?.length || 0} risico's</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
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
                                 const kans = convertKansToFineKinney(risico.kans);
                                 const effect = convertEffectToFineKinney(risico.effect);
                                 const risicogetal = blootstelling * kans * effect;
                                 const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                                 return { item, risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau, idx };
                               })
                               .filter(Boolean)
                               .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                               .map((data) => {
                                 if (!data) return null;
                                 const { risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau } = data;
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
                                       {getPrioriteitBadge(prioriteitNiveau)}
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
                                     const kans = convertKansToFineKinney(risico.kans);
                                     const effect = convertEffectToFineKinney(risico.effect);
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
                      
                      {/* Gerelateerde Processen */}
                      {(() => {
                        // Vind processen die dezelfde risico's hebben als deze functie
                        const functieRisicoIds = selectedFunctie.risicos?.map(r => r.risicoId).filter(Boolean) || [];
                        const gerelateerdeProcessen = organisatieProfiel.processen?.filter(proces => 
                          proces.risicos?.some(pr => functieRisicoIds.includes(pr.risicoId))
                        ) || [];
                        
                        if (gerelateerdeProcessen.length > 0) {
                          return (
                            <div className="mb-6">
                              <h4 className="font-bold text-slate-900 mb-3 text-lg flex items-center gap-2">
                                <span>⚙️</span> Gerelateerde Processen ({gerelateerdeProcessen.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {gerelateerdeProcessen.map(proces => (
                                  <div
                                    key={proces.id}
                                    onClick={() => { setSelectedFunctie(null); setSelectedProces(proces); }}
                                    className="p-3 bg-gradient-to-r from-blue-50 to-white border-2 border-blue-200 rounded-lg cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
                                  >
                                    <h5 className="font-bold text-sm text-slate-900">{proces.naam}</h5>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{proces.beschrijving}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xs text-gray-500">⚠️ {proces.risicos?.length || 0} risico's</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
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
                       <h4 className="font-bold text-slate-900 mb-4 text-lg flex items-center gap-2">
                         <span>⚠️</span> Risico's ({selectedFunctie.risicos?.length || 0})
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
                             {selectedFunctie.risicos
                               ?.map((item, idx) => {
                                 const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                 if (!risico) return null;
                                 const blootstelling = item.blootstelling || 3;
                                 const kans = convertKansToFineKinney(risico.kans);
                                 const effect = convertEffectToFineKinney(risico.effect);
                                 const risicogetal = blootstelling * kans * effect;
                                 const prioriteitNiveau = risicogetal >= 400 ? 1 : risicogetal >= 200 ? 2 : risicogetal >= 100 ? 3 : risicogetal >= 50 ? 4 : 5;
                                 return { item, risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau, idx };
                               })
                               .filter(Boolean)
                               .sort((a, b) => (a?.prioriteitNiveau || 5) - (b?.prioriteitNiveau || 5))
                               .map((data) => {
                                 if (!data) return null;
                                 const { risico, blootstelling, kans, effect, risicogetal, prioriteitNiveau } = data;
                                 const categorieColors = {
                                   'fysiek': 'bg-blue-100 text-blue-700',
                                   'psychisch': 'bg-purple-100 text-purple-700',
                                   'overige': 'bg-gray-100 text-gray-700'
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
                                       {getPrioriteitBadge(prioriteitNiveau)}
                                     </td>
                                   </tr>
                                 );
                               })}
                           </tbody>
                           <tfoot className="bg-gradient-to-r from-gray-100 to-gray-50">
                             <tr>
                               <td colSpan={6} className="px-4 py-3 text-right text-sm font-bold text-gray-900">Totaal Risicogetal:</td>
                               <td className="px-4 py-3 text-sm font-bold text-richting-orange text-lg">
                                 {selectedFunctie.risicos
                                   ?.map(item => {
                                     const risico = item.risico || organisatieProfiel.risicos.find(r => r.id === item.risicoId);
                                     if (!risico) return 0;
                                     const blootstelling = item.blootstelling || 3;
                                     const kans = convertKansToFineKinney(risico.kans);
                                     const effect = convertEffectToFineKinney(risico.effect);
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
      const custs = await customerService.getCustomersForUser(user.id, user.role);
      const users = await customerService.getAllUsers();
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
      const functionsUrl = 'https://europe-west4-richting-sales-d764a.cloudfunctions.net/searchCompanyWebsite';
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
      employeeCount: undefined,
      hasRIE: undefined
    };

    await customerService.addCustomer(newCustomer);
    setCustomers(prev => [...prev, newCustomer]);
    setShowAddModal(false);
    
    // Reset all form state
    setNewName('');
    setNewWebsite('');
    setWebsiteResults([]);
    setSelectedWebsite('');
    setHasSearched(false);
  };

  const toggleUserAssignment = (userId: string) => {
    setAssignedIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
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
      setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
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
              <div key={cust.id} onClick={() => setSelectedCustomer(cust)} className={`bg-white rounded-xl shadow-sm border transition-all cursor-pointer group relative p-6 hover:shadow-md ${isSelected ? 'border-richting-orange ring-1 ring-richting-orange' : 'border-gray-200'} ${cust.status === 'churned' || cust.status === 'rejected' ? 'opacity-60 grayscale' : ''}`}>
                
                {/* SELECTION CHECKBOX - rechtsboven */}
                <div 
                  className="absolute top-4 right-4 z-10"
                  onClick={(e) => toggleCustomerSelection(cust.id, e)}
                >
                   <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-richting-orange border-richting-orange' : 'bg-white border-gray-300 group-hover:border-gray-400'}`}>
                      {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                   </div>
                </div>

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
                  <div className="flex flex-col items-end gap-2">
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

// --- DASHBOARD VIEW ---
interface DashboardViewProps {
  documents: DocumentSource[];
  user: User;
  setView: (view: string) => void;
  openDocument: (doc: DocumentSource) => void;
  handleDocumentAction: (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ documents, user, setView, openDocument, handleDocumentAction }) => {
  const activeDocs = useMemo(() => documents.filter(d => !d.isArchived), [documents]);
  const trending = useMemo(() => 
    [...activeDocs].sort((a, b) => ((b.likedBy || []).length * 2 + (b.viewedBy || []).length) - ((a.likedBy || []).length * 2 + (a.viewedBy || []).length)).slice(0, 5),
  [activeDocs]);
  const recent = useMemo(() => activeDocs.slice(0, 6), [activeDocs]);

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="flex flex-col md:flex-row justify-between items-end border-b-4 border-slate-900 pb-4 gap-4">
        <div>
          <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">HET LAATSTE NIEUWS</h2>
          <p className="text-gray-500 mt-1">{new Date().toLocaleDateString('nl-NL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="text-xs font-bold text-richting-orange uppercase">Kennisbank Editie</p>
          <p className="text-xs text-gray-400">{documents.length} artikelen beschikbaar</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {recent.length > 0 ? (
            <article className="group cursor-pointer" onClick={() => openDocument(recent[0])}>
              <div className="relative h-64 w-full bg-slate-800 rounded-lg overflow-hidden mb-4 shadow-md transition-shadow group-hover:shadow-lg">
                <div className="absolute inset-0 bg-gradient-to-tr from-richting-dark to-gray-600 opacity-90"></div>
                <div className="absolute bottom-0 left-0 p-6 w-full">
                  <span className="bg-richting-orange text-white text-[10px] font-bold px-2 py-1 uppercase mb-2 inline-block rounded-sm">
                    {getCategoryLabel(recent[0].mainCategoryId)}
                  </span>
                  <h3 className="text-3xl font-bold text-white leading-tight group-hover:underline decoration-richting-orange underline-offset-4">
                    {recent[0].title}
                  </h3>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2">
                  <p className="text-lg text-slate-700 leading-relaxed font-serif">
                    <span className="text-3xl float-left mr-2 font-bold text-richting-orange leading-none h-8">"</span>
                    {recent[0].summary}
                  </p>
                </div>
                  <div className="flex flex-col justify-end text-sm text-gray-500 border-l border-gray-200 pl-4">
                    <div className="mb-2"><span className="font-semibold text-slate-900">Rubriek:</span> {getCategoryLabel(recent[0].mainCategoryId, recent[0].subCategoryId)}</div>
                    <div><span className="font-semibold text-slate-900">Datum:</span> {new Date(recent[0].uploadedAt).toLocaleDateString()}</div>
                  </div>
              </div>
            </article>
          ) : (
            <div className="text-gray-500 text-center py-20 bg-gray-50 rounded-lg border-2 border-dashed flex flex-col items-center">
              <p className="mb-4">Geen nieuws artikelen gevonden.</p>
              <button onClick={() => setView('upload')} className="text-richting-orange font-bold hover:underline">Voeg het eerste artikel toe</button>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-12 border-t border-gray-200 pt-8">
            {recent.slice(1).map(doc => (
              <article key={doc.id} className="flex flex-col h-full group">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-bold text-richting-orange uppercase tracking-wider">{getCategoryLabel(doc.mainCategoryId)}</span>
                    <span className="text-gray-300 text-[10px]">|</span>
                    <span className="text-[10px] text-gray-500 uppercase">{getCategoryLabel(doc.mainCategoryId, doc.subCategoryId)}</span>
                  </div>
                  <h4 onClick={() => openDocument(doc)} className="text-xl font-bold text-slate-900 mb-2 group-hover:text-richting-orange cursor-pointer line-clamp-2 leading-tight">
                    {doc.title}
                  </h4>
                  <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3 leading-relaxed">{doc.summary}</p>
                  
                  <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-100">
                     <div className="flex items-center text-xs text-gray-400 gap-4">
                        <span className="flex items-center gap-1"><EyeIcon/> {(doc.viewedBy || []).length}</span>
                        <span className="flex items-center gap-1"><HeartIcon filled={(doc.likedBy || []).includes(user.id)} /> {(doc.likedBy || []).length}</span>
                     </div>
                     <button onClick={() => openDocument(doc)} className="text-xs font-bold text-richting-orange hover:text-slate-900 transition-colors uppercase tracking-wide">Lees meer</button>
                  </div>
              </article>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-gray-100 p-6 rounded-lg">
             <h3 className="font-bold text-slate-900 mb-4 border-b border-gray-300 pb-2 uppercase tracking-wide text-sm">Meest Gewaardeerd</h3>
             <ul className="space-y-4">
                {trending.length > 0 ? trending.map((doc, idx) => (
                  <li key={doc.id} className="flex gap-4 group cursor-pointer" onClick={() => openDocument(doc)}>
                    <span className="text-3xl font-black text-gray-300 group-hover:text-richting-orange transition-colors">{idx + 1}</span>
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-richting-orange transition-colors">{doc.title}</h5>
                      <p className="text-xs text-gray-500 mt-1">{(doc.likedBy || []).length} likes</p>
                    </div>
                  </li>
                )) : <p className="text-xs text-gray-400">Nog geen beoordelingen.</p>}
             </ul>
          </div>

          <div className="bg-richting-orange text-white p-6 rounded-lg">
            <h3 className="font-bold mb-2">Heb je kennis om te delen?</h3>
            <p className="text-sm opacity-90 mb-4">Help je collega's en voeg waardevolle documenten toe aan de kennisbank.</p>
            <button onClick={() => setView('upload')} className="w-full bg-white text-richting-orange font-bold py-2 rounded shadow-sm hover:bg-gray-50 transition-colors text-sm uppercase">Nieuwe Bron Toevoegen</button>
          </div>
        </aside>
      </div>
    </div>
  );
};

const KnowledgeView = ({ documents, openDocument }: { documents: DocumentSource[], openDocument: (d: DocumentSource) => void }) => {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');

  const filtered = useMemo(() => {
    return documents.filter(d => {
      if (d.isArchived) return false;
      const matchesSearch = d.title.toLowerCase().includes(search.toLowerCase()) || d.summary.toLowerCase().includes(search.toLowerCase());
      const matchesCat = filterCat === 'all' || d.mainCategoryId === filterCat;
      return matchesSearch && matchesCat;
    });
  }, [documents, search, filterCat]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <input 
          type="text" 
          placeholder="Zoek in kennisbank..." 
          className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-richting-orange focus:border-richting-orange"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select 
          className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-md bg-white focus:ring-richting-orange focus:border-richting-orange"
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
        >
          <option value="all">Alle Categorieën</option>
          {KNOWLEDGE_STRUCTURE.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titel & Samenvatting</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categorie</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actie</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filtered.map(doc => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-richting-orange font-bold text-xs">
                      {doc.type}
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 cursor-pointer hover:text-richting-orange" onClick={() => openDocument(doc)}>{doc.title}</div>
                      <div className="text-sm text-gray-500 line-clamp-1">{doc.summary}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                    {getCategoryLabel(doc.mainCategoryId)}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => openDocument(doc)} className="text-richting-orange hover:text-orange-900">Bekijk</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
               <tr><td colSpan={4} className="px-6 py-10 text-center text-gray-500">Geen documenten gevonden.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ChatView = ({ user, documents }: { user: User, documents: DocumentSource[] }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: `Hoi ${user.name.split(' ')[0]}, ik ben de AI assistent van Richting. Waarmee kan ik je helpen?` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    const result = await askQuestion(input, documents);
    
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: result.answer,
      citations: result.citedIds
    }]);
    setLoading(false);
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-richting-orange text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'}`}>
              <p className="whitespace-pre-wrap text-sm">{msg.text}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-2xl rounded-tl-none px-4 py-3 border border-gray-100 flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
             </div>
          </div>
        )}
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:ring-2 focus:ring-richting-orange focus:border-transparent outline-none"
            placeholder="Stel je vraag over interne documenten..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-richting-orange text-white rounded-full p-2 hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};

const UploadView = ({ user, onUploadComplete }: { user: User, onUploadComplete: () => void }) => {
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

// --- SETTINGS VIEW ---
// --- REGIO VIEW ---
const RegioView = ({ user }: { user: User }) => {
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [selectedRegio, setSelectedRegio] = useState<string | null>(null);
  const [selectedVestiging, setSelectedVestiging] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLinkingLocations, setIsLinkingLocations] = useState(false);

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
        let linkedCount = 0;
        
        for (const loc of allCustomerLocations) {
          if (!loc.richtingLocatieId && loc.city) {
            // Gebruik de verbeterde findNearestRichtingLocation functie
            const matchingLocatie = await findNearestRichtingLocation(loc, locaties);
            
            if (matchingLocatie) {
              const updatedLoc: Location = {
                ...loc,
                richtingLocatieId: matchingLocatie.id,
                richtingLocatieNaam: matchingLocatie.vestiging
              };
              // Update in Firestore
              await customerService.addLocation(updatedLoc);
              updatedLocations.push(updatedLoc);
              linkedCount++;
            } else {
              updatedLocations.push(loc);
            }
          } else {
            updatedLocations.push(loc);
          }
        }
        
        if (linkedCount > 0) {
          console.log(`✅ Automatisch ${linkedCount} locaties gekoppeld aan Richting vestigingen`);
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

  // Bereken medewerkers per regio (gebruik locatie-specifieke aantallen)
  // Belangrijk: tel elke locatie maar één keer mee per regio
  const medewerkersPerRegio = useMemo(() => {
    const totals: Record<string, number> = {};
    
    Object.keys(klantenPerRegio).forEach(regio => {
      const processedLocationIds = new Set<string>(); // Track welke locaties al zijn geteld in deze regio
      const processedCustomerIds = new Set<string>(); // Track welke klanten al zijn geteld (voor fallback)
      
      const total = klantenPerRegio[regio].reduce((sum, item) => {
        // Elke locatie mag maar één keer worden geteld per regio
        if (processedLocationIds.has(item.location.id)) {
          return sum;
        }
        processedLocationIds.add(item.location.id);
        
        // Gebruik locatie-specifiek aantal als beschikbaar
        if (item.location.employeeCount !== undefined && item.location.employeeCount !== null) {
          return sum + item.location.employeeCount;
        }
        
        // Als locatie geen aantal heeft, gebruik klant totaal (maar alleen één keer per klant in deze regio)
        if (!processedCustomerIds.has(item.customer.id)) {
          processedCustomerIds.add(item.customer.id);
          return sum + (item.customer.employeeCount || 0);
        }
        
        // Deze locatie heeft geen aantal en de klant is al geteld, tel 0
        return sum;
      }, 0);
      totals[regio] = total;
    });
    
    // Debug per regio
    console.log('Medewerkers per regio:', totals);
    
    return totals;
  }, [klantenPerRegio]);

  // Bereken medewerkers per vestiging (gebruik locatie-specifieke aantallen)
  const medewerkersPerVestiging = useMemo(() => {
    if (!selectedRegio) return {};
    const totals: Record<string, number> = {};
    klantenPerRegio[selectedRegio]?.forEach(item => {
      if (!totals[item.vestiging]) {
        totals[item.vestiging] = 0;
      }
      
      // Gebruik locatie-specifiek aantal als beschikbaar
      if (item.location.employeeCount !== undefined && item.location.employeeCount !== null) {
        totals[item.vestiging] += item.location.employeeCount;
      } else {
        // Als locatie geen aantal heeft, gebruik klant totaal (maar alleen één keer per klant per vestiging)
        const isFirstLocationForCustomer = klantenPerRegio[selectedRegio]?.findIndex(
          i => i.customer.id === item.customer.id && 
               i.vestiging === item.vestiging && 
               i.location.id === item.location.id
        ) === klantenPerRegio[selectedRegio]?.findIndex(
          i => i.customer.id === item.customer.id && i.vestiging === item.vestiging
        );
        
        if (isFirstLocationForCustomer) {
          totals[item.vestiging] += (item.customer.employeeCount || 0);
        }
      }
    });
    return totals;
  }, [selectedRegio, klantenPerRegio]);

  // Filter klanten op basis van geselecteerde regio/vestiging
  // Unieke klanten (om duplicaten te voorkomen)
  const filteredKlanten = useMemo(() => {
    if (!selectedRegio) return [];
    let filtered = klantenPerRegio[selectedRegio] || [];
    if (selectedVestiging) {
      filtered = filtered.filter(item => item.vestiging === selectedVestiging);
    }
    // Unieke klanten op basis van customer ID
    const uniqueCustomers = new Map<string, { customer: Customer, location: Location }>();
    filtered.forEach(item => {
      if (!uniqueCustomers.has(item.customer.id)) {
        uniqueCustomers.set(item.customer.id, { customer: item.customer, location: item.location });
      }
    });
    return Array.from(uniqueCustomers.values());
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
      let linkedCount = 0;
      
      for (const loc of allLocations) {
        if (!loc.richtingLocatieId && loc.city) {
          // Verbeterde matching logica (zelfde als in useEffect)
          const matchingLocatie = richtingLocaties.find(rl => {
            const cityLower = loc.city.toLowerCase().trim();
            const vestigingLower = rl.vestiging.toLowerCase().trim();
            const adresLower = rl.volledigAdres.toLowerCase();
            
            // Exacte match op stad naam
            if (cityLower === vestigingLower) return true;
            
            // Stad naam bevat vestiging naam of vice versa
            if (cityLower.includes(vestigingLower) || vestigingLower.includes(cityLower)) return true;
            
            // Stad naam in adres
            if (adresLower.includes(cityLower)) return true;
            
            // Vestiging naam in adres van locatie (als beschikbaar)
            if (loc.address && loc.address.toLowerCase().includes(vestigingLower)) return true;
            
            // Speciale gevallen
            const specialCases: Record<string, string[]> = {
              'den haag': ['s-gravenhage', 'gravenhage'],
              'den bosch': ['s-hertogenbosch', 'hertogenbosch', "'s-hertogenbosch"],
              'capelle aan den ijssel': ['capelle'],
              'capelle a/d ijssel': ['capelle']
            };
            
            for (const [key, aliases] of Object.entries(specialCases)) {
              if (cityLower.includes(key) || key.includes(cityLower)) {
                if (aliases.some(alias => vestigingLower.includes(alias) || adresLower.includes(alias))) {
                  return true;
                }
              }
            }
            
            return false;
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
            linkedCount++;
          } else {
            updatedLocations.push(loc);
          }
        } else {
          updatedLocations.push(loc);
        }
      }
      
      setAllLocations(updatedLocations);
      alert(`✅ ${linkedCount} locaties gekoppeld aan Richting vestigingen.`);
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
  const somVanRegios = Object.values(medewerkersPerRegio).reduce((sum, val) => sum + val, 0);
  console.log('RegioView Debug:', {
    richtingLocaties: richtingLocaties.length,
    customers: customers.length,
    allLocations: allLocations.length,
    locationsWithRichtingId: allLocations.filter(l => l.richtingLocatieId).length,
    klantenPerRegio: Object.keys(klantenPerRegio).length,
    locatiesPerRegio: Object.keys(locatiesPerRegio).length,
    medewerkersPerRegio,
    somVanRegios
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-900">Regio & Sales Overzicht</h2>
        {user.role === UserRole.ADMIN && (
          <button
            onClick={handleRelinkAllLocations}
            disabled={isLinkingLocations}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50 transition-colors text-sm"
          >
            {isLinkingLocations ? '⏳ Koppelen...' : '🔗 Koppel Alle Locaties'}
          </button>
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
                  // Eenvoudigere en correctere logica: tel alle medewerkers per klant
                  // Voor elke klant: tel locatie-specifieke aantallen, of gebruik customer.employeeCount als fallback
                  const total = customers.reduce((sum, customer) => {
                    const customerLocations = allLocations.filter(loc => loc.customerId === customer.id);
                    
                    // Als klant locaties heeft
                    if (customerLocations.length > 0) {
                      // Tel alle locaties met employeeCount
                      const totalFromLocations = customerLocations.reduce((locSum, loc) => {
                        if (loc.employeeCount !== undefined && loc.employeeCount !== null) {
                          return locSum + loc.employeeCount;
                        }
                        return locSum;
                      }, 0);
                      
                      // Als er locaties zijn zonder employeeCount, gebruik customer.employeeCount als fallback
                      // Maar alleen als er geen locaties met employeeCount zijn (om dubbele telling te voorkomen)
                      const hasLocationsWithCount = customerLocations.some(
                        loc => loc.employeeCount !== undefined && loc.employeeCount !== null
                      );
                      
                      if (hasLocationsWithCount) {
                        // Gebruik alleen locatie-specifieke aantallen
                        return sum + totalFromLocations;
                      } else {
                        // Geen locaties met aantallen, gebruik customer.employeeCount
                        return sum + (customer.employeeCount || 0);
                      }
                    } else {
                      // Klant heeft geen locaties, gebruik customer.employeeCount
                      return sum + (customer.employeeCount || 0);
                    }
                  }, 0);
                  
                  // Debug: log de berekening
                  const totalFromRegios = Object.values(medewerkersPerRegio).reduce((s, val) => s + val, 0);
                  console.log('Totaal Medewerkers berekening:', {
                    total,
                    totalFromRegios,
                    verschil: total - totalFromRegios,
                    allLocationsCount: allLocations.length,
                    locationsWithRichtingId: allLocations.filter(l => l.richtingLocatieId).length,
                    locationsWithoutRichtingId: allLocations.filter(l => !l.richtingLocatieId).length,
                    customersCount: customers.length
                  });
                  
                  return total.toLocaleString('nl-NL');
                })()}
              </p>
              <p className="text-xs text-gray-500 mt-1">Gebaseerd op locatie-specifieke aantallen</p>
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
              {filteredKlanten.map(({ customer, location }) => {
                // Try multiple logo sources
                const logoSrc = customer.logoUrl || getCompanyLogoUrl(customer.website) || (customer.website ? `https://wsrv.nl/?url=${ensureUrl(customer.website)}&w=128&output=png` : null);
                const employeeCount = location?.employeeCount || customer.employeeCount;
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
                        {location && (
                          <p className="text-xs text-gray-400 italic">{location.name}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase flex-shrink-0 ${
                        customer.status === 'active' ? 'bg-green-100 text-green-700' : 
                        customer.status === 'prospect' ? 'bg-blue-100 text-blue-700' : 
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {customer.status === 'active' ? 'Actief' : customer.status === 'prospect' ? 'Prospect' : customer.status}
                      </span>
                    </div>
                    {employeeCount && (
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200">
                        <span className="font-bold text-richting-orange">{employeeCount.toLocaleString('nl-NL')}</span>
                        <span>medewerkers{location?.employeeCount ? ` (${location.name})` : ''}</span>
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

const SettingsView = ({ user }: { user: User }) => {
  const [activeTab, setActiveTab] = useState<'autorisatie' | 'promptbeheer' | 'databeheer'>('autorisatie');
  const [users, setUsers] = useState<User[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [promptContent, setPromptContent] = useState('');
  const [promptName, setPromptName] = useState('');
  const [promptType, setPromptType] = useState<'branche_analyse' | 'publiek_cultuur_profiel' | 'other'>('branche_analyse');
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [seedingLocaties, setSeedingLocaties] = useState(false);
  const [richtingLocaties, setRichtingLocaties] = useState<RichtingLocatie[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [usersData, promptsData, locatiesData] = await Promise.all([
          authService.getAllUsers(),
          promptService.getPrompts(),
          richtingLocatiesService.getAllLocaties()
        ]);
        setUsers(usersData);
        setPrompts(promptsData);
        setRichtingLocaties(locatiesData);
      } catch (error) {
        console.error("Error loading settings data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleSeedRichtingLocaties = async () => {
    if (!window.confirm('Weet je zeker dat je de Richting locaties wilt seeden? Dit voegt 23 locaties toe aan Firestore.')) {
      return;
    }

    setSeedingLocaties(true);
    try {
      await richtingLocatiesService.seedLocaties();
      const updatedLocaties = await richtingLocatiesService.getAllLocaties();
      setRichtingLocaties(updatedLocaties);
      alert(`✅ Succesvol! ${updatedLocaties.length} Richting locaties zijn toegevoegd.`);
    } catch (error: any) {
      console.error("Error seeding richting locaties:", error);
      if (error.message?.includes('already exists') || error.code === 'already-exists') {
        alert('⚠️ Locaties bestaan al. Als je opnieuw wilt seeden, verwijder eerst de collection in Firebase Console.');
      } else {
        alert(`❌ Fout bij seeden: ${error.message || 'Onbekende fout'}`);
      }
    } finally {
      setSeedingLocaties(false);
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

  const handleActivatePrompt = async (promptId: string, type: 'branche_analyse' | 'publiek_cultuur_profiel') => {
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, promptId: string) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        await promptService.addFileToPrompt(promptId, file.name, content);
        const updatedPrompts = await promptService.getPrompts();
        setPrompts(updatedPrompts);
        setUploadingFile(false);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Fout bij het uploaden van het bestand.");
      setUploadingFile(false);
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
    setPromptType('branche_analyse');
    setShowPromptEditor(true);
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
        setShowPromptEditor(false);
        setSelectedPrompt(null);
        setPromptName('');
        setPromptContent('');
      }
      alert('Prompt verwijderd!');
    } catch (error) {
      console.error("Error deleting prompt:", error);
      alert("Fout bij het verwijderen van de prompt. Probeer het opnieuw.");
    }
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
      </div>

      {/* Autorisatie Tab */}
      {activeTab === 'autorisatie' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4">Gebruikersbeheer</h3>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-4">
                  <img src={u.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}`} alt={u.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promptbeheer Tab */}
      {activeTab === 'promptbeheer' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-slate-900">Prompts</h3>
            {user.role === UserRole.ADMIN && (
              <button
                onClick={handleNewPrompt}
                className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 transition-colors"
              >
                + Nieuwe Prompt
              </button>
            )}
          </div>
          {user.role !== UserRole.ADMIN && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Alleen administrators kunnen prompts bewerken, activeren of verwijderen.
              </p>
            </div>
          )}

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
                    disabled={user.role !== UserRole.ADMIN}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Bijv. Publiek Organisatie Profiel Prompt"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={promptType}
                    onChange={(e) => setPromptType(e.target.value as any)}
                    disabled={user.role !== UserRole.ADMIN}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="branche_analyse">Publiek Organisatie Profiel</option>
                    <option value="publiek_cultuur_profiel">Publiek Cultuur Profiel</option>
                    <option value="other">Anders</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inhoud (promptTekst)</label>
                  <textarea
                    value={promptContent}
                    onChange={(e) => setPromptContent(e.target.value)}
                    rows={15}
                    disabled={user.role !== UserRole.ADMIN}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-richting-orange focus:border-richting-orange font-mono text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Voer de prompt inhoud in..."
                  />
                </div>
                {selectedPrompt && user.role === UserRole.ADMIN && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isActief"
                      checked={selectedPrompt.isActief || false}
                      onChange={async (e) => {
                        if (selectedPrompt && (selectedPrompt.type === 'branche_analyse' || selectedPrompt.type === 'publiek_cultuur_profiel')) {
                          if (e.target.checked) {
                            await handleActivatePrompt(selectedPrompt.id, selectedPrompt.type as 'branche_analyse' | 'publiek_cultuur_profiel');
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
                      Actief (alleen voor Publiek Organisatie Profiel / Publiek Cultuur Profiel)
                    </label>
                  </div>
                )}
                {selectedPrompt && selectedPrompt.files && selectedPrompt.files.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Bijgevoegde Bestanden</label>
                    <div className="space-y-2">
                      {selectedPrompt.files.map(file => (
                        <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                          <span className="text-sm text-gray-700">{file.name}</span>
                          {user.role === UserRole.ADMIN && (
                            <button
                              onClick={async () => {
                                if (selectedPrompt) {
                                  await promptService.deleteFileFromPrompt(selectedPrompt.id, file.id);
                                  const updated = await promptService.getPrompt(selectedPrompt.id);
                                  if (updated) setSelectedPrompt(updated);
                                  const allPrompts = await promptService.getPrompts();
                                  setPrompts(allPrompts);
                                }
                              }}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Verwijderen
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {selectedPrompt && user.role === UserRole.ADMIN && (
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
                {user.role === UserRole.ADMIN && (
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
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Group prompts by type */}
              {['branche_analyse', 'publiek_cultuur_profiel', 'other'].map(type => {
                const typePrompts = prompts.filter(p => p.type === type);
                if (typePrompts.length === 0) return null;

                return (
                  <div key={type} className="space-y-4">
                    <h4 className="text-md font-bold text-slate-700 uppercase tracking-wide">
                      {type === 'branche_analyse' ? 'Publiek Organisatie Profiel' : type === 'publiek_cultuur_profiel' ? 'Publiek Cultuur Profiel' : 'Andere Prompts'}
                    </h4>
                    {typePrompts
                      .sort((a, b) => (b.versie || 0) - (a.versie || 0))
                      .map(prompt => (
                        <div key={prompt.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
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
                            {user.role === UserRole.ADMIN && (
                              <div className="flex gap-2">
                                {(prompt.type === 'branche_analyse' || prompt.type === 'publiek_cultuur_profiel') && !prompt.isActief && (
                                  <button
                                    onClick={() => handleActivatePrompt(prompt.id, prompt.type as 'branche_analyse' | 'publiek_cultuur_profiel')}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-colors"
                                  >
                                    Activeer
                                  </button>
                                )}
                                <button
                                  onClick={() => handleEditPrompt(prompt)}
                                  className="text-richting-orange hover:text-orange-600 font-bold text-sm px-3 py-1.5"
                                >
                                  Bewerken
                                </button>
                                <button
                                  onClick={() => handleDeletePrompt(prompt.id)}
                                  className="text-red-500 hover:text-red-700 font-bold text-sm px-3 py-1.5"
                                >
                                  Verwijderen
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="bg-gray-50 p-4 rounded border border-gray-200">
                            <p className="text-sm text-gray-700 font-mono whitespace-pre-wrap line-clamp-3">
                              {prompt.promptTekst?.substring(0, 300) || ''}...
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
              {prompts.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-white rounded-xl border border-gray-200">
                  <p>Nog geen prompts. Maak je eerste prompt aan.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Data Beheer Tab */}
      {activeTab === 'databeheer' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Richting Locaties</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <p className="font-bold text-slate-900">Richting Locaties Database</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {richtingLocaties.length > 0 
                      ? `${richtingLocaties.length} locaties geladen` 
                      : 'Nog geen locaties in database'}
                  </p>
                </div>
                <button
                  onClick={handleSeedRichtingLocaties}
                  disabled={seedingLocaties}
                  className="bg-richting-orange text-white px-4 py-2 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {seedingLocaties ? (
                    <>
                      <span className="animate-spin">⏳</span> Seeden...
                    </>
                  ) : (
                    <>
                      🌱 Seed Richting Locaties
                    </>
                  )}
                </button>
              </div>

              {richtingLocaties.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold text-slate-900 mb-3">Geladen Locaties ({richtingLocaties.length})</h4>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {richtingLocaties.map(loc => (
                      <div key={loc.id} className="p-3 bg-gray-50 rounded border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{loc.vestiging}</p>
                            <p className="text-xs text-gray-600 mt-1">{loc.regio}</p>
                            <p className="text-xs text-gray-500 mt-1">{loc.volledigAdres}</p>
                          </div>
                          <div className="text-xs text-gray-400 ml-4">
                            {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APP COMPONENT ---
const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState('dashboard');
  const [documents, setDocuments] = useState<DocumentSource[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentSource | null>(null);
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');
  const [dbError, setDbError] = useState(false);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
      // Reset errors on successful login
      if (u) {
          setAuthError('');
          setDbError(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadDocs = async () => {
      if (user) {
        try {
          const docs = await dbService.getDocuments();
          setDocuments(docs);
          
          // Seed if empty
          if (docs.length === 0) {
             await dbService.seed();
             const seeded = await dbService.getDocuments();
             setDocuments(seeded);
          }
        } catch (error: any) {
          console.error("Failed to load docs:", error);
          if (error.message === 'FIREBASE_DB_NOT_FOUND') {
            setDbError(true);
          }
        }
      }
    };
    loadDocs();
  }, [user, currentView]);

  const handleLogin = async (email: string, pass: string) => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.login(email, pass);
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.loginWithGoogle();
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleRegister = async (email: string, name: string, pass: string) => {
    setLoading(true);
    setAuthError('');
    try {
      await authService.register(email, name, pass);
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
      setLoading(false);
    }
  };

  const handleForgot = async (email: string) => {
    setLoading(true);
    try {
      await authService.resetPassword(email);
      setAuthSuccess('Herstel email verzonden!');
    } catch (e: any) {
      setAuthError(getFriendlyErrorMessage(e.code));
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = async (docId: string, action: 'view' | 'like' | 'archive', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) return;
    
    // Optimistic UI update
    setDocuments(prev => prev.map(d => {
      if (d.id !== docId) return d;
      // SAFEGUARD: Ensure arrays exist
      const viewed = d.viewedBy || [];
      const liked = d.likedBy || [];

      if (action === 'view' && !viewed.includes(user.id)) return { ...d, viewedBy: [...viewed, user.id] };
      if (action === 'like') {
        const hasLiked = liked.includes(user.id);
        return { ...d, likedBy: hasLiked ? liked.filter(id => id !== user.id) : [...liked, user.id] };
      }
      if (action === 'archive') return { ...d, isArchived: !d.isArchived };
      return d;
    }));

    if (selectedDoc && selectedDoc.id === docId) {
        setSelectedDoc(prev => {
            if (!prev) return null;
            if (action === 'like') {
                const likedList = prev.likedBy || [];
                const hasLiked = likedList.includes(user.id);
                return { ...prev, likedBy: hasLiked ? likedList.filter(id => id !== user.id) : [...likedList, user.id] };
            }
            return prev;
        })
    }

    await dbService.updateDocumentStats(docId, user.id, action);
  };

  if (dbError) {
    return <DatabaseErrorView />;
  }

  if (loading && !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-richting-orange border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return (
      <AuthView 
        onLogin={handleLogin} 
        onGoogleLogin={handleGoogleLogin}
        onRegister={handleRegister} 
        onForgot={handleForgot}
        loading={loading}
        error={authError}
        success={authSuccess}
        setAuthError={setAuthError}
      />
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={() => authService.logout()} 
      currentView={currentView} 
      onNavigate={setCurrentView}
    >
      {currentView === 'dashboard' && (
        <DashboardView 
          documents={documents} 
          user={user} 
          setView={setCurrentView} 
          openDocument={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }}
          handleDocumentAction={handleDocumentAction}
        />
      )}
      {currentView === 'customers' && (
        <CustomersView user={user} onOpenDoc={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }} />
      )}
      {currentView === 'knowledge' && (
        <KnowledgeView 
          documents={documents} 
          openDocument={(d) => { handleDocumentAction(d.id, 'view'); setSelectedDoc(d); }} 
        />
      )}
      {currentView === 'chat' && <ChatView user={user} documents={documents} />}
      {currentView === 'upload' && (
        <UploadView 
           user={user} 
           onUploadComplete={() => { setCurrentView('dashboard'); }} 
        />
      )}
      {currentView === 'settings' && <SettingsView user={user} />}
      {currentView === 'regio' && <RegioView user={user} />}

      {/* DOCUMENT MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedDoc(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-4 flex justify-between items-center z-10">
              <span className="text-xs font-bold uppercase text-richting-orange tracking-widest">{getCategoryLabel(selectedDoc.mainCategoryId)}</span>
              <button onClick={() => setSelectedDoc(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-6">{selectedDoc.title}</h1>
              
              <div className="flex flex-wrap gap-4 mb-8">
                <button 
                  onClick={() => handleDocumentAction(selectedDoc.id, 'like')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${(selectedDoc.likedBy || []).includes(user.id) ? 'border-richting-orange text-richting-orange bg-orange-50' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
                >
                  <HeartIcon filled={(selectedDoc.likedBy || []).includes(user.id)} />
                  <span className="text-sm font-bold">{(selectedDoc.likedBy || []).length}</span>
                </button>
                
                {selectedDoc.originalUrl && (
                  <a 
                    href={selectedDoc.originalUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors text-sm font-bold"
                  >
                    <ExternalLinkIcon /> Open Origineel
                  </a>
                )}

                {user.role === 'ADMIN' && (
                   <button 
                     onClick={() => handleDocumentAction(selectedDoc.id, 'archive')}
                     className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors text-sm"
                   >
                     <ArchiveIcon /> {selectedDoc.isArchived ? 'Dearchiveren' : 'Archiveren'}
                   </button>
                )}
              </div>

              <div className="prose prose-slate max-w-none">
                <p className="text-lg text-slate-600 leading-relaxed font-medium border-l-4 border-richting-orange pl-4 mb-8 italic">
                  "{selectedDoc.summary}"
                </p>
                <div className="bg-gray-50 p-6 rounded-lg text-sm text-gray-800 whitespace-pre-wrap leading-relaxed font-mono">
                  {selectedDoc.content}
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-gray-100">
                 <div className="flex flex-wrap gap-2">
                    {(selectedDoc.tags || []).map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">#{tag}</span>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;