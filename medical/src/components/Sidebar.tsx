import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Clock,
  Heart,
  Loader2,
  LogOut,
  Settings,
  ShoppingBag,
  Swords,
  Trophy,
  User as UserIcon,
  Users,
  X,
  Zap,
  Flame,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUser } from '../context/UserContext';
import { avatars } from '../data/avatars';
import mascot from '../assets/design/mascot.png';

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
      { label: 'Coins', value: user.coins, icon: <span className="text-sm">🪙</span>, tone: 'text-coins' },
      { label: 'XP', value: user.xp, icon: <Zap className="h-3 w-3" />, tone: 'text-xp' },
      { label: 'Hearts', value: activeBoosts.unlimitedHearts ? '∞' : `${user.hearts}`, icon: <Heart className="h-3 w-3 fill-current" />, tone: 'text-hearts' },
      { label: 'Streak', value: user.streak, icon: <Flame className="h-3 w-3" />, tone: 'text-streak animate-streak-fire' },
    ],
    [activeBoosts.unlimitedHearts, user.coins, user.hearts, user.streak, user.xp]
  );

  const renderNavButton = (
    item: { id: string; label: string; icon: React.ComponentType<any> },
    quiet = false
  ) => {
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
          className={`flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
            isActive
              ? 'bg-primary text-primary-foreground shadow-glow'
              : quiet
              ? 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          }`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span>{item.label}</span>
          {item.id === 'duels' ? (
            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
              3
            </span>
          ) : null}
        </button>
      </li>
    );
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
        <div className="flex items-center gap-2.5">
          <img src={mascot} alt="Codhak" className="h-7 w-7" />
          <span className="text-lg font-bold font-display text-sidebar-accent-foreground">Codhak</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-sidebar-foreground transition hover:bg-sidebar-accent lg:hidden"
          aria-label="Close navigation"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-3 mt-4 rounded-xl border border-sidebar-border bg-sidebar-accent/60 p-3">
          {authUser && user ? (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-lg">
                  {currentAvatar?.emoji || '👤'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">{user.name}</p>
                  <p className="text-xs text-sidebar-foreground">Level {user.level}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs">
                {practiceStats.map((stat) => (
                  <span key={stat.label} className={`flex items-center gap-1 ${stat.tone}`}>
                    {stat.icon}
                    {stat.value}
                  </span>
                ))}
              </div>

              <div className="mt-2">
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-xp" style={{ width: `${Math.min(100, ((user.xp % 1000) / 1000) * 100 || 65)}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-sidebar-foreground">
                  {user.xp} XP in your skill workspace
                </p>
              </div>

              {(activeBoosts.xpBoost || activeBoosts.unlimitedHearts) ? (
                <div className="mt-3 space-y-2">
                  {activeBoosts.xpBoost ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-xp/15 px-3 py-2 text-xs text-xp">
                      <div className="flex items-center gap-1 font-medium">
                        <Zap className="h-3.5 w-3.5" />
                        <span>{activeBoosts.xpBoost.multiplier}x XP boost</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatTimeRemaining(activeBoosts.xpBoost.expiresAt, currentTime)}</span>
                      </div>
                    </div>
                  ) : null}
                  {activeBoosts.unlimitedHearts ? (
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-destructive/15 px-3 py-2 text-xs text-destructive">
                      <div className="flex items-center gap-1 font-medium">
                        <Heart className="h-3.5 w-3.5 fill-current" />
                        <span>Unlimited hearts</span>
                      </div>
                      <div className="flex items-center gap-1">
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
              <div className="flex items-center gap-3">
                <img src={mascot} alt="" className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">Start with the benchmark</p>
                  <p className="text-xs text-sidebar-foreground">Get a report before you sign up.</p>
                </div>
              </div>
              <div className="mt-3 grid gap-2">
                <button
                  onClick={() => {
                    setCurrentSection('benchmark');
                    onClose?.();
                  }}
                  className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                >
                  Start free benchmark
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => openAuthModal('signup')}
                    className="w-full rounded-xl border border-sidebar-border bg-sidebar px-4 py-2.5 text-sm font-medium text-sidebar-accent-foreground transition hover:bg-sidebar-accent"
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => openAuthModal('login')}
                    className="w-full rounded-xl border border-sidebar-border bg-sidebar px-4 py-2.5 text-sm font-medium text-sidebar-accent-foreground transition hover:bg-sidebar-accent"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3">
          <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">Main</p>
          <ul className="space-y-1">
            {(authUser ? primaryNavItems : guestNavItems).map((item) => renderNavButton(item))}
          </ul>

          {authUser ? (
            <>
              <div className="my-4 h-px bg-sidebar-border" />
              <p className="mb-2 px-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/60">More</p>
              <ul className="space-y-1">
                {secondaryNavItems.map((item) => renderNavButton(item, true))}
              </ul>
            </>
          ) : null}
        </nav>
      </div>

      {authUser ? (
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-destructive disabled:cursor-not-allowed disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            {signingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      ) : null}
    </aside>
  );
}
