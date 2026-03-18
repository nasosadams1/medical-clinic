import React, { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, BarChart3, BadgeCheck, Briefcase, Building2, CheckCircle2, GraduationCap, Swords, Target, Users } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BenchmarkExperience from '../benchmark/BenchmarkExperience';
import BenchmarkReportCard from '../benchmark/BenchmarkReportCard';
import TeamsWorkspace from '../teams/TeamsWorkspace';
import MarketingLayout from './MarketingLayout';
import { useAuth } from '../../context/AuthContext';
import { buildSampleBenchmarkReport } from '../../data/benchmarkCatalog';
import {
  audienceSegments,
  faqItems,
  interviewTracks,
  pricingPlans,
  publicProductMetrics,
  teamUseCases,
  testimonialPlaceholders,
  type LanguageSlug,
} from '../../data/siteContent';
import { trackEvent } from '../../lib/analytics';
import { usePageMetadata } from '../../lib/pageMeta';

type AuthModalView = 'login' | 'signup';

interface PublicPageProps {
  openAuthModal: (view?: AuthModalView) => void;
}

const trustBarMetrics = [
  { label: 'Challenges completed', value: 'Live telemetry ready', helper: 'Hook benchmark and practice completion here.' },
  { label: 'Duel matches played', value: 'Live telemetry ready', helper: 'Track duel volume and competitive activity here.' },
  { label: 'Average score improvement', value: 'Benchmark delta ready', helper: 'Show score improvement after repeat benchmarks.' },
  { label: 'Cohort and team usage', value: 'Pilot-ready', helper: 'Teams dashboard and assignments now have a landing surface.' },
];

function useTrackPage(name: Parameters<typeof trackEvent>[0], payload?: Record<string, unknown>) {
  const trackedRef = useRef(false);
  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent(name, payload);
  }, [name, payload]);
}

function usePricingActions(openAuthModal: (view?: AuthModalView) => void) {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (planName: string) => {
    trackEvent('subscription_cta_clicked', { plan: planName });

    if (planName === 'Teams' || planName === 'Teams Growth' || planName === 'Custom') {
      navigate('/teams');
      return;
    }

    if (user) {
      navigate('/app?section=benchmark');
      return;
    }

    openAuthModal('signup');
  };
}

function useTeamDemoCta() {
  const navigate = useNavigate();
  return (useCase?: string) => {
    trackEvent('team_demo_cta_clicked', { useCase: useCase ?? 'general' });
    navigate('/teams');
  };
}

function SectionIntro({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
      <p className="mt-4 text-base leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function PricingGrid({ openAuthModal }: { openAuthModal: (view?: AuthModalView) => void }) {
  const handlePlanClick = usePricingActions(openAuthModal);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      {pricingPlans.map((plan) => (
        <div key={plan.name} className={`rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] ${plan.badge ? 'ring-2 ring-slate-950/5' : ''}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{plan.name}</div>
              <div className="mt-3 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-slate-950">{plan.price}</span>
                <span className="pb-1 text-sm text-slate-500">{plan.cadence}</span>
              </div>
            </div>
            {plan.badge ? (
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">{plan.badge}</span>
            ) : null}
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">{plan.description}</p>
          <ul className="mt-5 space-y-3">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => handlePlanClick(plan.name)}
            className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${
              plan.ctaKind === 'primary'
                ? 'bg-slate-950 text-white hover:bg-slate-800'
                : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>{plan.ctaLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function FaqList({ items }: { items: typeof faqItems }) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <div key={item.question} className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="text-lg font-semibold text-slate-950">{item.question}</div>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.answer}</p>
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
        <SectionIntro
          eyebrow="Sample skill report"
          title="Show learners and teams exactly what they get after the benchmark."
          description="The report is the value moment. It turns a short benchmark into a score, a roadmap, and a duel-readiness signal instead of leaving people to guess what to do next."
        />
        <div className="mt-6 space-y-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          {[
            'Overall score and correct answers',
            'Strengths and focus areas',
            'Recommended track and suggested lessons',
            'Duel-readiness guidance and next steps',
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
              <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-sky-600" />
              <span>{item}</span>
            </div>
          ))}
          <Link to="/report-sample" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
            <span>Open the full sample report</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <BenchmarkReportCard report={sampleReport} />
    </div>
  );
}

export function HomePage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const handleTeamDemo = useTeamDemoCta();
  usePageMetadata({
    title: 'Codhak | Developer Skills Benchmark and Interview Readiness',
    description: 'Measure real coding skill with live challenges, duels, interview-style feedback, and cohort-ready reporting.',
  });
  useTrackPage('homepage_visit', { page: 'home' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8 lg:py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm">
            <BarChart3 className="h-3.5 w-3.5 text-sky-600" />
            <span>Benchmark-first developer skills platform</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Measure real coding skill with live challenges, duels, and interview-style feedback.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            Codhak helps learners get interview-ready and helps cohorts prove progress with hands-on assessments, not passive course completion.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/benchmark" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800">
              <span>Start free benchmark</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/teams" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
              <span>See team plans</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/report-sample" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
              <span>View sample report</span>
            </Link>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {publicProductMetrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
                <div className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{metric.value}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{metric.helper}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
            <Target className="h-4 w-4 text-emerald-600" />
            <span>What new visitors should do first</span>
          </div>
          <div className="mt-6 space-y-4">
            {[
              ['Take benchmark', 'Choose goal, language, and role level before any signup wall.'],
              ['Get skill report', 'See your score, strengths, gaps, and duel readiness immediately.'],
              ['Follow the roadmap', 'Move into lessons, challenge packs, duels, or cohort assignments.'],
            ].map(([title, description], index) => (
              <div key={title} className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Step {index + 1}</div>
                <div className="mt-2 text-lg font-semibold text-slate-950">{title}</div>
                <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Activation target</div>
            <p className="mt-2 text-sm leading-6 text-emerald-900">
              The main activation event is no longer “account created.” It is first completed benchmark plus viewed skill report.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-4">
          {trustBarMetrics.map((metric) => (
            <div key={metric.label} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.04)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{metric.label}</div>
              <div className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{metric.value}</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{metric.helper}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="How it works"
          title="One benchmark, one report, one clear next step."
          description="Codhak is built to move people from vague interest into measurable action fast. The benchmark creates the context for practice, duels, and team workflows."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {[
            ['Take benchmark', 'Choose your goal, language, and target level, then finish a short assessment.', Target],
            ['Get skill report', 'See the score, strengths, weaknesses, and the next path to take.', BarChart3],
            ['Follow roadmap', 'Practice solo, assign to a cohort, or use duels as proof of progress.', Swords],
          ].map(([title, description, IconComponent]) => {
            const Icon = IconComponent as typeof Target;
            return (
              <div key={title} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
                  <Icon className="h-5 w-5 text-slate-900" />
                </div>
                <div className="mt-5 text-xl font-semibold text-slate-950">{title}</div>
                <p className="mt-3 text-sm leading-7 text-slate-600">{description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Built for"
          title="Different buyers, one core value: measurable coding skill."
          description="The same benchmark-first workflow can serve an individual learner, a bootcamp cohort, or a hiring and upskilling team."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {audienceSegments.map((segment) => (
            <Link key={segment.title} to={segment.href} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{segment.title}</div>
              <p className="mt-4 text-sm leading-7 text-slate-600">{segment.description}</p>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <span>{segment.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SampleReportPreview />
      </section>

      <section id="duels" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Tracks and duel prep"
          title="Use tracks, challenge packs, and duels as proof of skill."
          description="Lessons are support content. The core loop is benchmark, report, targeted practice, then measured performance under real conditions."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {interviewTracks.map((track) => (
            <Link key={track.id} to={`/tracks/${track.id}`} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{track.language === 'multi' ? 'Multi-language track' : `${track.language} track`}</div>
              <div className="mt-3 text-xl font-semibold text-slate-950">{track.title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{track.description}</p>
              <ul className="mt-5 space-y-2">
                {track.highlightedSkills.slice(0, 4).map((skill) => (
                  <li key={skill} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <BadgeCheck className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{skill}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700">
                <span>{track.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Team workflows"
          title="Benchmark learners, assign challenge packs, and track improvement in one place."
          description="The team wedge is intentionally lean: enough structure for pilots, without pretending to be heavyweight enterprise software."
        />
        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          {teamUseCases.map((useCase) => (
            <div key={useCase.slug} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{useCase.title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{useCase.description}</p>
              <button
                type="button"
                onClick={() => handleTeamDemo(useCase.slug)}
                className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
              >
                <span>{useCase.primaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Testimonials"
          title="Trust surfaces are built in, even before pilots fill them."
          description="These are placeholder slots for early pilot proof, learner outcomes, and instructor credibility."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {testimonialPlaceholders.map((item) => (
            <div key={item.attribution} className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <p className="text-sm leading-7 text-slate-600">{item.quote}</p>
              <div className="mt-5 text-sm font-semibold text-slate-900">{item.attribution}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-400">Placeholder slot</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Pricing"
          title="Subscription-first pricing, with team plans built in."
          description="The public pricing now centers on benchmarks, reports, practice history, and team dashboards instead of a coin-store-first message."
        />
        <div className="mt-10">
          <PricingGrid openAuthModal={openAuthModal} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="FAQ"
          title="Answer the objections before the visitor asks them."
          description="These are the core questions the public experience should handle cleanly on day one."
        />
        <div className="mt-10">
          <FaqList items={faqItems.slice(0, 4)} />
        </div>
        <div className="mt-6">
          <Link to="/faq" className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800">
            <span>See the full FAQ</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </MarketingLayout>
  );
}

export function BenchmarkPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const params = useParams();
  const language = params.language as LanguageSlug | undefined;

  usePageMetadata({
    title: language ? `Codhak ${language.toUpperCase()} Benchmark` : 'Codhak Benchmark',
    description: 'Take a short coding benchmark, get a skill report, and move into the right interview-readiness path.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <BenchmarkExperience openAuthModal={openAuthModal} presetLanguage={language} />
    </MarketingLayout>
  );
}

export function TeamsPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const handleTeamDemo = useTeamDemoCta();
  usePageMetadata({
    title: 'Codhak Teams | Cohort Benchmarks, Assignments, and Progress Tracking',
    description: 'Benchmark learners, assign practice paths, track progress, and run coding competitions for bootcamps, schools, clubs, and upskilling teams.',
  });
  useTrackPage('team_page_viewed', { page: 'teams' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <SectionIntro
              eyebrow="Teams and cohorts"
              title="Benchmark learners, assign practice, and prove improvement with one practical workflow."
              description="Codhak is positioned for bootcamps, universities, coding clubs, and internal upskilling teams that need a sharper signal than content completion."
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
                  <div key={title} className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100"><Icon className="h-5 w-5 text-slate-900" /></div>
                    <div className="mt-4 text-lg font-semibold text-slate-950">{title}</div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => handleTeamDemo('general')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                <span>See team plans</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
                <span>View pricing</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <TeamsWorkspace mode="public" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Use cases"
          title="A narrow MVP for real pilots, not bloated enterprise theater."
          description="The current teams surface is intentionally scoped: overview, members, assignments, leaderboard, benchmark completion, and progress snapshots."
        />
        <div className="mt-10 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {teamUseCases.map((useCase) => (
            <Link key={useCase.slug} to={`/teams/${useCase.slug}`} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{useCase.title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{useCase.description}</p>
              <ul className="mt-5 space-y-2">
                {useCase.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
            </Link>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function PricingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  usePageMetadata({
    title: 'Codhak Pricing | Benchmark, Pro, Interview Sprint, and Teams',
    description: 'See Codhak pricing for individuals, interview prep, cohorts, and team plans.',
  });
  useTrackPage('pricing_viewed', { page: 'pricing' });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Pricing"
          title="Pay for benchmarking, roadmap depth, and team visibility."
          description="Free gets people to the first benchmark. Paid unlocks full reports, personalized practice, progress history, and cohort dashboards."
        />
        <div className="mt-10">
          <PricingGrid openAuthModal={openAuthModal} />
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
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="FAQ"
          title="The public experience should answer these clearly."
          description="These questions build trust, reduce ambiguity, and keep the positioning sharp."
        />
        <div className="mt-10">
          <FaqList items={faqItems} />
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
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro
          eyebrow="Sample report"
          title="Preview the benchmark output before asking anyone to sign up."
          description="The report is where Codhak earns trust: score, strengths, weaknesses, track recommendation, and duel readiness in one view."
        />
        <div className="mt-10">
          <BenchmarkReportCard report={sampleReport} />
        </div>
      </section>
    </MarketingLayout>
  );
}

function TrackOrLandingFallback({ title, description, ctaHref, ctaLabel }: { title: string; description: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
      <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">{description}</p>
      <Link to={ctaHref} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800">
        <span>{ctaLabel}</span>
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}

export function TrackLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { trackId } = useParams();
  const track = interviewTracks.find((entry) => entry.id === trackId);

  usePageMetadata({
    title: track ? `Codhak Track | ${track.title}` : 'Codhak Practice Track',
    description: track?.description ?? 'Explore a Codhak practice track built around measurable coding skill.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {track ? (
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <SectionIntro eyebrow="Practice track" title={track.title} description={track.description} />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={track.benchmarkLanguage ? `/benchmark/${track.benchmarkLanguage}` : '/benchmark'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800">
                  <span>{track.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/app?section=practice" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
                  <span>Open practice workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Highlighted skills</div>
                <ul className="mt-5 space-y-3">
                  {track.highlightedSkills.map((skill) => (
                    <li key={skill} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Why this page exists</div>
                <p className="mt-4 text-sm leading-7 text-slate-600">
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
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <SectionIntro eyebrow="Language page" title={slug ? `${slug.toUpperCase()} benchmark and practice` : 'Language benchmark and practice'} description="Benchmark language skill, then move into a practical roadmap built for measurable progress." />
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link to={slug ? `/benchmark/${slug}` : '/benchmark'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800">
            <span>Start benchmark</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/pricing" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
            <span>See pricing</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {relatedTracks.map((track) => (
            <Link key={track.id} to={`/tracks/${track.id}`} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(15,23,42,0.10)]">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{track.audience}</div>
              <div className="mt-3 text-xl font-semibold text-slate-950">{track.title}</div>
              <p className="mt-3 text-sm leading-7 text-slate-600">{track.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}

export function InterviewPrepLandingPage({ openAuthModal }: PublicPageProps) {
  const { user } = useAuth();
  const { slug } = useParams();
  const track = interviewTracks.find((entry) => entry.id === slug);

  usePageMetadata({
    title: track ? `Codhak Interview Prep | ${track.title}` : 'Codhak Interview Prep',
    description: track?.description ?? 'Interview-style coding practice with measurable next steps.',
  });

  return (
    <MarketingLayout openAuthModal={openAuthModal} isAuthenticated={!!user}>
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {track ? (
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <SectionIntro eyebrow="Interview prep" title={track.title} description={track.description} />
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to={track.benchmarkLanguage ? `/benchmark/${track.benchmarkLanguage}` : '/benchmark'} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800">
                  <span>{track.ctaLabel}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link to="/app?section=duels" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
                  <span>Open duel workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">What this path includes</div>
              <ul className="mt-5 space-y-3">
                {track.highlightedSkills.map((skill) => (
                  <li key={skill} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
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
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        {entry ? (
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <SectionIntro eyebrow="Team use case" title={entry.title} description={entry.description} />
              <ul className="mt-8 space-y-3">
                {entry.outcomes.map((outcome) => (
                  <li key={outcome} className="flex items-start gap-3 text-sm leading-7 text-slate-700">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
              <Link to="/teams" className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-800">
                <span>{entry.primaryCta}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <TeamsWorkspace mode="public" />
          </div>
        ) : (
          <TrackOrLandingFallback
            title="Team workflow not found"
            description="The teams landing surface is live, but this specific use-case page is not available yet."
            ctaHref="/teams"
            ctaLabel="Open teams page"
          />
        )}
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
      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <TrackOrLandingFallback
          title={`${label} compiler and practice`}
          description={`This route exists as part of the SEO foundation for compiler and language-specific landing pages. The strongest current action is still the benchmark-first flow for ${label}.`}
          ctaHref={language ? `/benchmark/${language}` : '/benchmark'}
          ctaLabel="Start benchmark"
        />
      </section>
    </MarketingLayout>
  );
}
