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
  howItWorksSteps,
  interviewTracks,
  languagePageDescriptions,
  pricingPlans,
  publicProductMetrics,
  teamUseCases,
  testimonialPlaceholders,
  type PricingPlan,
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

const fallbackTrustMetrics = publicProductMetrics;

const learnerPillars = [
  {
    icon: <BookOpen className="h-6 w-6" />,
    title: 'Short lessons',
    description: 'Learn one idea at a time without losing momentum.',
  },
  {
    icon: <Play className="h-6 w-6" />,
    title: 'Real practice',
    description: 'Type code, solve problems, and make patterns stick.',
  },
  {
    icon: <Swords className="h-6 w-6" />,
    title: 'Live duels',
    description: 'Compete under pressure and sharpen speed.',
  },
  {
    icon: <Trophy className="h-6 w-6" />,
    title: 'Visible progress',
    description: 'Track streaks, wins, and score movement over time.',
  },
];

const learnerMomentumCards = [
  {
    title: 'Start small',
    description: 'Pick a language and finish one focused lesson.',
  },
  {
    title: 'Practice daily',
    description: 'Use coding reps, not passive watching, to improve.',
  },
  {
    title: 'Prove progress',
    description: 'Use duels and the skill check to see where you stand.',
  },
];

const skillCheckOutcomes = [
  {
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Starting point',
    description: 'See your current level quickly.',
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: 'Skill gaps',
    description: 'Find what to work on next.',
  },
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: 'Next path',
    description: 'Jump into the right lessons and practice.',
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: 'Progress check',
    description: 'Retake later and see score movement.',
  },
];

const teamProblemCards = [
  {
    title: 'No clean baseline',
    description: 'You cannot coach well if you do not know current level.',
  },
  {
    title: 'No assignment and review flow',
    description: 'A score alone is not enough. Teams need practice, review, and coaching after assessment.',
  },
  {
    title: 'No proof of improvement',
    description: 'Managers and instructors need visible progress by cohort, not scattered notes.',
  },
];

const teamCapabilityCards = [
  'Create a team or cohort',
  'Invite learners, coaches, and admins',
  'Assign benchmarks, roadmaps, and challenge work',
  'Review submissions and score work with coaching notes',
  'Track completion, score movement, and learners who need attention',
  'Publish a public proof page when ready',
];

const learnerPricingPlanNames = new Set(['Free', 'Pro', 'Interview Sprint']);
const teamPricingPlanNames = new Set(['Teams', 'Teams Growth', 'Custom']);

const teamUpgradeHighlights = [
  'Keep the same learner experience for individuals and cohorts',
  'Add assignments, submission reviews, and coaching when a group needs structure',
  'Track completion, score movement, and cohort outcomes in one place',
  'Keep the team workflow in the background until you actually need it',
];

const duelBenefits = [
  {
    title: 'Fast focus',
    description: 'Practice coding under a timer and stay sharp.',
  },
  {
    title: 'Friendly pressure',
    description: 'Turn repetition into competition and momentum.',
  },
  {
    title: 'Real proof',
    description: 'Wins, rankings, and retakes make progress visible.',
  },
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
    navigate({
      pathname: '/teams',
      hash: 'team-demo',
      search: useCase ? `?useCase=${encodeURIComponent(useCase)}` : '',
    });
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

function PricingGrid({
  openAuthModal,
  plans = pricingPlans,
  source = 'pricing_grid',
}: {
  openAuthModal: (view?: AuthModalView) => void;
  plans?: PricingPlan[];
  source?: string;
}) {
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
    trackEvent('subscription_cta_clicked', { plan: planName, source });

    if (planName === 'Custom') {
      navigate('/pricing?intent=custom_plan');
      return;
    }

    if (planName === 'Free') {
      navigate(user ? '/app?section=practice' : '/learn');
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
        {plans.map((plan) => {
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
                    navigate(
                      plan.name === 'Interview Sprint'
                        ? '/app?section=benchmark'
                        : plan.name === 'Teams' || plan.name === 'Teams Growth' || plan.name === 'Custom'
                        ? '/app?section=teams'
                        : '/app?section=practice'
                    );
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
    title: 'Codhak | Learn programming with lessons, practice, and duels',
    description: 'Codhak helps ambitious learners improve with lessons, real coding practice, duels, leaderboards, and optional skill checks.',
  });
  useTrackPage('homepage_visit', { page: 'home' });

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      const summary = await fetchProductAnalyticsSummary();
      if (!summary || cancelled) return;

      setLiveTrustMetrics([
        publicProductMetrics[0],
        {
          label: 'Challenges completed',
          value: `${summary.challengesCompleted}`,
          helper: 'Solved by learners',
        },
        {
          label: 'Duel matches played',
          value: `${summary.duelMatchesPlayed}`,
          helper: 'Live matches',
        },
        publicProductMetrics[2],
      ]);
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const learnerPlans = pricingPlans.filter((plan) => learnerPricingPlanNames.has(plan.name));
  const featuredTracks = interviewTracks.slice(0, 4);
  const sampleReport = useMemo(() => buildSampleBenchmarkReport(), []);

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
              <span className="type-kicker text-primary">
                Built for ambitious learners
              </span>
            </div>

            <h1 className="type-display-hero max-w-[11ch] text-foreground">
              Learn programming by <span className="text-gradient-primary">coding every day</span>.
            </h1>
            <p className="type-body-lg mt-6 max-w-2xl text-muted-foreground">
              Lessons, hands-on practice, duels, and visible progress that keep you improving.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ActionButton to="/learn" label="Start learning free" primary />
              <ActionButton to="/teams" label="For teams" />
              <ActionButton to="/skill-check" label="Take free skill check" />
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> Free to start</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> No install required</span>
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-xp" /> Lessons, practice, duels</span>
            </div>
          </div>

          <div className="rounded-2xl border border-border glass p-6 shadow-elevated sm:p-8">
            <div className="flex items-center gap-3">
              <img src={mascot} alt="Codhak mascot" className="h-12 w-12 animate-float" />
              <div>
                <div className="type-kicker text-primary">What new visitors should do first</div>
                <div className="type-headline mt-1 text-foreground">Pick a path and start coding</div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {[
                ['Start a lesson', 'Learn one concept fast.', BookOpen],
                ['Practice with code', 'Type answers and build reps.', Play],
                ['Check your level', 'Use the skill check when you want a baseline.', Trophy],
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
                First lesson started or first skill check completed.
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
            eyebrow="Learner Product"
            title="Built to keep you improving."
            description="Learn, practice, compete, repeat."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1480px] gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {learnerPillars.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="How It Works"
            title="A simple loop that keeps you moving."
            description="Short steps. Real reps. Clear progress."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1320px] gap-8 md:grid-cols-3">
            {howItWorksSteps.map((step, index) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <span className="text-2xl font-bold font-mono">{String(index + 1).padStart(2, '0')}</span>
                </div>
                <h3 className="text-lg font-bold font-display text-foreground">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Start Here"
            title="Choose your starting point."
            description="Learners first. Teams when you need them."
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
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-8">
              <SectionHeader
                eyebrow="Skill Check"
                title="See where you stand."
                description="Use the skill check when you want a fast baseline and a clearer next path."
              />
              <div className="grid gap-4 md:grid-cols-2">
                {skillCheckOutcomes.map((item) => (
                  <FeatureCard
                    key={item.title}
                    icon={item.icon}
                    title={item.title}
                    description={item.description}
                  />
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <ActionButton to="/skill-check" label="Take free skill check" primary />
                <ActionButton to="/report-sample" label="View sample report" />
              </div>
            </div>
            <div className="space-y-4">
              <BenchmarkReportCard report={sampleReport} />
              <div className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-muted-foreground shadow-card">
                Preview the full report first, then take your own skill check when you want a baseline.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Popular Paths"
            title="Learn with a clear direction."
            description="Start with a path, then practice until the patterns click."
            align="center"
          />
          <div className="mx-auto mt-12 grid max-w-[1480px] gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredTracks.map((track) => (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {track.language === 'multi' ? 'Multi-language path' : `${track.language} path`}
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
            eyebrow="Competition"
            title="Use duels and ranks to stay motivated."
            description="Turn practice into something you want to come back to."
            align="center"
          />
          <div className="mx-auto mt-10 grid max-w-[1480px] gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-6 md:grid-cols-3">
              {duelBenefits.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="text-lg font-bold font-display text-foreground">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Momentum loop</div>
              <div className="mt-3 text-2xl font-bold font-display text-foreground">Lessons build skill. Duels build sharpness.</div>
              <p className="mt-4 text-sm leading-7 text-foreground/80">
                Use practice for repetition, then jump into duels when you want pressure, speed, and proof.
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <ActionButton to="/duels" label="See duels" primary />
                <ActionButton to="/practice" label="Open practice paths" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Reviews"
            title="Trust elements are built into the design."
            description="Replace these with pilot quotes."
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
            title="Start free. Upgrade when you want more."
            description="Learner plans first. Team training when a group needs structure."
            align="center"
          />
          <div className="mx-auto mt-12 max-w-[1480px]">
            <PricingGrid openAuthModal={openAuthModal} plans={learnerPlans} source="home_learner_pricing" />
          </div>
          <div className="mt-8 text-center">
            <Link to="/pricing" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-accent">
              <span>View full pricing and team plans</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionHeader
              eyebrow="Training For Teams"
              title="Codhak for teams stays in the background until you need it."
              description="Use the same learner product, then add assignments, review workflow, coaching notes, and cohort visibility for groups."
            />
            <div className="rounded-[1.75rem] border border-border bg-card p-6 shadow-card sm:p-8">
              <div className="space-y-3">
                {teamUpgradeHighlights.map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm leading-7 text-foreground">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-xp" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => handleTeamDemo('general')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  <span>See team plans</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <ActionButton to="/teams" label="Explore teams" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/25 py-24">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title="Everything important, answered simply."
            description="Learner questions first. Team answers included."
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
            Ready to start coding?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Start with lessons and practice, then use the skill check when you want a clearer baseline.
          </p>
          <div className="mt-8 flex justify-center">
            <ActionButton to="/learn" label="Start learning free" primary />
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function LearnPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();

  usePageMetadata({
    title: 'Codhak Learn | Learn programming with lessons and practice',
    description: 'Start learning with short lessons, hands-on coding, and visible progress.',
  });
  useTrackPage('learn_page_view', { page: 'learn' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] xl:px-8">
          <div>
            <SectionHeader
              eyebrow="Learn"
              title="Build skill one lesson at a time."
              description="Start with guided lessons, then move straight into coding reps and visible progress."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionButton to="/app?section=practice" label="Start learning free" primary />
              <ActionButton to="/skill-check" label="Take free skill check" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {learnerPillars.map((item) => (
              <FeatureCard key={item.title} icon={item.icon} title={item.title} description={item.description} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Paths"
            title="Choose a language and get moving."
            description="Each path combines lessons, practice, and a later skill check."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {interviewTracks.slice(0, 4).map((track) => (
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

export function PracticePage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();

  usePageMetadata({
    title: 'Codhak Practice | Hands-on coding practice that compounds',
    description: 'Practice real coding, build streaks, and sharpen problem-solving skill.',
  });
  useTrackPage('practice_page_view', { page: 'practice' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] xl:px-8">
          <div>
            <SectionHeader
              eyebrow="Practice"
              title="Practice until the patterns stick."
              description="Use guided paths, repeat real coding reps, and build consistency before you retake the skill check."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ActionButton to="/app?section=practice" label="Open practice" primary />
              <ActionButton to="/skill-check" label="Check your level" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {learnerMomentumCards.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-lg font-bold font-display text-foreground">{item.title}</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Practice Paths"
            title="Popular ways to train."
            description="Start with a path, then let practice and duels do the rest."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {interviewTracks.map((track) => (
              <Link
                key={track.id}
                to={`/tracks/${track.id}`}
                className="rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {track.language === 'multi' ? 'Multi-language path' : `${track.language} path`}
                </div>
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

export function DuelsPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  usePageMetadata({
    title: 'Codhak Duels | Compete with code and sharpen under pressure',
    description: 'Use coding duels, rankings, and challenge pressure to sharpen speed and focus.',
  });
  useTrackPage('duels_page_view', { page: 'duels' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto grid gap-10 px-5 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] xl:px-8">
          <div>
            <SectionHeader
              eyebrow="Duels"
              title="Compete, focus, repeat."
              description="Duels turn solo practice into pressure reps, faster thinking, and visible wins."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  if (user) {
                    navigate('/app?section=duels');
                    return;
                  }
                  openAuthModal('signup');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
              >
                <span>{user ? 'Open duels' : 'Start dueling free'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <ActionButton to="/practice" label="See practice paths" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {duelBenefits.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <div className="text-lg font-bold font-display text-foreground">{item.title}</div>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            ))}
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
    title: presetLanguage ? `Codhak ${presetLanguage.toUpperCase()} Skill Check` : 'Codhak Skill Check',
    description: 'Take a short skill check and get a practical next step.',
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

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="What You Get"
            title="This is more than a quiz."
            description="Use it as a baseline, then move back into learning with a clearer next step."
          />
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {skillCheckOutcomes.map((item) => (
              <FeatureCard
                key={item.title}
                icon={item.icon}
                title={item.title}
                description={item.description}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="team-demo" className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionHeader
              eyebrow="Learners First"
              title="Use the skill check when you want a fast reality check."
              description="It works for individuals first, and teams can layer dashboards on top later."
            />
            <div className="grid gap-4">
              {[
                'Pick your language, goal, and level',
                'Get a score, gaps, and a next path',
                'Retake later to measure improvement',
                'Use the same workflow for cohorts if you need it',
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground shadow-card">
                  {item}
                </div>
              ))}
              <div className="flex flex-col gap-3 sm:flex-row">
                <ActionButton to="/learn" label="Start learning" primary />
                <ActionButton to="/teams" label="Use this with a team" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function TeamsPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const handleTeamDemo = useTeamDemoCta();

  usePageMetadata({
    title: 'Codhak Teams | Bring Codhak to a cohort or team',
    description:
      'Add team dashboards, assignments, submission reviews, coaching notes, and cohort progress tracking on top of the Codhak learner experience.',
  });
  useTrackPage('team_page_viewed', { page: 'teams' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <div className="max-w-4xl">
            <SectionHeader
              eyebrow="Teams"
              title="Bring Codhak to a team."
              description="Use the same lessons, practice, skill checks, and duels, then add assignments, reviews, coaching, and cohort tracking on top."
            />
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ['Bootcamps', 'Track readiness, assign follow-up work, and review submissions fast.', GraduationCap],
                ['Universities', 'Assign practice by class and keep coaching visible.', Building2],
                ['Coding clubs', 'Run competitions, challenge packs, and follow-up reviews.', Users],
                ['Upskilling teams', 'Benchmark juniors and coach measurable progress.', Briefcase],
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
                <span>Book a demo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <ActionButton to={user ? '/app?section=teams' : '/pricing'} label={user ? 'Open teams workspace' : 'See team pricing'} />
            </div>
          </div>

          <div className="mt-10">
            <TeamsWorkspace mode="public" />
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <SectionHeader
              eyebrow="Why Teams Upgrade"
              title="Add team structure without changing the learner product."
              description="Codhak stays learner-first, then adds benchmarking, assignments, reviews, and coaching when a group needs structure."
            />
            <div className="grid gap-4">
              {teamProblemCards.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-card p-6 shadow-card">
                  <div className="text-lg font-bold font-display text-foreground">{item.title}</div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Admin Actions"
            title="What a manager or coach can do."
            description="Run the whole learner workflow from one team surface: assign work, review submissions, coach learners, and track outcomes."
          />
          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teamCapabilityCards.map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card px-5 py-4 text-sm text-foreground shadow-card">
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Use Cases"
            title="Where teams use it."
            description="Bootcamps, classrooms, clubs, and internal training teams."
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
              eyebrow="Next Step"
              title="Book a pilot walkthrough."
              description="Use this for cohort pilots, larger groups, or custom training rollouts."
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
  const learnerPlans = pricingPlans.filter((plan) => learnerPricingPlanNames.has(plan.name));
  const teamPlans = pricingPlans.filter((plan) => teamPricingPlanNames.has(plan.name));
  const pricingLeadIntent =
    leadIntent === 'custom_plan' || leadIntent === 'interview_sprint'
      ? leadIntent
      : 'custom_plan';
  const pricingLeadCopy =
    pricingLeadIntent === 'interview_sprint'
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
    title: 'Codhak Pricing | Free, Pro, Sprint, and Teams',
    description: 'See learner plans first, then explore team pricing when you need it.',
  });
  useTrackPage('pricing_viewed', { page: 'pricing' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Pricing"
            title="Start free. Upgrade when you want more."
            description="Learner plans come first. Team pricing is there when a group needs structure."
          />
          <div className="mt-12">
            <PricingGrid openAuthModal={openAuthModal} plans={learnerPlans} source="pricing_page_learner" />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Free gives you</div>
              <ul className="mt-4 space-y-3">
                {['Guided lessons', 'Starter practice path', 'Limited duels', 'One free skill check'].map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-xp" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Pro unlocks</div>
              <ul className="mt-4 space-y-3">
                {[
                  'Unlimited assessed practice',
                  'Full skill reports and roadmap',
                  'Progress history and retakes',
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

          <div className="mt-16 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <SectionHeader
              eyebrow="Teams"
              title="Need training for a group?"
              description="Teams stay secondary: same learner product, plus dashboards, assignments, and cohort visibility."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {teamPlans.map((plan) => (
                <div key={plan.name} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{plan.name}</div>
                  <div className="mt-3 text-2xl font-bold font-display text-foreground">
                    {plan.price}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">{plan.cadence}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{plan.description}</p>
                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 3).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-5">
                    {plan.name === 'Custom' ? (
                      <Link
                        to="/teams#team-demo"
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        <span>{plan.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    ) : (
                      <Link
                        to={user ? '/app?section=store' : '/signup'}
                        onClick={(event) => {
                          if (!user) {
                            event.preventDefault();
                            openAuthModal('signup');
                            return;
                          }
                          trackEvent('subscription_cta_clicked', {
                            plan: plan.name,
                            source: 'pricing_page_team_section',
                          });
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
                      >
                        <span>{plan.ctaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[1.5rem] border border-border bg-card p-6 shadow-card">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">What Teams Add</div>
              <div className="mt-6 space-y-4">
                {teamUpgradeHighlights.map((item) => (
                  <div key={item} className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm leading-7 text-muted-foreground">
                    <div className="font-semibold text-foreground">{item}</div>
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
    title: 'Codhak FAQ | Lessons, practice, skill checks, and teams',
    description: 'Answers about learning with Codhak, using the skill check, and bringing Codhak to a team.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto max-w-4xl px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="FAQ"
            title="Answers for learners first."
            description="Quick answers about learning, practice, skill checks, and teams."
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
    title: 'Codhak Sample Skill Check Report',
    description: 'Preview the report Codhak generates after a skill check.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Sample Report"
            title="Preview the skill check output before signing up."
            description="The report shows score, strengths, gaps, next path, and duel readiness in one place."
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
        setError('Shared skill check report not found.');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextReport = await fetchSharedBenchmarkReport(publicToken);
        if (cancelled) return;

        if (!nextReport) {
          setError('Shared skill check report not found.');
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
        setError(nextError?.message || 'Could not load the shared skill check report.');
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
      ? `Codhak Shared Skill Check | ${report.overallScore}/100 in ${report.setup.language.toUpperCase()}`
      : 'Codhak Shared Skill Check Report',
    description: report
      ? `See a shared Codhak skill check report for ${report.setup.language}, including strengths, gaps, and recommended next steps.`
      : 'View a shared Codhak skill check report.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          {loading ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-sm text-muted-foreground shadow-card">
              Loading shared skill check report...
            </div>
          ) : error || !report ? (
            <TrackOrLandingFallback
              title="Shared report unavailable"
              description={error || 'This shared skill check report is not available anymore.'}
              ctaHref="/skill-check"
              ctaLabel="Take your own skill check"
            />
          ) : (
            <div className="space-y-8">
              <SectionHeader
                eyebrow="Shared Skill Check Report"
                title="A public proof-of-progress snapshot from Codhak."
                description="This report was intentionally shared from a completed skill check so other people can see the score, focus areas, and next recommended path."
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
                        Codhak turns practice into visible skill proof.
                      </p>
                    </div>
                    <div className="rounded-[1.5rem] border border-primary/20 bg-primary/10 p-5">
                      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                        Run your own skill check
                      </div>
                      <p className="mt-3 text-sm leading-7 text-foreground/80">
                        Pick a setup and get a report.
                      </p>
                      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                        <ActionButton to="/skill-check" label="Take free skill check" primary />
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
                      Start with the skill check, then use Codhak to assign follow-up practice, run duels, and publish proof of progress when you are ready.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <ActionButton to="/teams" label="See team plans" primary />
                      <ActionButton to="/skill-check" label="Run your own skill check" />
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
                  <ActionButton to={track.benchmarkLanguage ? `/skill-check/${track.benchmarkLanguage}` : '/skill-check'} label={track.ctaLabel} primary />
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
                    Built for search and report linking.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <TrackOrLandingFallback
              title="Track not found"
              description="This track is not live yet."
              ctaHref="/skill-check"
              ctaLabel="Take the skill check"
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
    description: 'Learn a language with practice paths and an optional skill check.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto px-5 sm:px-6 xl:px-8">
          <SectionHeader
            eyebrow="Language Page"
            title={slug ? `${slug.toUpperCase()} practice and skill check` : 'Language practice and skill check'}
            description={slug ? languagePageDescriptions[slug] : 'Practice a language, then use the skill check when you want a clearer baseline.'}
          />
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ActionButton to={slug ? `/skill-check/${slug}` : '/skill-check'} label="Take skill check" primary />
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
                  <ActionButton to={track.benchmarkLanguage ? `/skill-check/${track.benchmarkLanguage}` : '/skill-check'} label={track.ctaLabel} primary />
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
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Included skills</div>
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
              description="This page is not live yet."
              ctaHref="/skill-check"
              ctaLabel="Take the skill check"
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
    description: entry?.description ?? 'A team workflow for coaching and tracking coding skill.',
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
              description="This team page is not live yet."
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
    description: `Use Codhak to practice ${label} in the browser and take a quick skill check when needed.`,
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="py-20">
        <div className="container mx-auto max-w-5xl px-5 sm:px-6 xl:px-8">
          <TrackOrLandingFallback
            title={`${label} compiler and practice`}
            description={`Start with ${label} practice, then use the skill check when you want a baseline.`}
            ctaHref={language ? `/skill-check/${language}` : '/skill-check'}
            ctaLabel="Take skill check"
          />
        </div>
      </section>
    </MarketingLayout>
  );
}
