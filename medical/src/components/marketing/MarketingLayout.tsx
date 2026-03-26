import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import mascot from '../../assets/design/mascot.png';

type AuthModalView = 'login' | 'signup';

interface MarketingLayoutProps {
  children: React.ReactNode;
  openAuthModal: (view?: AuthModalView) => void;
  isAuthenticated: boolean;
}

const navItems = [
  { label: 'Learn', href: '/learn' },
  { label: 'Practice', href: '/practice' },
  { label: 'Skill Check', href: '/skill-check' },
  { label: 'Duels', href: '/duels' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Teams', href: '/teams' },
  { label: 'FAQ', href: '/faq' },
];

export default function MarketingLayout({ children, openAuthModal, isAuthenticated }: MarketingLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] overflow-x-clip bg-background text-foreground">
      <header className="sticky top-0 z-50 border-b border-border/70 glass">
        <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-5 sm:px-6 xl:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={mascot} alt="Codhak" className="h-8 w-8" />
            <div>
              <div className="type-brand text-xl text-foreground">Codhak</div>
              <div className="type-kicker text-[10px] text-muted-foreground">
                Lessons, practice, duels, progress
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
              >
                <span>Open workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
                >
                  <span>Start Learning Free</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-card text-foreground md:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-border bg-card/95 px-5 py-4 md:hidden">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                >
                  <span>Open workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <div className="grid gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('login');
                    }}
                    className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
                  >
                    <span>Start Learning Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main className="min-w-0">{children}</main>

      <footer className="border-t border-border/70 bg-card/40">
        <div className="container mx-auto flex flex-col items-center justify-between gap-5 px-5 py-8 text-center sm:px-6 sm:flex-row sm:text-left xl:px-8">
          <div className="flex items-center gap-3">
            <img src={mascot} alt="" className="h-7 w-7" />
            <div>
              <div className="font-semibold text-foreground">Codhak</div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Learn by coding every day.
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-medium text-muted-foreground">
            <Link to="/learn" className="hover:text-foreground">Learn</Link>
            <Link to="/practice" className="hover:text-foreground">Practice</Link>
            <Link to="/skill-check" className="hover:text-foreground">Skill Check</Link>
            <Link to="/duels" className="hover:text-foreground">Duels</Link>
            <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link to="/teams" className="hover:text-foreground">Teams</Link>
            <Link to="/faq" className="hover:text-foreground">FAQ</Link>
            <Link to="/terms" className="hover:text-foreground">Terms</Link>
            <Link to="/privacy" className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
