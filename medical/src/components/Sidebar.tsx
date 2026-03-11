import React, { useEffect, useState } from 'react';
import { BookOpen, Trophy, User as UserIcon, Zap, Heart, Store, LogOut, Loader2, Clock, Swords, X, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useAuth } from '../context/AuthContext';
import { avatars } from '../data/avatars';
import MascotIcon from './branding/MascotIcon';

interface SidebarProps {
  currentSection: string;
  setCurrentSection: React.Dispatch<React.SetStateAction<string>>;
  openAuthModal: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  setCurrentSection,
  openAuthModal,
  isOpen = true,
  onClose,
}) => {
  const { user: authUser, signOut } = useAuth();
  const { user, resetHeartsIfNeeded, getActiveBoosts } = useUser();
  const [signingOut, setSigningOut] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (authUser && resetHeartsIfNeeded) {
      resetHeartsIfNeeded();
    }
  }, [authUser, resetHeartsIfNeeded]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      setCurrentSection('learn');
      await signOut();
      if (onClose) onClose();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setSigningOut(false);
    }
  };

  const handleNavigation = (sectionId: string) => {
    setCurrentSection(sectionId);
    if (onClose) onClose();
  };

  const navItems = authUser
    ? [
        { id: 'duels', label: 'Code Duels', icon: Swords },
        { id: 'learn', label: 'Learn', icon: BookOpen },
        { id: 'store', label: 'Store', icon: Store },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'profile', label: 'Profile', icon: UserIcon },
        { id: 'account', label: 'Account', icon: Settings },
      ]
    : [{ id: 'learn', label: 'Learn', icon: BookOpen }];

  const currentAvatar = authUser && user ? (avatars.find((a) => a.id === user.currentAvatar) || avatars[0]) : null;
  const activeBoosts = authUser && user ? getActiveBoosts() : {};

  const formatTimeRemaining = (expiresAt: number) => {
    const remaining = Math.max(0, expiresAt - currentTime);
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full w-[18rem] flex-col border-r border-gray-200 bg-white shadow-xl transition-transform duration-300 ease-in-out lg:w-72 xl:w-80 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/95 px-4 pb-4 pt-4 backdrop-blur lg:px-6 lg:pb-6 lg:pt-6">
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400">Codhak</div>
              <div className="text-sm font-semibold text-gray-900">Navigation</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-600 shadow-sm"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mb-4 flex items-center gap-4 lg:mb-6">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center lg:h-16 lg:w-16">
              <MascotIcon mascot="learn" className="h-full w-full" imageClassName="drop-shadow-lg" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold leading-tight text-gray-900">Codhak</h1>
              <p className="mt-1 text-sm text-gray-500">Code, rank, and progress</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            {authUser && user ? (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-lg shadow-sm">
                    {currentAvatar?.emoji || '\u{1F464}'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                    <p className="text-xs text-gray-500">Level {user.level}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400">Coins</div>
                    <div className="font-semibold text-gray-900">{user.coins}</div>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                    <div className="text-[11px] uppercase tracking-wide text-gray-400">XP</div>
                    <div className="font-semibold text-gray-900">{user.xp}</div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-white px-3 py-2 shadow-sm">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Heart
                        key={i}
                        className={`h-4 w-4 ${
                          activeBoosts.unlimitedHearts
                            ? 'animate-pulse fill-current text-pink-500'
                            : i < user.hearts
                            ? 'fill-current text-red-500'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-gray-600">
                    {activeBoosts.unlimitedHearts ? '\u221E / 5' : `${user.hearts}/5`}
                  </span>
                </div>

                {(activeBoosts.xpBoost || activeBoosts.unlimitedHearts) && (
                  <div className="mt-3 space-y-2">
                    {activeBoosts.xpBoost && (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-yellow-100 px-3 py-2 text-xs text-yellow-900">
                        <div className="flex items-center gap-1 font-medium">
                          <Zap className="h-3.5 w-3.5" />
                          <span>{activeBoosts.xpBoost.multiplier}x XP</span>
                        </div>
                        <div className="flex items-center gap-1 text-yellow-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTimeRemaining(activeBoosts.xpBoost.expiresAt)}</span>
                        </div>
                      </div>
                    )}
                    {activeBoosts.unlimitedHearts && (
                      <div className="flex items-center justify-between gap-2 rounded-xl bg-pink-100 px-3 py-2 text-xs text-pink-900">
                        <div className="flex items-center gap-1 font-medium">
                          <Heart className="h-3.5 w-3.5" />
                          <span>Unlimited Hearts</span>
                        </div>
                        <div className="flex items-center gap-1 text-pink-800">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{formatTimeRemaining(activeBoosts.unlimitedHearts.expiresAt)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center">
                    <MascotIcon mascot="learn" className="h-full w-full" imageClassName="drop-shadow-md" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">Guest</p>
                    <p className="text-xs text-gray-500">Create an account to start learning</p>
                  </div>
                </div>
                <button
                  onClick={openAuthModal}
                  className="w-full rounded-xl bg-blue-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-600"
                >
                  Sign In / Sign Up
                </button>
              </>
            )}
          </div>

          {authUser && user && (
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span>{signingOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          )}
        </div>

        <nav className="flex-1 px-3 py-4 lg:px-4 lg:py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleNavigation(item.id)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200 ${
                      isActive
                        ? 'bg-gradient-to-r from-green-400 to-blue-500 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gray-100 px-4 py-4 lg:px-6">
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;





