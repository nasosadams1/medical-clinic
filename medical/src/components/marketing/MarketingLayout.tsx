import React, { useState } from 'react';
import { ArrowRight, Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

type AuthModalView = 'login' | 'signup';

interface MarketingLayoutProps {
  children: React.ReactNode;
  openAuthModal: (view?: AuthModalView) => void;
  isAuthenticated: boolean;
}

const navItems = [
  { label: 'Benchmark', href: '/benchmark' },
  { label: 'Practice', href: '/tracks/python-fundamentals' },
  { label: 'Duels', href: '/#duels' },
  { label: 'Teams', href: '/teams' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
];

export default function MarketingLayout({ children, openAuthModal, isAuthenticated }: MarketingLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef6ff_42%,#ffffff_100%)] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/50 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-bold text-white shadow-lg shadow-slate-900/20">
              C
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Codhak</div>
              <div className="text-sm font-semibold text-slate-900">Developer skill benchmark</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className="text-sm font-medium text-slate-600 transition hover:text-slate-950">
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <Link
                to="/app"
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <span>Open workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal('login')}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('signup')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <span>Get started</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white lg:hidden"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-slate-700" /> : <Menu className="h-5 w-5 text-slate-700" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div className="border-t border-slate-200 bg-white px-4 py-4 lg:hidden">
            <nav className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated ? (
                <Link
                  to="/app"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
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
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    <span>Get started</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </nav>
          </div>
        ) : null}
      </header>

      <main>{children}</main>

      <footer className="border-t border-slate-200 bg-white/90">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <div className="text-lg font-semibold text-slate-950">Measure coding skill. Build proof of progress.</div>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Codhak helps individuals get interview-ready and gives teams a practical way to benchmark, coach, and track coding fluency.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <Link to="/benchmark" className="transition hover:text-slate-950">Benchmark</Link>
            <Link to="/pricing" className="transition hover:text-slate-950">Pricing</Link>
            <Link to="/teams" className="transition hover:text-slate-950">Teams</Link>
            <Link to="/faq" className="transition hover:text-slate-950">FAQ</Link>
            <Link to="/terms" className="transition hover:text-slate-950">Terms</Link>
            <Link to="/privacy" className="transition hover:text-slate-950">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
