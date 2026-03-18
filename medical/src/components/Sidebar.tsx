import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, BookOpen, Clock, Heart, Loader2, LogOut, Settings, ShoppingBag, Swords, Trophy, User as UserIcon, Users, X, Zap } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { avatars } from '../data/avatars';
import MascotIcon from './branding/MascotIcon';

interface SidebarProps {
  currentSection: string;
  setCurrentSection: (section: string) => void;
  openAuthModal: (view?: 'login' | 'signup') => void;
  preloadSection?: (section: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const primaryNavItems = [
  { id: 'benchmark', label: 'Benchmark', icon: BarChart3 },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'duels', label: 'Duels', icon: Swords },
  { id: 'teams', label: 'Teams', icon: Users },
];

const secondaryNavItems = [
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'profile', label: 'Profile', icon: UserIcon },
  { id: 'account', label: 'Account', icon: Settings },
  { id: 'store', label: 'Store', icon: ShoppingBag },
];

const guestNavItems = [
  { id: 'benchmark', label: 'Benchmark', icon: BarChart3 },
  { id: 'practice', label: 'Practice', icon: BookOpen },
  { id: 'teams', label: 'Teams', icon: Users },
];

const formatTimeRemaining = (expiresAt: number, currentTime: number) => {
  const remaining = Math.max(0, expiresAt - currentTime);
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
};

export default function Sidebar({
  currentSection,
  setCurrentSection,
  openAuthModal,
  preloadSection,
  isOpen = true,
  onClose,
}: SidebarProps) {
  const { user: authUser, signOut } = useAuth();
  const { user, resetHeartsIfNeeded, getActiveBoosts } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    if (authUser && resetHeartsIfNeeded) {
      void resetHeartsIfNeeded();
    }
  }, [authUser, resetHeartsIfNeeded]);

  const currentAvatar = authUser && user ? (avatars.find((avatar) => avatar.id === user.currentAvatar) || avatars[0]) : null;
  const activeBoosts = authUser && user ? getActiveBoosts() : {};
  const xpBoostExpiresAt = activeBoosts.xpBoost?.expiresAt ?? null;
  const unlimitedHeartsExpiresAt = activeBoosts.unlimitedHearts?.expiresAt ?? null;

  useEffect(() => {
    if (!xpBoostExpiresAt && !unlimitedHeartsExpiresAt) return;

    const tick = () => setCurrentTime(Date.now());
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [unlimitedHeartsExpiresAt, xpBoostExpiresAt]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      setCurrentSection('benchmark');
      await signOut();
      onClose?.();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  const practiceStats = useMemo(
    () => [
      { label: 'Lessons completed', value: user.totalLessonsCompleted },
      { label: 'XP', value: user.xp },
      { label: 'Level', value: user.level },
    ],
    [user.level, user.totalLessonsCompleted, user.xp]
  );

  const renderNavButton = (item: { id: string; label: string; icon: React.ComponentType<any> }, quiet = false) => {
    const Icon = item.icon;
    const isActive = currentSection === item.id;

    return (
      <li key={item.id}>
        <button
          onClick={() => {
            setCurrentSection(item.id);
            onClose?.();
          }}
          onMouseEnter={() => preloadSection?.(item.id)}
          onFocus={() => preloadSection?.(item.id)}
          className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
            isActive
              ? 'bg-slate-950 text-white shadow-md'
              : quiet
              ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Icon className={`h-5 w-5 ${isActive ? 'text-white' : quiet ? 'text-slate-400' : 'text-slate-500'}`} />
          <span className="font-medium">{item.label}</span>
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full w-[18rem] flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:w-72 xl:w-80 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 pb-4 pt-4 backdrop-blur lg:px-6 lg:pb-6 lg:pt-6">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Codhak</div>
              <div className="text-sm font-semibold text-slate-900">Workspace</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4 lg:mb-6">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center lg:h-[4.5rem] lg:w-[4.5rem]">
              <MascotIcon mascot="learn" className="h-full w-full" imageClassName="drop-shadow-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-slate-900">Codhak</h1>
              <p className="mt-1 text-sm text-slate-500">Benchmark, practice, duel, and coach.</p>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
            {authUser && user ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-2xl text-white shadow-sm">
                    {currentAvatar?.emoji || '\u{1F464}'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">Skill workspace</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-slate-600">
                  {practiceStats.map((stat) => (
                    <div key={stat.label} className="rounded-2xl bg-white px-3 py-3 shadow-sm">
                      <div className="text-[11px] uppercase tracking-wide text-slate-400">{stat.label}</div>
                      <div className="mt-1 font-semibold text-slate-900">{stat.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl bg-white px-3 py-3 shadow-sm">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <Heart className={`h-3.5 w-3.5 ${activeBoosts.unlimitedHearts ? 'fill-current text-pink-500' : 'text-rose-500'}`} />
                    <span>{activeBoosts.unlimitedHearts ? 'Unlimited hearts' : `${user.hearts}/${user.maxHearts} hearts`}</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
                    <span>{user.coins} coins</span>
                  </div>
                </div>

                {(activeBoosts.xpBoost || activeBoosts.unlimitedHearts) ? (
                  <div className="mt-3 space-y-2">
                    {activeBoosts.xpBoost ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-amber-100 px-3 py-2 text-xs text-amber-900">
                        <div className="flex items-center gap-1 font-medium">
                          <Zap className="h-3.5 w-3.5" />
                          <span>{activeBoosts.xpBoost.multiplier}x XP boost</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTimeRemaining(activeBoosts.xpBoost.expiresAt, currentTime)}</span>
                        </div>
                      </div>
                    ) : null}
                    {activeBoosts.unlimitedHearts ? (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-pink-100 px-3 py-2 text-xs text-pink-900">
                        <div className="flex items-center gap-1 font-medium">
                          <Heart className="h-3.5 w-3.5" />
                          <span>Unlimited hearts</span>
                        </div>
                        <div className="flex items-center gap-1 text-pink-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTimeRemaining(activeBoosts.unlimitedHearts.expiresAt, currentTime)}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center">
                    <MascotIcon mascot="learn" className="h-full w-full" imageClassName="drop-shadow-md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">Start with the benchmark</p>
                    <p className="text-xs text-slate-500">Get a report before you decide to sign up.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => setCurrentSection('benchmark')}
                    className="w-full rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Start free benchmark
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openAuthModal('signup')}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Sign Up
                    </button>
                    <button
                      onClick={() => openAuthModal('login')}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Sign In
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {authUser && user ? (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          ) : null}
        </div>

        <nav className="flex-1 px-3 py-4 lg:px-4 lg:py-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Core workflow</div>
          <ul className="mt-3 space-y-2">
            {(authUser ? primaryNavItems : guestNavItems).map((item) => renderNavButton(item))}
          </ul>

          {authUser ? (
            <>
              <div className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Workspace</div>
              <ul className="mt-3 space-y-2">
                {secondaryNavItems.map((item) => renderNavButton(item, true))}
              </ul>
            </>
          ) : null}
        </nav>
      </div>
    </aside>
  );
}
