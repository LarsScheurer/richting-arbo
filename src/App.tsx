import React, { useState, useEffect } from 'react';
import { User, DocumentSource, KNOWLEDGE_STRUCTURE } from './types';
import { authService, dbService } from './services/firebase';
import { Layout } from './components/Layout';
import { DatabaseErrorView } from './components/DatabaseErrorView';
import { AuthView } from './components/AuthView';
import { getFriendlyErrorMessage } from './utils/helpers';
import { DocumentModal } from './components/DocumentModal';

// Feature Views
import { DashboardView } from './features/dashboard/DashboardView';
import { CustomersView } from './features/customers/CustomersView';
import { KnowledgeView } from './features/knowledge/KnowledgeView';
import { ChatView } from './features/chat/ChatView';
import { UploadView } from './features/upload/UploadView';
import { RegioView } from './features/regio/RegioView';
import { SettingsView } from './features/settings/SettingsView';

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
          knowledgeStructure={KNOWLEDGE_STRUCTURE}
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
        <DocumentModal 
          doc={selectedDoc} 
          user={user} 
          onClose={() => setSelectedDoc(null)} 
          onAction={handleDocumentAction}
        />
      )}
    </Layout>
  );
};

export default App;
