import React, { Suspense, lazy, useMemo, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import Sidebar from './components/Sidebar';
import Learn from './components/Learn';
import { useAuth } from './context/AuthContext';
import { BookOpen, Menu, ShoppingBag, Swords, Trophy, User as UserIcon, Settings, X } from 'lucide-react';
import MascotIcon from './components/branding/MascotIcon';
import type { MascotKey } from './lib/mascots';

type SectionId = 'learn' | 'duels' | 'store' | 'leaderboard' | 'profile' | 'account';

const sectionMascots: Record<SectionId, MascotKey> = {
  learn: 'learn',
  duels: 'duel',
  store: 'learn',
  leaderboard: 'leaderboard',
  profile: 'learn',
  account: 'learn',
};

const AuthContainer = lazy(() => import('./components/auth/AuthContainer'));
const Store = lazy(() => import('./components/Store'));
const RealTimeLeaderboard = lazy(() => import('./components/Leaderboard'));
const Profile = lazy(() => import('./components/Profile'));
const Account = lazy(() => import('./components/Account'));
const DuelsDashboard = lazy(() => import('./components/DuelsDashboard'));
const AuthConfirm = lazy(() => import('./components/AuthConfirm'));
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'));
const LegalDocumentPage = lazy(() => import('./components/legal/LegalDocumentPage'));

const SectionFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm font-medium text-slate-500">
    Loading...
  </div>
);

const withSuspense = (node: React.ReactNode) => (
  <Suspense fallback={<SectionFallback />}>{node}</Suspense>
);

function AppContent() {
  const [currentSection, setCurrentSection] = useState<SectionId>('learn');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  const navItems = useMemo(
    () =>
      isAuthenticated
        ? [
            { id: 'learn' as SectionId, label: 'Learn', icon: BookOpen },
            { id: 'duels' as SectionId, label: 'Duels', icon: Swords },
            { id: 'store' as SectionId, label: 'Store', icon: ShoppingBag },
            { id: 'leaderboard' as SectionId, label: 'Ranks', icon: Trophy },
            { id: 'profile' as SectionId, label: 'Profile', icon: UserIcon },
            { id: 'account' as SectionId, label: 'Account', icon: Settings },
          ]
        : [{ id: 'learn' as SectionId, label: 'Learn', icon: BookOpen }],
    [isAuthenticated]
  );
  const activeNavLabel = useMemo(
    () => navItems.find((item) => item.id === currentSection)?.label ?? 'Learn',
    [currentSection, navItems]
  );

  React.useEffect(() => {
    if (!isAuthenticated && currentSection !== 'learn') {
      setCurrentSection('learn');
      setSidebarOpen(false);
    }
  }, [currentSection, isAuthenticated]);

  const learnView = (
    <Learn
      setCurrentSection={(section) => setCurrentSection(section as SectionId)}
      openAuthModal={() => setShowAuthModal(true)}
      isAuthenticated={isAuthenticated}
    />
  );

  const renderSection = () => {
    switch (currentSection) {
      case 'duels':
        return isAuthenticated ? withSuspense(<DuelsDashboard />) : learnView;
      case 'learn':
        return learnView;
      case 'store':
        return isAuthenticated ? withSuspense(<Store />) : learnView;
      case 'leaderboard':
        return isAuthenticated
          ? withSuspense(
              <div className="p-2 sm:p-4 lg:p-6 xl:p-8">
                <RealTimeLeaderboard currentUserId={user?.id || 'guest'} />
              </div>
            )
          : learnView;
      case 'profile':
        return isAuthenticated ? withSuspense(<Profile />) : learnView;
      case 'account':
        return isAuthenticated ? withSuspense(<Account />) : learnView;
      default:
        return learnView;
    }
  };

  const handleSectionChange = (section: SectionId) => {
    if (!isAuthenticated && section !== 'learn') {
      setCurrentSection('learn');
      setSidebarOpen(false);
      setShowAuthModal(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setCurrentSection(section);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="fixed inset-x-0 top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur lg:hidden">
        <div className="flex h-16 items-center gap-3 px-4">
          <button
            onClick={() => setSidebarOpen((open) => !open)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm"
            aria-label={sidebarOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <div className="h-8 w-8 shrink-0">
                <MascotIcon mascot={sectionMascots[currentSection]} className="h-full w-full" imageClassName="drop-shadow-sm" />
              </div>
              <span className="truncate text-sm font-semibold text-slate-900">Codhak</span>
            </div>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            {activeNavLabel}
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar
        currentSection={currentSection}
        setCurrentSection={(section) => setCurrentSection(section as SectionId)}
        openAuthModal={() => setShowAuthModal(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen pt-16 pb-24 lg:ml-72 lg:min-h-screen lg:pt-0 lg:pb-0 xl:ml-80">
        <div className="min-h-screen">{renderSection()}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
        <ul className="grid gap-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleSectionChange(item.id)}
                  className={`flex w-full flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-br from-green-400 to-blue-500 text-white shadow-md'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {withSuspense(
        <AuthContainer open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Router>
          <Suspense fallback={<SectionFallback />}>
            <Routes>
              <Route path="/" element={<AppContent />} />
              <Route path="/auth/confirm" element={<AuthConfirm />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/terms" element={<LegalDocumentPage slug="terms" />} />
              <Route path="/privacy" element={<LegalDocumentPage slug="privacy" />} />
              <Route path="/refunds" element={<LegalDocumentPage slug="refunds" />} />
            </Routes>
          </Suspense>
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
