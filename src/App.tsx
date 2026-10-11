import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { AuthModal } from './components/auth/AuthModal';
import { GeminiChatbot } from './components/ai/GeminiChatbot';

import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { ResumeAnalyzerPage } from './pages/ResumeAnalyzerPage';
import { JobsTrackerPage } from './pages/JobsTrackerPage';
import { InterviewPracticePage } from './pages/InterviewPracticePage';
import { DsaTrackerPage } from './pages/DsaTrackerPage';
import { SettingsPage } from './pages/SettingsPage';

function MainApp() {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState(() => {
    const p = window.location.pathname;
    const validPaths = ['/', '/dashboard', '/resume-analyzer', '/jobs', '/interviews', '/practice', '/settings'];
    return validPaths.includes(p) ? p : '/';
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Sync with browser history
  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const renderCurrentPage = () => {
    switch (currentPath) {
      case '/dashboard':
        return <DashboardPage onNavigate={navigate} onOpenAuth={() => openAuth('login')} />;
      case '/resume-analyzer':
        return <ResumeAnalyzerPage />;
      case '/jobs':
        return <JobsTrackerPage />;
      case '/interviews':
        return <InterviewPracticePage />;
      case '/practice':
        return <DsaTrackerPage />;
      case '/settings':
        return <SettingsPage />;
      case '/':
      default:
        return <LandingPage onNavigate={navigate} onOpenAuth={openAuth} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar */}
      <Navbar
        onOpenAuth={openAuth}
        onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
      />

      <div className="flex-1 flex">
        {/* Responsive Sidebar */}
        <Sidebar
          currentPath={currentPath}
          onNavigate={navigate}
          isOpenMobile={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        {/* Main Content View */}
        <main className="flex-1 min-w-0 lg:ml-64 pb-16 pt-2">
          {renderCurrentPage()}
        </main>
      </div>

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        defaultMode={authMode}
      />

      {/* Floating Gemini AI Career Coach */}
      <GeminiChatbot />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
