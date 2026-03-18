import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UserProvider } from './context/UserContext';
import AppShell from './components/AppShell';
import { lazyWithPreload } from './lib/lazyWithPreload';
import {
  BenchmarkPage,
  CompilerLandingPage,
  FaqPage,
  HomePage,
  InterviewPrepLandingPage,
  LanguageLandingPage,
  PricingPage,
  ReportSamplePage,
  TeamsPage,
  TeamUseCasePage,
  TrackLandingPage,
} from './components/marketing/PublicPages';

type AuthModalView = 'login' | 'signup';

const AuthContainer = lazyWithPreload(() => import('./components/auth/AuthContainer'));
const AuthConfirm = lazyWithPreload(() => import('./components/AuthConfirm'));
const ResetPasswordPage = lazyWithPreload(() => import('./components/ResetPasswordPage'));
const LegalDocumentPage = lazyWithPreload(() => import('./components/legal/LegalDocumentPage'));

const SectionFallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center px-6 py-16 text-sm font-medium text-slate-500">
    Loading...
  </div>
);

function AppRoutes() {
  const navigate = useNavigate();
  const { setNavigationCallback } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialView, setAuthInitialView] = useState<AuthModalView>('login');

  useEffect(() => {
    setNavigationCallback(() => {
      setShowAuthModal(false);
      navigate('/app', { replace: true });
    });
  }, [navigate, setNavigationCallback]);

  const openAuthModal = (view: AuthModalView = 'login') => {
    void AuthContainer.preload();
    setAuthInitialView(view);
    setShowAuthModal(true);
  };

  return (
    <>
      <Suspense fallback={<SectionFallback />}>
        <Routes>
          <Route path="/" element={<HomePage openAuthModal={openAuthModal} />} />
          <Route path="/benchmark" element={<BenchmarkPage openAuthModal={openAuthModal} />} />
          <Route path="/benchmark/:language" element={<BenchmarkPage openAuthModal={openAuthModal} />} />
          <Route path="/teams" element={<TeamsPage openAuthModal={openAuthModal} />} />
          <Route path="/teams/:useCase" element={<TeamUseCasePage openAuthModal={openAuthModal} />} />
          <Route path="/pricing" element={<PricingPage openAuthModal={openAuthModal} />} />
          <Route path="/faq" element={<FaqPage openAuthModal={openAuthModal} />} />
          <Route path="/report-sample" element={<ReportSamplePage openAuthModal={openAuthModal} />} />
          <Route path="/tracks/:trackId" element={<TrackLandingPage openAuthModal={openAuthModal} />} />
          <Route path="/languages/:language" element={<LanguageLandingPage openAuthModal={openAuthModal} />} />
          <Route path="/interview-prep/:slug" element={<InterviewPrepLandingPage openAuthModal={openAuthModal} />} />
          <Route path="/compilers/:language" element={<CompilerLandingPage openAuthModal={openAuthModal} />} />
          <Route path="/app" element={<AppShell openAuthModal={openAuthModal} />} />
          <Route path="/auth/confirm" element={<AuthConfirm />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/terms" element={<LegalDocumentPage slug="terms" />} />
          <Route path="/privacy" element={<LegalDocumentPage slug="privacy" />} />
          <Route path="/refunds" element={<LegalDocumentPage slug="refunds" />} />
        </Routes>
      </Suspense>

      <Suspense fallback={null}>
        <AuthContainer open={showAuthModal} initialView={authInitialView} onClose={() => setShowAuthModal(false)} />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <UserProvider>
        <Router>
          <AppRoutes />
        </Router>
      </UserProvider>
    </AuthProvider>
  );
}

export default App;
