import React, { Suspense, startTransition, useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Menu, Swords, User as UserIcon, UserPlus, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Learn from './Learn';
import BenchmarkExperience from './benchmark/BenchmarkExperience';
import TeamsWorkspace from './teams/TeamsWorkspace';
import { preloadLessonsModule } from '../data/lessonsLoader';
import { lazyWithPreload } from '../lib/lazyWithPreload';

type AuthModalView = 'login' | 'signup';
type SectionId = 'benchmark' | 'practice' | 'duels' | 'teams' | 'store' | 'leaderboard' | 'profile' | 'account';

interface AppShellProps {
  openAuthModal: (view?: AuthModalView) => void;
}

const Store = lazyWithPreload(() => import('./Store'));
const RealTimeLeaderboard = lazyWithPreload(() => import('./Leaderboard'));
const Profile = lazyWithPreload(() => import('./Profile'));
const Account = lazyWithPreload(() => import('./Account'));
const DuelsDashboard = lazyWithPreload(() => import('./DuelsDashboard'));

const SectionFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm font-medium text-slate-500">
    Loading...
  </div>
);

const withSuspense = (node: React.ReactNode) => <Suspense fallback={<SectionFallback />}>{node}</Suspense>;

const defaultSection: SectionId = 'benchmark';

const isValidSection = (value: string | null): value is SectionId =>
  value === 'benchmark' ||
  value === 'practice' ||
  value === 'duels' ||
  value === 'teams' ||
  value === 'store' ||
  value === 'leaderboard' ||
  value === 'profile' ||
  value === 'account';

export default function AppShell({ openAuthModal }: AppShellProps) {
  const [searchParams] = useSearchParams();
  const [currentSection, setCurrentSection] = useState<SectionId>(defaultSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const isAuthenticated = !!user;

  useEffect(() => {
    const requestedSection = searchParams.get('section');
    if (!isValidSection(requestedSection)) return;

    const guestAllowed = requestedSection === 'benchmark' || requestedSection === 'practice' || requestedSection === 'teams';
    if (!isAuthenticated && !guestAllowed) return;

    setCurrentSection(requestedSection);
  }, [isAuthenticated, searchParams]);

  const preloadSection = (section: SectionId) => {
    if (section === 'practice') {
      preloadLessonsModule();
      return;
    }

    const sectionPreloader = {
      duels: DuelsDashboard,
      store: Store,
      leaderboard: RealTimeLeaderboard,
      profile: Profile,
      account: Account,
    }[section];

    void sectionPreloader?.preload();
  };

  useEffect(() => {
    const preloadLikelyViews = () => {
      preloadLessonsModule();
      if (isAuthenticated) {
        void DuelsDashboard.preload();
        void Store.preload();
        void RealTimeLeaderboard.preload();
        void Profile.preload();
        void Account.preload();
      }
    };

    const timeoutId = window.setTimeout(preloadLikelyViews, 150);
    return () => window.clearTimeout(timeoutId);
  }, [isAuthenticated]);

  const navItems = useMemo(
    () =>
      isAuthenticated
        ? [
            { id: 'benchmark' as SectionId, label: 'Benchmark', icon: BarChart3 },
            { id: 'practice' as SectionId, label: 'Practice', icon: BookOpen },
            { id: 'duels' as SectionId, label: 'Duels', icon: Swords },
            { id: 'teams' as SectionId, label: 'Teams', icon: Users },
            { id: 'profile' as SectionId, label: 'Profile', icon: UserIcon },
          ]
        : [
            { id: 'benchmark' as SectionId, label: 'Benchmark', icon: BarChart3 },
            { id: 'practice' as SectionId, label: 'Practice', icon: BookOpen },
            { id: 'teams' as SectionId, label: 'Teams', icon: Users },
            { id: 'signup' as const, label: 'Sign Up', icon: UserPlus },
          ],
    [isAuthenticated]
  );

  const benchmarkView = <BenchmarkExperience mode="app" openAuthModal={openAuthModal} />;

  const practiceView = (
    <Learn
      setCurrentSection={(section) => {
        if (section === 'practice' || section === 'benchmark' || section === 'duels') {
          if (section === 'practice') {
            preloadLessonsModule();
          }
          startTransition(() => setCurrentSection(section));
          setSidebarOpen(false);
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      }}
      openAuthModal={openAuthModal}
      isAuthenticated={isAuthenticated}
    />
  );

  const teamsView = <TeamsWorkspace mode={isAuthenticated ? 'app' : 'public'} />;

  const renderSection = () => {
    switch (currentSection) {
      case 'benchmark':
        return benchmarkView;
      case 'practice':
        return practiceView;
      case 'duels':
        return isAuthenticated ? withSuspense(<DuelsDashboard />) : benchmarkView;
      case 'teams':
        return teamsView;
      case 'store':
        return isAuthenticated ? withSuspense(<Store />) : benchmarkView;
      case 'leaderboard':
        return isAuthenticated
          ? withSuspense(
              <div className="p-2 sm:p-4 lg:p-6 xl:p-8">
                <RealTimeLeaderboard currentUserId={user?.id || 'guest'} />
              </div>
            )
          : benchmarkView;
      case 'profile':
        return isAuthenticated ? withSuspense(<Profile />) : benchmarkView;
      case 'account':
        return isAuthenticated ? withSuspense(<Account />) : benchmarkView;
      default:
        return benchmarkView;
    }
  };

  const handleSectionChange = (section: SectionId) => {
    preloadSection(section);

    const guestAllowed = section === 'benchmark' || section === 'practice' || section === 'teams';
    if (!isAuthenticated && !guestAllowed) {
      setCurrentSection('benchmark');
      setSidebarOpen(false);
      openAuthModal('signup');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    startTransition(() => setCurrentSection(section));
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {sidebarOpen ? <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} /> : null}

      <Sidebar
        currentSection={currentSection}
        setCurrentSection={(section) => handleSectionChange(section as SectionId)}
        openAuthModal={openAuthModal}
        preloadSection={(section) => preloadSection(section as SectionId)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="min-h-screen pb-24 lg:ml-72 lg:min-h-screen lg:pb-0 xl:ml-80">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Codhak</div>
            <div className="text-sm font-semibold text-slate-900">Developer skill workspace</div>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Open workspace navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-screen">{renderSection()}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur lg:hidden">
        <ul className="grid gap-1" style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'signup' ? false : currentSection === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => {
                    if (item.id === 'signup') {
                      openAuthModal('signup');
                      return;
                    }
                    handleSectionChange(item.id);
                  }}
                  onMouseEnter={() => {
                    if (item.id === 'signup') return;
                    preloadSection(item.id);
                  }}
                  onFocus={() => {
                    if (item.id === 'signup') return;
                    preloadSection(item.id);
                  }}
                  className={`flex w-full flex-col items-center justify-center rounded-2xl px-2 py-2 text-[11px] font-medium transition ${
                    isActive
                      ? 'bg-slate-950 text-white shadow-md'
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
    </div>
  );
}
