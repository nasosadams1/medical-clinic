import React, { Suspense, startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Menu,
  Swords,
  User as UserIcon,
  UserPlus,
  Users,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Learn from './Learn';
import BenchmarkExperience from './benchmark/BenchmarkExperience';
import TeamsWorkspace from './teams/TeamsWorkspace';
import { useAuth } from '../context/AuthContext';
import { usePlanEntitlements } from '../hooks/usePlanEntitlements';
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

const defaultSection: SectionId = 'practice';
const TASKBAR_STORAGE_KEY = 'codhak-taskbar-visible';

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
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentSection, setCurrentSection] = useState<SectionId>(defaultSection);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(TASKBAR_STORAGE_KEY) === '1';
  });
  const { user } = useAuth();
  const { primaryPlan } = usePlanEntitlements();
  const isAuthenticated = !!user;
  const previouslyAuthenticatedRef = useRef(isAuthenticated);
  const isGuestSection = useCallback(
    (section: SectionId) => section === 'benchmark' || section === 'practice' || section === 'teams',
    []
  );
  const syncSectionToUrl = useCallback(
    (section: SectionId, options?: { replace?: boolean }) => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('section', section);
      if (section !== 'benchmark') {
        nextParams.delete('report');
      }
      setSearchParams(nextParams, { replace: options?.replace ?? false });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(TASKBAR_STORAGE_KEY, sidebarOpen ? '1' : '0');
  }, [sidebarOpen]);

  useEffect(() => {
    if (previouslyAuthenticatedRef.current && !isAuthenticated) {
      navigate('/', { replace: true });
    }

    previouslyAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, navigate]);

  const closeSidebarOnMobile = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const requestedSection = searchParams.get('section');
    const nextSection =
      isValidSection(requestedSection) && (isAuthenticated || isGuestSection(requestedSection))
        ? requestedSection
        : defaultSection;

    if (currentSection !== nextSection) {
      setCurrentSection(nextSection);
    }

    const shouldNormalizeUrl =
      requestedSection !== nextSection || (nextSection !== 'benchmark' && searchParams.has('report'));

    if (shouldNormalizeUrl) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('section', nextSection);
      if (nextSection !== 'benchmark') {
        nextParams.delete('report');
      }
      setSearchParams(nextParams, { replace: true });
    }
  }, [currentSection, isAuthenticated, isGuestSection, searchParams, setSearchParams]);

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
            { id: 'practice' as SectionId, label: 'Practice', icon: BookOpen },
            { id: 'benchmark' as SectionId, label: 'Skill Check', icon: BarChart3 },
            { id: 'duels' as SectionId, label: 'Duels', icon: Swords },
            { id: 'teams' as SectionId, label: 'Teams', icon: Users },
            { id: 'profile' as SectionId, label: 'Profile', icon: UserIcon },
          ]
        : [
            { id: 'practice' as SectionId, label: 'Practice', icon: BookOpen },
            { id: 'benchmark' as SectionId, label: 'Skill Check', icon: BarChart3 },
            { id: 'teams' as SectionId, label: 'Teams', icon: Users },
            { id: 'signup' as const, label: 'Sign Up', icon: UserPlus },
          ],
    [isAuthenticated]
  );
  const sectionLabelMap: Record<SectionId, string> = {
    benchmark: 'Skill Check',
    practice: 'Practice',
    duels: 'Duels',
    teams: 'Teams',
    store: 'Store',
    leaderboard: 'Leaderboard',
    profile: 'Profile',
    account: 'Account',
  };

  const benchmarkView = <BenchmarkExperience mode="app" openAuthModal={openAuthModal} />;

  const practiceView = (
    <Learn
      setCurrentSection={(section) => {
        if (section === 'practice' || section === 'benchmark' || section === 'duels') {
          if (section === 'practice') preloadLessonsModule();
          startTransition(() => {
            setCurrentSection(section);
            syncSectionToUrl(section);
          });
          closeSidebarOnMobile();
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

    if (!isAuthenticated && !isGuestSection(section)) {
      setCurrentSection('benchmark');
      syncSectionToUrl('benchmark');
      closeSidebarOnMobile();
      openAuthModal('signup');
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }

    startTransition(() => {
      setCurrentSection(section);
      syncSectionToUrl(section);
    });
    closeSidebarOnMobile();
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="flex min-h-[100dvh] min-w-0 overflow-hidden bg-background text-foreground">
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

      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden transition-[padding] duration-300 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur sm:px-5 lg:px-6 xl:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((current) => !current)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
              aria-label={sidebarOpen ? 'Hide taskbar' : 'Show taskbar'}
            >
              <Menu className="h-4 w-4" />
              <span className="hidden sm:inline">{sidebarOpen ? 'Hide taskbar' : 'Show taskbar'}</span>
            </button>
            <div className="flex items-center gap-3">
              <img src={mascot} alt="" className="h-10 w-10" />
              <span className="type-brand text-lg text-foreground sm:text-xl">Codhak</span>
            </div>
          </div>
          <div className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <div className="flex items-center gap-2">
              {primaryPlan ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold tracking-[0.18em] text-primary">
                  {primaryPlan.planName}
                </span>
              ) : null}
              <span>{sectionLabelMap[currentSection]}</span>
            </div>
          </div>
        </header>

        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-background">
          <div className="flex min-h-full min-w-0 flex-1 flex-col">
            {renderSection()}
          </div>
        </main>

        <nav className="flex shrink-0 border-t border-border bg-card lg:hidden">
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
