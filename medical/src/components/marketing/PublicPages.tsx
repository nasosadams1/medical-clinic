import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  GraduationCap,
  Play,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BenchmarkExperience from '../benchmark/BenchmarkExperience';
import BenchmarkReportCard from '../benchmark/BenchmarkReportCard';
import StripeCheckout from '../StripeCheckout';
import TeamsWorkspace from '../teams/TeamsWorkspace';
import DemoRequestCard from './DemoRequestCard';
import MarketingLayout from './MarketingLayout';
import { useAuth } from '../../context/AuthContext';
import { usePlanEntitlements } from '../../hooks/usePlanEntitlements';
import type { BenchmarkReport } from '../../data/benchmarkCatalog';
import { buildSampleBenchmarkReport } from '../../data/benchmarkCatalog';
import {
  audienceSegments,
  faqItems,
  interviewTracks,
  languagePageDescriptions,
  pricingPlans,
  teamUseCases,
  testimonialPlaceholders,
  type LanguageSlug,
} from '../../data/siteContent';
import {
  createCustomerPortalSession,
  createPlanCheckoutSession,
  finalizePlanCheckoutSession,
  formatPlanRenewalDate,
  getSelfServePlanProductByPlanName,
  isRecurringPlanEntitlement,
  isRecurringPlanProduct,
  type PlanStoreProduct,
} from '../../lib/billing';
import { fetchProductAnalyticsSummary, trackEvent } from '../../lib/analytics';
import { fetchSharedBenchmarkReport } from '../../lib/benchmarkApi';
import { usePageMetadata } from '../../lib/pageMeta';
import { fetchSharedTeamProof, type PublicTeamProof } from '../../lib/teams';
import heroBg from '../../assets/design/hero-bg.jpg';
import mascot from '../../assets/design/mascot.png';

type AuthModalView = 'login' | 'signup';

interface PublicPageProps {
  openAuthModal: (view?: AuthModalView) => void;
}

const fallbackTrustMetrics = [
  { label: 'Challenges completed', value: 'Live telemetry ready', helper: 'Benchmark and practice completions flow here.' },
  { label: 'Duel matches played', value: 'Live telemetry ready', helper: 'Completed duel volume powers this metric.' },
  { label: 'Average score improvement', value: 'Benchmark delta ready', helper: 'Repeat attempts become visible improvement proof.' },
  { label: 'Team cohorts active', value: 'Pilot-ready', helper: 'Live team workspaces now feed this count.' },
];

const formatTeamUseCaseLabel = (slug: string) =>
  teamUseCases.find((entry) => entry.slug === slug)?.title || slug.replace(/-/g, ' ');

function useTrackPage(name: Parameters<typeof trackEvent>[0], payload?: Record<string, unknown>) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent(name, payload);
  }, [name, payload]);
}

function useTeamDemoCta() {
  const navigate = useNavigate();

  return (useCase?: string) => {
    trackEvent('team_demo_cta_clicked', { useCase: useCase ?? 'general' });
    navigate('/teams');
  };
}

function SectionHeader({
  eyebrow,
  title,
  description,
  align = 'left',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold font-display tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className={`mt-4 text-base leading-8 text-muted-foreground sm:text-lg ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-elevated">
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: 'var(--gradient-card-glow)' }}
      />
      <div className="relative space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-bold font-display text-foreground">{title}</h3>
        <p className="text-sm leading-7 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function PricingGrid({ openAuthModal }: { openAuthModal: (view?: AuthModalView) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { getPlanEntitlement, refresh: refreshPlanEntitlements } = usePlanEntitlements();
  const [selectedPlanProduct, setSelectedPlanProduct] = useState<PlanStoreProduct | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectingPlanId, setRedirectingPlanId] = useState<string | null>(null);
  const [managingBilling, setManagingBilling] = useState(false);
  const checkoutHandledRef = useRef('');

  useEffect(() => {
    const checkoutState = searchParams.get('checkout');
    const sessionId = searchParams.get('session_id');

    if (checkoutState === 'success' && sessionId && checkoutHandledRef.current !== sessionId) {
      checkoutHandledRef.current = sessionId;

      void (async () => {
        try {
          const payload = await finalizePlanCheckoutSession(sessionId);
          const refreshedEntitlements = await refreshPlanEntitlements();
          const activeEntitlement =
            refreshedEntitlements.find((entitlement) => entitlement.id === payload.entitlement.id) || payload.entitlement;

          setErrorMessage(null);
          setSuccessMessage(
            `${activeEntitlement.planName} is now active${
              activeEntitlement.currentPeriodEnd
                ? ` through ${formatPlanRenewalDate(activeEntitlement.currentPeriodEnd) || 'your current billing window'}`
                : ''
            }.`
          );
        } catch (error: any) {
          setErrorMessage(error?.message || 'We could not verify the subscription after checkout.');
        } finally {
          const nextParams = new URLSearchParams(searchParams);
          nextParams.delete('checkout');
          nextParams.delete('session_id');
          nextParams.delete('plan');
          setSearchParams(nextParams, { replace: true });
        }
      })();

      return;
    }

    if (checkoutState === 'cancelled') {
      setErrorMessage('Checkout was cancelled before the subscription started.');
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('checkout');
      nextParams.delete('session_id');
      nextParams.delete('plan');
      setSearchParams(nextParams, { replace: true });
    }
  }, [refreshPlanEntitlements, searchParams, setSearchParams]);

  const handlePlanClick = (planName: string) => {
    trackEvent('subscription_cta_clicked', { plan: planName, source: 'pricing_grid' });

    if (planName === 'Teams') {
      navigate('/teams');
      return;
    }

    if (planName === 'Teams Growth') {
      navigate('/pricing?intent=teams_growth');
      return;
    }

    if (planName === 'Custom') {
      navigate('/pricing?intent=custom_plan');
      return;
    }

    if (planName === 'Free') {
      navigate(user ? '/app?section=benchmark' : '/benchmark');
      return;
    }

    const selfServeProduct = getSelfServePlanProductByPlanName(planName);
    if (selfServeProduct) {
      if (!user) {
        openAuthModal('signup');
        return;
      }

      if (isRecurringPlanProduct(selfServeProduct)) {
        setRedirectingPlanId(selfServeProduct.id);
        setErrorMessage(null);
        setSuccessMessage(null);

        void (async () => {
          try {
            const payload = await createPlanCheckoutSession(selfServeProduct.id, '/pricing');
            window.location.assign(payload.url);
          } catch (error: any) {
            setErrorMessage(error?.message || 'Checkout could not be started right now.');
            setRedirectingPlanId(null);
          }
        })();
        return;
      }

      setSelectedPlanProduct(selfServeProduct);
      setErrorMessage(null);
      return;
    }

    if (user) {
      navigate('/app?section=store');
      return;
    }

    openAuthModal('signup');
  };

  const handleManageBilling = async () => {
    if (managingBilling) return;

    setManagingBilling(true);
    try {
      const payload = await createCustomerPortalSession('/pricing');
      window.location.assign(payload.url);
    } catch (error: any) {
      setErrorMessage(error?.message || 'Billing management is not available right now.');
      setManagingBilling(false);
    }
  };

  return (
    <>
      {successMessage ? (
        <div className="mb-6 rounded-2xl border border-xp/20 bg-xp/10 px-5 py-4 text-sm text-foreground">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="mb-6 rounded-2xl border border-coins/20 bg-coins/10 px-5 py-4 text-sm text-foreground">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        {pricingPlans.map((plan) => {
          const highlighted = plan.badge === 'Most popular';
          const selfServeProduct = getSelfServePlanProductByPlanName(plan.name);
          const activeEntitlement = selfServeProduct ? getPlanEntitlement(selfServeProduct.id) : null;
          const isRecurringPlan = isRecurringPlanProduct(selfServeProduct);

          return (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-300 ${
                highlighted
                  ? 'border-primary/50 bg-card shadow-elevated glow-primary'
                  : 'border-border bg-card shadow-card hover:border-primary/20'
              }`}
            >
              {plan.badge ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary-foreground">
                    {plan.badge}
                  </span>
                </div>
              ) : null}

              <div className="space-y-2">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{plan.name}</div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold font-display text-foreground">{plan.price}</span>
                  <span className="pb-1 text-sm text-muted-foreground">{plan.cadence}</span>
                </div>
                <p className="text-sm leading-7 text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="my-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {activeEntitlement ? (
                <div className="mb-4 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs leading-6 text-foreground">
                  Active until {formatPlanRenewalDate(activeEntitlement.currentPeriodEnd) || 'your renewal date'}.
                </div>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (activeEntitlement) {
                    navigate(plan.name === 'Interview Sprint' ? '/app?section=benchmark' : '/app?section=practice');
                    return;
                  }
                  handlePlanClick(plan.name);
                }}
                className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  highlighted
                    ? 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90'
                    : 'border border-border bg-transparent text-foreground hover:bg-secondary'
                }`}
                disabled={redirectingPlanId === selfServeProduct?.id}
              >
                <span>
                  {activeEntitlement
                    ? 'Open workspace'
                    : redirectingPlanId === selfServeProduct?.id
                    ? 'Redirecting to Stripe...'
                    : plan.ctaLabel}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {activeEntitlement && isRecurringPlan && isRecurringPlanEntitlement(activeEntitlement) ? (
                <button
                  type="button"
                  onClick={handleManageBilling}
                  disabled={managingBilling}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span>{managingBilling ? 'Opening billing portal...' : 'Manage billing'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {selectedPlanProduct ? (
        <StripeCheckout
          itemId={selectedPlanProduct.id}
          amount={selectedPlanProduct.stripeAmountCents}
          description={`${selectedPlanProduct.name} - ${selectedPlanProduct.description}`}
          benefitLabel={`Activates ${selectedPlanProduct.planName} for ${selectedPlanProduct.durationDays} days.`}
          onSuccess={async () => {
            const refreshedEntitlements = await refreshPlanEntitlements();
            const activeEntitlement = refreshedEntitlements.find(
              (entitlement) => entitlement.itemId === selectedPlanProduct.id && entitlement.isActive
            );
            setErrorMessage(null);
            setSuccessMessage(
              `${selectedPlanProduct.planName} is now active${
                activeEntitlement?.currentPeriodEnd
                  ? ` through ${formatPlanRenewalDate(activeEntitlement.currentPeriodEnd) || 'your current plan window'}`
                  : ''
              }.`
            );
            setSelectedPlanProduct(null);
          }}
          onError={(error) => {
            setErrorMessage(error || 'Checkout could not be completed right now.');
            setSelectedPlanProduct(null);
          }}
          onClose={() => setSelectedPlanProduct(null)}
        />
      ) : null}
    </>
  );
}

function FaqList() {
  return (
    <div className="grid gap-4">
      {faqItems.map((item) => (
        <div key={item.question} className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="text-lg font-semibold text-foreground">{item.question}</div>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.answer}</p>
        </div>
      ))}
    </div>
  );
}

function SampleReportPreview() {
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);

  return (
    <div className="grid gap-8 xl:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeader
          eyebrow="Sample skill report"
          title="The report is the value moment."
          description="Show people the score, strengths, weaknesses, duel-readiness signal, and next recommended track before you ever ask them to commit."
        />
        <div className="mt-6 space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
          {[
            'Overall score and correct answers',
            'Strengths and focus areas',
            'Recommended track and suggested lessons',
            'Duel-readiness guidance and next steps',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm leading-7 text-foreground">
              <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-primary" />
              <span>{item}</span>
            </div>
          ))}
          <Link to="/report-sample" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-accent">
            <span>Open the full sample report</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <BenchmarkReportCard report={sampleReport} />
    </div>
  );
}

function ActionButton({
  to,
  label,
  primary = false,
}: {
  to: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-sm font-semibold transition ${
        primary
          ? 'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90'
          : 'border border-border bg-card text-foreground hover:bg-secondary'
      }`}
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

function TrackOrLandingFallback({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-card">
      <h2 className="text-3xl font-bold font-display tracking-tight text-foreground">{title}</h2>
      <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">{description}</p>
      <div className="mt-6">
        <ActionButton to={ctaHref} label={ctaLabel} primary />
      </div>
    </div>
  );
}

export function HomePage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const handleTeamDemo = useTeamDemoCta();
  const [liveTrustMetrics, setLiveTrustMetrics] = useState(fallbackTrustMetrics);

  usePageMetadata({
    title: 'Codhak | Developer Skills Benchmark and Interview Readiness',
    description: 'Measure real coding skill with live challenges, duels, interview-style feedback, and cohort-ready reporting.',
  });
  useTrackPage('homepage_visit', { page: 'home' });

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      const summary = await fetchProductAnalyticsSummary();
      if (!summary || cancelled) return;

      setLiveTrustMetrics([
        {
          label: 'Challenges completed',
          value: `${summary.challengesCompleted}`,
          helper: 'Lesson and practice completions recorded across the product.',
        },
        {
          label: 'Duel matches played',
          value: `${summary.duelMatchesPlayed}`,
          helper: 'Completed matches pulled from the live duel system.',
        },
        {
          label: 'Average score improvement',
          value:
            summary.averageScoreImprovement === null
              ? 'Waiting for repeat attempts'
              : `${summary.averageScoreImprovement > 0 ? '+' : ''}${summary.averageScoreImprovement} pts`,
          helper: 'Calculated from benchmark history when learners retake the assessment.',
        },
        {
          label: 'Team cohorts active',
          value: summary.teamCount > 0 ? `${summary.teamCount}` : 'Pilot-ready',
          helper: 'Counts active team workspaces created in Codhak.',
        },
      ]);
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const platformFeatures = [
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: 'Skill benchmark',
      description: 'Timed, language-specific assessments that turn a short session into a real signal instead of a generic self-rating.',
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      title: 'Structured practice',
      description: 'Move from benchmark gaps into targeted tracks, recommended lessons, and challenge packs with a clear next step.',
    },
    {
      icon: <Swords className="h-6 w-6" />,
      title: '1v1 duels',
      description: 'Use live coding pressure as proof of skill, not as a random mini-game. Climb the ladder with judged outcomes.',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: 'Team workspaces',
      description: 'Benchmark learners or junior developers, assign practice, and track improvement for bootcamps, schools, and teams.',
    },
    {
      icon: <ShieldCheck className="h-6 w-6" />,
      title: 'Trusted signal',
      description: 'Anti-cheat and AI-use expectations are explicit. Benchmarks, duels, and reports are built to create credible evidence.',
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: 'Competitive momentum',
      description: 'The design keeps the energy of a coding arena, but the product story stays outcome-first and career-relevant.',
    },
  ];

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/85 to-background" />
        </div>
        <div className="container relative z-10 mx-auto grid min-h-[90vh] items-center gap-12 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] xl:px-8">
          <div className="max-w-3xl animate-slide-up">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Benchmark-first developer skills platform
              </span>
            </div>

            <h1 className="text-4xl font-bold font-display leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Measure <span className="text-gradient-primary">real coding skill</span> with live challenges, duels, and interview-style feedback.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Codhak helps learners get interview-ready and helps cohorts prove progress with hands-on assessments, not passive course completion.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ActionButton to="/benchmark" label="Start free benchmark" primary />
              <ActionButton to="/teams" label="See team plans" />
              <ActionButton to="/report-sample" label="View sample report" />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> No install required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> Instant report output</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border glass p-6 shadow-elevated sm:p-8">
            <div className="flex items-center gap-3">
              <img src={mascot} alt="Codhak mascot" className="h-12 w-12 animate-float" />
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What new visitors should do first</div>
                <div className="mt-1 text-2xl font-bold font-display text-foreground">Start with the benchmark</div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ['Take benchmark', 'Choose goal, language, and role level before any signup wall.', Play],
                ['Get skill report', 'See score, strengths, gaps, and duel-readiness immediately.', Trophy],
                ['Follow roadmap', 'Move into practice, duels, or cohort assignments with one clear next step.', BookOpen],
              ].map(([title, description, IconComponent], index) => {
                const Icon = IconComponent as typeof Play;
                return (
                  <div key={title as string} className="rounded-2xl border border-border bg-secondary/45 p-5">
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step {index + 1}</div>
                        <div className="mt-1 text-base font-semibold text-foreground">{title}</div>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border border-xp/20 bg-xp/10 p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-xp">Activation target</div>
              <p className="mt-2 text-sm leading-7 text-foreground">
                The main activation event is first completed benchmark plus viewed skill report, not just account creation.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/40">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-5 py-8 sm:px-6 md:grid-cols-4 xl:px-8">
          {liveTrustMetrics.map((metric) => (
            <div key={metric.label} className="text-center">
              <p className="text-2xl font-bold font-display text-foreground">{metric.value}</p>
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {metric.label}
              </p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">{metric.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Platform"
            title="Everything you need to turn coding effort into measurable signal."
            description="From benchmarks to team dashboards, Codhak keeps the same design language and the same product story across the entire surface."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1480px] gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {platformFeatures.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="How It Works"
            title="From benchmark to proof of progress"
            description="The product flow is intentionally tight: benchmark, report, roadmap, then measured performance."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1320px] gap-8 md:grid-cols-3">
            {[
              ['01', 'Benchmark', 'Take a short timed assessment built from the existing Codhak lesson and challenge catalog.'],
              ['02', 'Report', 'See overall score, strengths, weaknesses, and duel-readiness in a single report card.'],
              ['03', 'Track and prove', 'Move into guided practice, challenge packs, or duels and show improvement over time.'],
            ].map(([step, title, description]) => (
              <div key={step} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="text-2xl font-bold font-mono">{step}</span>
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Built For"
            title="Different buyers, one core value: measurable coding skill."
            description="The same benchmark-first workflow can serve an individual learner, a cohort manager, or a hiring and upskilling team."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1480px] gap-6 lg:grid-cols-3">
            {audienceSegments.map((segment) => (
              <Link
                key={segment.title}
                to={segment.href}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{segment.title}</div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{segment.description}</p>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground group-hover:text-primary">
                  <span>{segment.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SampleReportPreview />
        </div>
      </section>

      <section id="duels" className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Tracks and Duel Prep"
            title="Use tracks, challenge packs, and duels as proof of skill."
            description="Lessons are support content. The product center of gravity stays on benchmark outputs and measurable performance."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1480px] gap-6 md:grid-cols-2 xl:grid-cols-3">
            {interviewTracks.map((track) => (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {track.language === 'multi' ? 'Multi-language track' : `${track.language} track`}
                </div>
                <div className="mt-3 text-xl font-bold font-display text-foreground">{track.title}</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{track.description}</p>
                <ul className="mt-5 space-y-2">
                  {track.highlightedSkills.slice(0, 4).map((skill) => (
                    <li key={skill} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                      <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-xp" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">
                  <span>{track.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Team Workflows"
            title="Benchmark learners, assign challenge packs, and track improvement in one place."
            description="The team wedge is intentionally lean: enough structure for pilots, without pretending to be heavyweight enterprise software."
            align="center"
          />
          <div className="mx-auto mt-10 grid max-w-[1480px] gap-6 lg:grid-cols-4">
            {teamUseCases.map((useCase) => (
              <div key={useCase.slug} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{useCase.title}</div>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">{useCase.description}</p>
                <button
                  type="button"
                  onClick={() => handleTeamDemo(useCase.slug)}
                  className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition hover:text-primary"
                >
                  <span>{useCase.primaryCta}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Reviews"
            title="Trust elements are built into the design."
            description="These are placeholder testimonials for now, but the section is already wired so the public experience feels credible instead of incomplete."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1320px] gap-6 md:grid-cols-3">
            {testimonialPlaceholders.map((testimonial) => (
              <div key={testimonial.attribution} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="mb-3 flex gap-1">
                  {[1, 2, 3, 4, 5].map((index) => (
                    <Star key={index} className="h-4 w-4 fill-coins text-coins" />
                  ))}
                </div>
                <p className="text-sm leading-7 text-muted-foreground">"{testimonial.quote}"</p>
                <div className="mt-4 text-sm font-semibold text-foreground">{testimonial.attribution}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Pricing"
            title="Simple, transparent pricing"
            description="Start free, prove the value with the report, then unlock more depth for individuals or teams."
            align="center"
          />
          <div className="mx-auto mt-12 max-w-[1480px]">
            <PricingGrid openAuthModal={openAuthModal} />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title="Answer the trust and positioning questions up front."
            description="The public funnel should make it obvious who Codhak is for, what it measures, and how teams can use it."
            align="center"
          />
          <div className="mx-auto mt-12 max-w-4xl">
            <FaqList />
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 text-center sm:px-6 xl:px-8">
          <h2 className="text-3xl font-bold font-display text-foreground sm:text-4xl">
            Ready to find out where you stand?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Take the free benchmark. Get your score. Start competing with a clear next step.
          </p>
          <div className="mt-8 flex justify-center">
            <ActionButton to="/benchmark" label="Start your benchmark" primary />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function BenchmarkPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { language } = useParams();
  const presetLanguage = language as LanguageSlug | undefined;

  usePageMetadata({
    title: presetLanguage ? `Codhak ${presetLanguage.toUpperCase()} Benchmark` : 'Codhak Benchmark',
    description: 'Take a short benchmark and get a skill report with measurable next steps.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <BenchmarkExperience
            mode="public"
            presetLanguage={presetLanguage}
            openAuthModal={openAuthModal}
          />
        </div>
      </section>
    </MarketingLayout>
  );
}

export function TeamsPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const handleTeamDemo = useTeamDemoCta();

  usePageMetadata({
    title: 'Codhak Teams | Benchmark Cohorts and Junior Developer Readiness',
    description: 'Use Codhak for bootcamps, universities, coding clubs, and upskilling teams.',
  });
  useTrackPage('team_page_viewed', { page: 'teams' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] xl:px-8">
          <div>
            <SectionHeader
              eyebrow="Teams"
              title="A cohort-ready workspace with the same visual system as the rest of the product."
              description="Benchmark learners quickly, assign practice paths, run coding competitions, and prove improvement with skill reports."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ['Bootcamps', 'Segment learners faster and coach the right gaps first.', GraduationCap],
                ['Universities', 'Track benchmark completion and assignment progress in-browser.', Building2],
                ['Coding clubs', 'Run competitions and keep members engaged with scorecards.', Users],
                ['Upskilling teams', 'Surface skill gaps and strongest performers without heavy setup.', Briefcase],
              ].map(([title, description, IconComponent]) => {
                const Icon = IconComponent as typeof Users;
                return (
                  <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="mt-4 text-lg font-bold font-display text-foreground">{title}</div>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleTeamDemo('general')}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
              >
                <span>See team plans</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <ActionButton to="/pricing" label="View pricing" />
            </div>
          </div>

          <TeamsWorkspace mode={user ? 'app' : 'public'} />
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Use Cases"
            title="A narrow MVP for real pilots, not bloated enterprise theater."
            description="The current teams surface is intentionally scoped: overview, members, assignments, leaderboard, benchmark completion, and progress snapshots."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {teamUseCases.map((useCase) => (
              <Link
                key={useCase.slug}
                to={`/teams/${useCase.slug}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{useCase.title}</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{useCase.description}</p>
                <ul className="mt-5 space-y-2">
                  {useCase.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionHeader
              eyebrow="Pilot pipeline"
              title="Turn team interest into qualified pilot requests."
              description="This is not just a contact button anymore. Use this form to capture buyer intent, company context, team size, and the exact workflow they want Codhak to support."
            />
            <DemoRequestCard
              source="teams_page"
              intent="team_demo"
              title="Request a cohort walkthrough"
              description="For bootcamps, universities, coding clubs, and upskilling teams that want a live pilot conversation."
              submitLabel="Request pilot walkthrough"
              defaultUseCase="Bootcamp cohort"
            />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function PricingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const leadIntent = searchParams.get('intent');
  const pricingLeadIntent =
    leadIntent === 'teams_growth' || leadIntent === 'custom_plan' || leadIntent === 'interview_sprint'
      ? leadIntent
      : 'custom_plan';
  const pricingLeadCopy =
    pricingLeadIntent === 'teams_growth'
      ? {
          title: 'Talk about Teams Growth',
          description: 'Capture high-value multi-cohort demand while the product stays lean and pilot-friendly.',
          useCase: 'Multi-cohort bootcamp program',
          label: 'Submit growth inquiry',
        }
      : pricingLeadIntent === 'interview_sprint'
      ? {
          title: 'Need a guided Interview Sprint rollout?',
          description: 'Self-serve checkout now handles the standard sprint, and this form stays available for people who want a more hands-on version.',
          useCase: 'Interview prep sprint',
          label: 'Submit sprint inquiry',
        }
      : {
          title: 'Talk about a custom rollout',
          description: 'Capture qualified interest for Teams Growth and Custom without forcing enterprise complexity into the product.',
          useCase: 'Internal upskilling team',
          label: 'Submit team inquiry',
        };

  usePageMetadata({
    title: 'Codhak Pricing | Benchmark, Pro, Interview Sprint, and Teams',
    description: 'See Codhak pricing for individuals, interview prep, cohorts, and team plans.',
  });
  useTrackPage('pricing_viewed', { page: 'pricing' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Pricing"
            title="Pay for benchmarking, roadmap depth, and team visibility."
            description="Free gets people to the first benchmark. Paid unlocks full reports, personalized practice, progress history, and cohort dashboards."
          />
          <div className="mt-12">
            <PricingGrid openAuthModal={openAuthModal} />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">What is free</div>
              <ul className="mt-4 space-y-3">
                {['First benchmark', 'Starter path', 'Limited duels', 'Public profile basics'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">What unlocks first</div>
              <ul className="mt-4 space-y-3">
                {[
                  'Full skill reports',
                  'Personalized roadmap',
                  'Unlimited assessed practice',
                  'Interview tracks and advanced duel analytics',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Revenue path</div>
              <h3 className="mt-3 text-2xl font-semibold text-foreground">Use pricing to route people into the right motion.</h3>
              <div className="mt-6 space-y-4">
                {[
                  'Free, Pro, and Interview Sprint should self-serve through benchmark, report, pricing, and in-app upgrades.',
                  'Interview Sprint is still a strong high-intent offer for job seekers who want a short, focused prep window.',
                  'Teams, Teams Growth, and Custom should create qualified leads instead of vague clicks.',
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <DemoRequestCard
              source="pricing_page"
              intent={pricingLeadIntent}
              title={pricingLeadCopy.title}
              description={pricingLeadCopy.description}
              submitLabel={pricingLeadCopy.label}
              defaultUseCase={pricingLeadCopy.useCase}
            />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function FaqPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();

  usePageMetadata({
    title: 'Codhak FAQ | Benchmark, Duels, Teams, and AI Use',
    description: 'Answers about Codhak benchmarks, interview prep, teams, installation, and anti-cheat handling.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto max-w-4xl px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title="The public experience should answer these clearly."
            description="These questions build trust, reduce ambiguity, and keep the positioning sharp."
            align="center"
          />
          <div className="mt-12">
            <FaqList />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function ReportSamplePage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);

  usePageMetadata({
    title: 'Codhak Sample Skill Report',
    description: 'Preview the skill report Codhak generates after a benchmark.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Sample Report"
            title="Preview the benchmark output before asking anyone to sign up."
            description="The report is where Codhak earns trust: score, strengths, weaknesses, track recommendation, and duel readiness in one view."
          />
          <div className="mt-12">
            <BenchmarkReportCard report={sampleReport} />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function SharedReportPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { publicToken } = useParams();
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSharedReport = async () => {
      if (!publicToken) {
        setError('Shared benchmark report not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextReport = await fetchSharedBenchmarkReport(publicToken);
        if (cancelled) return;

        if (!nextReport) {
          setError('Shared benchmark report not found.');
          setReport(null);
          return;
        }

        setReport(nextReport);
        setError('');
        trackEvent('benchmark_shared_report_viewed', {
          language: nextReport.setup.language,
          goal: nextReport.setup.goal,
          roleLevel: nextReport.setup.roleLevel,
          score: nextReport.overallScore,
        });
      } catch (nextError: any) {
        if (cancelled) return;
        setReport(null);
        setError(nextError?.message || 'Could not load the shared benchmark report.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSharedReport();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  usePageMetadata({
    title: report
      ? `Codhak Shared Benchmark | ${report.overallScore}/100 in ${report.setup.language.toUpperCase()}`
      : 'Codhak Shared Benchmark Report',
    description: report
      ? `See a shared Codhak benchmark report for ${report.setup.language}, including strengths, weaknesses, and recommended next steps.`
      : 'View a shared Codhak benchmark report.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-card">
              Loading shared benchmark report...
            </div>
          ) : error || !report ? (
            <TrackOrLandingFallback
              title="Shared report unavailable"
              description={error || 'This shared benchmark report is not available anymore.'}
              ctaHref="/benchmark"
              ctaLabel="Start your own benchmark"
            />
          ) : (
            <div className="space-y-8">
              <SectionHeader
                eyebrow="Shared Benchmark Report"
                title="A public proof-of-skill snapshot from Codhak."
                description="This report was intentionally shared from a completed Codhak benchmark so other people can see the score, focus areas, and next recommended path."
              />
              <BenchmarkReportCard
                report={report}
                actions={
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.5rem] border border-border bg-background/70 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Why this matters
                      </div>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        Codhak is designed to turn coding practice into visible skill evidence. Benchmarks create a score, roadmap, and repeatable improvement signal instead of a vague learning streak.
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Run your own benchmark
                      </div>
                      <p className="mt-3 text-sm leading-7 text-foreground/80">
                        Choose a goal, language, and level, then get a Codhak report immediately after completion.
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <ActionButton to="/benchmark" label="Start free benchmark" primary />
                        <ActionButton to="/pricing" label="See plans" />
                      </div>
                    </div>
                  </div>
                }
              />
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function SharedTeamProofPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { publicToken } = useParams();
  const [proof, setProof] = useState<PublicTeamProof | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const loadSharedTeamProof = async () => {
      if (!publicToken) {
        setError('Shared team proof page not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextProof = await fetchSharedTeamProof(publicToken);
        if (cancelled) return;

        setProof(nextProof);
        setError('');
        trackEvent('team_proof_page_viewed', {
          useCase: nextProof.team.useCase,
          memberCount: nextProof.team.memberCount,
          benchmarkCompletionRate: nextProof.metrics.benchmarkCompletionRate,
          medianScore: nextProof.metrics.medianScore,
        });
      } catch (nextError: any) {
        if (cancelled) return;
        setProof(null);
        setError(nextError?.message || 'Could not load the shared team proof page.');
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSharedTeamProof();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  usePageMetadata({
    title: proof ? `Codhak Team Proof | ${proof.team.name}` : 'Codhak Shared Team Proof',
    description: proof
      ? `See benchmark completion, score movement, and practice focus for ${proof.team.name} inside Codhak.`
      : 'View a shared Codhak team proof page.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-card">
              Loading shared team proof...
            </div>
          ) : error || !proof ? (
            <TrackOrLandingFallback
              title="Shared team proof unavailable"
              description={error || 'This shared team proof page is not available anymore.'}
              ctaHref="/teams"
              ctaLabel="See team plans"
            />
          ) : (
            <div className="space-y-10">
              <SectionHeader
                eyebrow="Shared Team Proof"
                title={`${proof.team.name} is using Codhak to benchmark and prove improvement.`}
                description="This page was intentionally shared from a live Codhak team workspace. It turns private cohort performance into a clean public proof surface for schools, bootcamps, and hiring or upskilling teams."
              />

              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card sm:p-8">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {formatTeamUseCaseLabel(proof.team.useCase)}
                    </span>
                    {proof.team.publicSharedAt ? (
                      <span className="rounded-full border border-border bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        Shared {new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(proof.team.publicSharedAt))}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-5 text-3xl font-bold font-display tracking-tight text-foreground sm:text-4xl">
                    Benchmark completion, score movement, and the next practice block in one view.
                  </h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                    {proof.team.description || 'This team uses Codhak to benchmark learners quickly, assign follow-up practice, and measure whether skill is actually improving over time.'}
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <FeatureCard
                      icon={<Users className="h-5 w-5" />}
                      title={`${proof.team.memberCount} learners`}
                      description={`${proof.metrics.benchmarkCompletionRate}% of this cohort has a recorded benchmark.`}
                    />
                    <FeatureCard
                      icon={<BarChart3 className="h-5 w-5" />}
                      title={`${proof.metrics.medianScore ?? '--'}/100 median`}
                      description="Median score is based on each learner's latest benchmark."
                    />
                    <FeatureCard
                      icon={<Zap className="h-5 w-5" />}
                      title={`${proof.metrics.averageImprovement ?? '--'} pts`}
                      description="Average movement across learners with repeat benchmark history."
                    />
                    <FeatureCard
                      icon={<Trophy className="h-5 w-5" />}
                      title={proof.metrics.topPerformer?.name ?? 'Benchmark in progress'}
                      description={
                        proof.metrics.topPerformer
                          ? `${proof.metrics.topPerformer.score ?? '--'}/100 with a ${proof.metrics.topPerformer.streak}-day streak.`
                          : 'Top performer appears here once the cohort starts benchmarking.'
                      }
                    />
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card sm:p-8">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Progress over time
                  </div>
                  <div className="mt-5 space-y-4">
                    {proof.metrics.progressTimeline.map((entry) => {
                      const value = entry.value ?? 0;
                      return (
                        <div key={entry.label}>
                          <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            <span>{entry.label}</span>
                            <span>{entry.value ?? '--'}/100</span>
                          </div>
                          <div className="h-2 rounded-full bg-background">
                            <div className="h-2 rounded-full bg-primary" style={{ width: `${value}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 p-5">
                    <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                      Want this for your cohort?
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground/80">
                      Start with the benchmark, then use Codhak to assign follow-up practice, run duels, and publish proof of progress when you are ready.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <ActionButton to="/teams" label="See team plans" primary />
                      <ActionButton to="/benchmark" label="Run your own benchmark" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Improvement leaders
                  </div>
                  <div className="mt-5 space-y-3">
                    {proof.improvementLeaders.length > 0 ? (
                      proof.improvementLeaders.map((member) => (
                        <div key={member.userId} className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold text-foreground">{member.publicName}</div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {member.recommendedAction}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-foreground">
                                {member.latestBenchmarkScore ?? '--'}/100
                              </div>
                              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                                {member.improvementDelta !== null
                                  ? `${member.improvementDelta > 0 ? '+' : ''}${member.improvementDelta} pts`
                                  : `${member.benchmarkCount} benchmark${member.benchmarkCount === 1 ? '' : 's'}`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                        Improvement leaders appear after the cohort completes repeat benchmarks.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Current assignment focus
                  </div>
                  <div className="mt-5 space-y-3">
                    {proof.assignments.length > 0 ? (
                      proof.assignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-2xl border border-border bg-background/70 px-4 py-4">
                          <div className="text-sm font-semibold text-foreground">{assignment.title}</div>
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                            <span>{assignment.assignmentType.replace('_', ' ')}</span>
                            <span>{assignment.benchmarkLanguage ? assignment.benchmarkLanguage.toUpperCase() : 'Mixed'}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
                        No public assignments are visible yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function TrackLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackId } = useParams();
  const track = interviewTracks.find((entry) => entry.id === trackId);

  usePageMetadata({
    title: track ? `Codhak Track | ${track.title}` : 'Codhak Practice Track',
    description: track?.description ?? 'Explore a Codhak practice track built around measurable coding skill.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {track ? (
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <SectionHeader eyebrow="Practice Track" title={track.title} description={track.description} />
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ActionButton to={track.benchmarkLanguage ? `/benchmark/${track.benchmarkLanguage}` : '/benchmark'} label={track.ctaLabel} primary />
                  <button
                    type="button"
                    onClick={() => {
                      if (user) {
                        navigate('/app?section=practice');
                        return;
                      }
                      openAuthModal('signup');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <span>{user ? 'Open practice workspace' : 'Save and continue in practice'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Highlighted skills</div>
                  <ul className="mt-5 space-y-3">
                    {track.highlightedSkills.map((skill) => (
                      <li key={skill} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                        <span>{skill}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Why this page exists</div>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    This route is part of the SEO and landing-page foundation for track-specific acquisition and clear internal linking from benchmark reports.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <TrackOrLandingFallback
              title="Track not found"
              description="This practice track is not available yet, but the benchmark and core interview-readiness paths are already live."
              ctaHref="/benchmark"
              ctaLabel="Start the benchmark"
            />
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function LanguageLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { language } = useParams();
  const slug = language as LanguageSlug | undefined;
  const relatedTracks = interviewTracks.filter((track) => track.language === slug || track.language === 'multi');

  usePageMetadata({
    title: slug ? `Codhak ${slug.toUpperCase()} Practice` : 'Codhak Language Practice',
    description: 'Benchmark language skill and move into a practical roadmap.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Language Page"
            title={slug ? `${slug.toUpperCase()} benchmark and practice` : 'Language benchmark and practice'}
            description={slug ? languagePageDescriptions[slug] : 'Benchmark language skill, then move into a practical roadmap built for measurable progress.'}
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ActionButton to={slug ? `/benchmark/${slug}` : '/benchmark'} label="Start benchmark" primary />
            <ActionButton to="/pricing" label="See pricing" />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {relatedTracks.map((track) => (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{track.audience}</div>
                <div className="mt-3 text-xl font-bold font-display text-foreground">{track.title}</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{track.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function InterviewPrepLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();
  const track = interviewTracks.find((entry) => entry.id === slug);

  usePageMetadata({
    title: track ? `Codhak Interview Prep | ${track.title}` : 'Codhak Interview Prep',
    description: track?.description ?? 'Interview-style coding practice with measurable next steps.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {track ? (
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <SectionHeader eyebrow="Interview Prep" title={track.title} description={track.description} />
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <ActionButton to={track.benchmarkLanguage ? `/benchmark/${track.benchmarkLanguage}` : '/benchmark'} label={track.ctaLabel} primary />
                  <button
                    type="button"
                    onClick={() => {
                      if (user) {
                        navigate('/app?section=duels');
                        return;
                      }
                      openAuthModal('signup');
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    <span>{user ? 'Open duel workspace' : 'Create account for duels'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">What this path includes</div>
                <ul className="mt-5 space-y-3">
                  {track.highlightedSkills.map((skill) => (
                    <li key={skill} className="flex items-start gap-2 text-sm text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <TrackOrLandingFallback
              title="Interview prep page"
              description="This route is reserved for track-specific interview-prep acquisition pages."
              ctaHref="/benchmark"
              ctaLabel="Start the benchmark"
            />
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function TeamUseCasePage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { useCase } = useParams();
  const entry = teamUseCases.find((item) => item.slug === useCase);

  usePageMetadata({
    title: entry ? `Codhak Teams | ${entry.title}` : 'Codhak Team Use Case',
    description: entry?.description ?? 'A team workflow for benchmarking and coaching coding skill.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {entry ? (
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <SectionHeader eyebrow="Team Use Case" title={entry.title} description={entry.description} />
                <ul className="mt-8 space-y-3">
                  {entry.outcomes.map((outcome) => (
                    <li key={outcome} className="flex items-start gap-2 text-sm leading-7 text-foreground">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-xp" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <ActionButton to="/teams" label={entry.primaryCta} primary />
                </div>
              </div>
              <TeamsWorkspace mode={user ? 'app' : 'public'} />
            </div>
          ) : (
            <TrackOrLandingFallback
              title="Team workflow not found"
              description="The teams landing surface is live, but this specific use-case page is not available yet."
              ctaHref="/teams"
              ctaLabel="Open teams page"
            />
          )}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function CompilerLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { language } = useParams();
  const label = language ? language.toUpperCase() : 'Language';

  usePageMetadata({
    title: `Codhak ${label} Compiler and Practice`,
    description: `Use Codhak to benchmark ${label} skill and move into browser-based practice and duels.`,
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-5 sm:px-6 xl:px-8">
          <TrackOrLandingFallback
            title={`${label} compiler and practice`}
            description={`This route exists as part of the SEO foundation for compiler and language-specific landing pages. The strongest current action is still the benchmark-first flow for ${label}.`}
            ctaHref={language ? `/benchmark/${language}` : '/benchmark'}
            ctaLabel="Start benchmark"
          />
        </div>
      </section>
    </MarketingLayout>
  );
}
