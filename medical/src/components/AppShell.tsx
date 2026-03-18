import React, { Suspense, startTransition, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Menu,
  Swords,
  User as UserIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Learn from './Learn';
import BenchmarkExperience from './benchmark/BenchmarkExperience';
import TeamsWorkspace from './teams/TeamsWorkspace';
import { useAuth } from '../context/AuthContext';
import { preloadLessonsModule } from '../data/lessonsLoader';
import { lazyWithPreload } from '../lib/lazyWithPreload';
import mascot from '../assets/design/mascot.png';

type AuthModalView = 'login' | 'signup';
type SectionId =
  | 'benchmark'
  | 'practice'
  | 'duels'
  | 'teams'
  | 'store'
  | 'leaderboard'
  | 'profile'
  | 'account';

interface AppShellProps {
  openAuthModal: (view?: AuthModalView) => void;
}

const Store = lazyWithPreload(() => import('./Store'));
const RealTimeLeaderboard = lazyWithPreload(() => import('./Leaderboard'));
const Profile = lazyWithPreload(() => import('./Profile'));
const Account = lazyWithPreload(() => import('./Account'));
const DuelsDashboard = lazyWithPreload(() => import('./DuelsDashboard'));

const SectionFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm font-medium text-muted-foreground">
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
          if (section === 'practice') preloadLessonsModule();
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
              <div className="p-3 sm:p-4 lg:p-8">
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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        currentSection={currentSection}
        setCurrentSection={(section) => handleSectionChange(section as SectionId)}
        openAuthModal={openAuthModal}
        preloadSection={(section) => preloadSection(section as SectionId)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {sidebarOpen ? (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      ) : null}

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <img src={mascot} alt="" className="h-6 w-6" />
            <span className="font-bold font-display text-foreground">Codhak</span>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-border bg-card p-2 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="Open workspace navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-background">
          {renderSection()}
        </main>

        <nav className="flex border-t border-border bg-card lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.id === 'signup' ? false : currentSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'signup') {
                    openAuthModal('signup');
                    return;
                  }
                  handleSectionChange(item.id);
                }}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
