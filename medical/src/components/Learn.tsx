import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code,
  Database,
  Flame,
  Globe,
  Heart,
  Link2,
  Lock,
  Play,
  RefreshCcw,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import LessonModal from './LessonModal';
import {
  readSavedBenchmarkHistory,
  saveBenchmarkSetupPreset,
  type BenchmarkReport,
  type BenchmarkSetup,
} from '../data/benchmarkCatalog';
import {
  countCompletedLessonsByLanguage,
  formatLessonIdAsDisplayName,
  getLessonCountByLanguage,
  LessonLanguage,
} from '../data/lessonCatalog';
import { loadLessonsModule } from '../data/lessonsLoader';
import { listBenchmarkReports } from '../lib/benchmarkApi';
import { trackEvent } from '../lib/analytics';

type Language = LessonLanguage;
type DifficultyTier = 'Beginner' | 'Intermediate' | 'Advanced';

interface LearnProps {
  setCurrentSection?: (section: string) => void;
  openAuthModal?: (view?: 'login' | 'signup') => void;
  isAuthenticated?: boolean;
}

interface LessonPreview {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  baseXP: number;
  baselineTime: number;
  language: Language;
  category: string;
  isLocked: boolean;
  prerequisite?: string;
  content?: {
    steps?: any[];
    quiz?: any[];
  };
}

type VisibleLesson = LessonPreview & {
  tier: DifficultyTier;
  sortIndex: number;
};

type BenchmarkActionState = {
  title: string;
  description: string;
  primaryLabel: string;
  secondaryLabel?: string;
  shouldRetakeNow: boolean;
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const filters = ['All Paths', 'Recommended', 'Completed', 'Beginner', 'Intermediate', 'Advanced'];

const languageCatalog = [
  {
    id: 'python' as Language,
    name: 'Python',
    icon: Code,
    gradient: 'from-primary to-accent',
    description: 'Backend fundamentals, syntax repair, and applied problem solving.',
  },
  {
    id: 'javascript' as Language,
    name: 'JavaScript',
    icon: Database,
    gradient: 'from-accent to-primary',
    description: 'Interview-style practice for frontend logic, arrays, and functions.',
  },
  {
    id: 'cpp' as Language,
    name: 'C++',
    icon: Globe,
    gradient: 'from-destructive to-orange-500',
    description: 'Structured logic and timed challenge fluency for competitive problem solving.',
  },
  {
    id: 'java' as Language,
    name: 'Java',
    icon: Globe,
    gradient: 'from-coins to-orange-500',
    description: 'Class-ready OOP practice and junior developer backend preparation.',
  },
];

const normalizeDifficultyTier = (difficulty: string): DifficultyTier => {
  const value = String(difficulty || '').toLowerCase();
  if (value.includes('advanced')) return 'Advanced';
  if (value.includes('intermediate')) return 'Intermediate';
  return 'Beginner';
};

const mergeBenchmarkReports = (...reportGroups: Array<Array<BenchmarkReport | null | undefined>>) => {
  const deduped = new Map<string, BenchmarkReport>();

  reportGroups.flat().forEach((report) => {
    if (!report?.id || deduped.has(report.id)) return;
    deduped.set(report.id, report);
  });

  return Array.from(deduped.values()).sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
};

const formatBenchmarkDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));

const getReportAgeInDays = (report: BenchmarkReport | null) => {
  if (!report) return null;
  const createdAt = new Date(report.createdAt).getTime();
  if (Number.isNaN(createdAt)) return null;
  return Math.max(0, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60 * 24)));
};

const buildBenchmarkActionState = (
  report: BenchmarkReport | null,
  suggestedLessonsCompleted: number,
  suggestedLessonCount: number,
  scoreDelta: number | null
): BenchmarkActionState => {
  if (!report) {
    return {
      title: 'Start the first benchmark',
      description: 'Measure the current baseline before spending more time in lessons, so practice has a clear target.',
      primaryLabel: 'Run benchmark',
      secondaryLabel: 'Benchmark first',
      shouldRetakeNow: false,
    };
  }

  const reportAgeDays = getReportAgeInDays(report) ?? 0;
  const finishedSuggestedLessons =
    suggestedLessonCount > 0 && suggestedLessonsCompleted >= Math.max(1, Math.min(2, suggestedLessonCount));

  if (finishedSuggestedLessons || reportAgeDays >= 7 || (scoreDelta !== null && scoreDelta >= 8)) {
    return {
      title: 'Retake now and capture improvement',
      description:
        'You have enough new practice signal to make another benchmark meaningful. Turn the last practice block into a visible score delta.',
      primaryLabel: 'Retake benchmark',
      secondaryLabel: 'Open latest report',
      shouldRetakeNow: true,
    };
  }

  if (report.overallScore >= 80) {
    return {
      title: 'Keep sharpening, then benchmark for consistency',
      description:
        'Your current score is already strong. Use practice to reinforce weak spots and retake later to prove the level holds under another timed pass.',
      primaryLabel: 'Open latest report',
      secondaryLabel: 'Retake later',
      shouldRetakeNow: false,
    };
  }

  return {
    title: 'Stay on the roadmap before retaking',
    description:
      'Keep working through the suggested lessons first. The goal is not more activity, it is a stronger next benchmark result.',
    primaryLabel: 'Open latest report',
    secondaryLabel: 'Retake after more practice',
    shouldRetakeNow: false,
  };
};

const difficultyTone: Record<DifficultyTier, string> = {
  Beginner: 'bg-xp/10 text-xp',
  Intermediate: 'bg-coins/10 text-coins',
  Advanced: 'bg-destructive/10 text-destructive',
};

function MetricCard({
  icon,
  label,
  value,
  subtitle,
  tone = 'primary',
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle: string;
  tone?: 'primary' | 'xp' | 'coins' | 'hearts' | 'streak';
}) {
  const iconTone = {
    primary: 'bg-primary/10 text-primary glow-primary',
    xp: 'bg-xp/10 text-xp glow-xp',
    coins: 'bg-coins/10 text-coins glow-coins',
    hearts: 'bg-destructive/10 text-destructive',
    streak: 'bg-streak/10 text-streak animate-streak-fire',
  }[tone];

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-card transition-all duration-300 hover:border-primary/30 hover:shadow-elevated">
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'var(--gradient-card-glow)' }} />
      <div className="relative flex items-start gap-3">
        <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTone)}>{icon}</div>
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="text-2xl font-bold font-display text-foreground">{value}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
        </div>
      </div>
    </div>
  );
}

function LessonSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded bg-secondary" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-secondary" />
        </div>
        <div className="h-4 w-14 animate-pulse rounded bg-secondary" />
      </div>
      <div className="mb-2 h-6 w-3/4 animate-pulse rounded bg-secondary" />
      <div className="mb-2 h-4 w-full animate-pulse rounded bg-secondary/70" />
      <div className="mb-4 h-4 w-5/6 animate-pulse rounded bg-secondary/70" />
      <div className="mb-5 h-9 w-full animate-pulse rounded-xl bg-secondary" />
      <div className="flex items-center justify-between">
        <div className="h-8 w-24 animate-pulse rounded-full bg-secondary/70" />
        <div className="h-10 w-28 animate-pulse rounded-xl bg-secondary" />
      </div>
    </div>
  );
}

const Learn: React.FC<LearnProps> = ({ setCurrentSection, openAuthModal, isAuthenticated = false }) => {
  const navigate = useNavigate();
  const { user, isUnlimitedHeartsActive } = useUser();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const [filter, setFilter] = useState('Recommended');
  const [selectedLesson, setSelectedLesson] = useState<LessonPreview | null>(null);
  const [lessonsModule, setLessonsModule] = useState<Awaited<ReturnType<typeof loadLessonsModule>> | null>(null);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [lessonsReloadKey, setLessonsReloadKey] = useState(0);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkReport[]>([]);
  const [benchmarkHistoryLoading, setBenchmarkHistoryLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    setLessonsError(null);
    setIsLessonsLoading(true);

    void loadLessonsModule()
      .then((module) => {
        if (!isActive) return;
        setLessonsModule(module);
        setIsLessonsLoading(false);
      })
      .catch((error) => {
        if (!isActive) return;
        console.error('Failed to load lessons:', error);
        setLessonsError('Lessons failed to load. Please try again.');
        setIsLessonsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [lessonsReloadKey]);

  useEffect(() => {
    let cancelled = false;

    const localAnonymousHistory = readSavedBenchmarkHistory();
    const localUserHistory = readSavedBenchmarkHistory(user.id);
    const localHistory = mergeBenchmarkReports(localUserHistory, localAnonymousHistory);
    setBenchmarkHistory(localHistory);

    if (!isAuthenticated || !user.id || user.id === 'guest') {
      return;
    }

    const loadBenchmarkHistory = async () => {
      setBenchmarkHistoryLoading(true);
      try {
        const remoteHistory = await listBenchmarkReports(12);
        if (cancelled) return;
        setBenchmarkHistory(mergeBenchmarkReports(remoteHistory, localHistory));
      } catch {
        if (!cancelled) {
          setBenchmarkHistory(localHistory);
        }
      } finally {
        if (!cancelled) {
          setBenchmarkHistoryLoading(false);
        }
      }
    };

    void loadBenchmarkHistory();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user.id]);

  const currentLessons = useMemo<VisibleLesson[]>(() => {
    if (!lessonsModule) return [];

    return lessonsModule.getLessonsByLanguage(selectedLanguage).map((lesson, index) => ({
      ...lesson,
      tier: normalizeDifficultyTier(lesson.difficulty),
      sortIndex: index,
    }));
  }, [lessonsModule, selectedLanguage]);

  const difficultyUnlocks = useMemo(() => {
    const lessonGroups: Record<DifficultyTier, VisibleLesson[]> = {
      Beginner: currentLessons.filter((lesson) => lesson.tier === 'Beginner'),
      Intermediate: currentLessons.filter((lesson) => lesson.tier === 'Intermediate'),
      Advanced: currentLessons.filter((lesson) => lesson.tier === 'Advanced'),
    };

    const beginnerCompleted = lessonGroups.Beginner.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
    const beginnerRatio = lessonGroups.Beginner.length ? beginnerCompleted / lessonGroups.Beginner.length : 1;

    const intermediateCompleted = lessonGroups.Intermediate.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
    const intermediateRatio = lessonGroups.Intermediate.length ? intermediateCompleted / lessonGroups.Intermediate.length : 1;

    return {
      Beginner: true,
      Intermediate: beginnerRatio >= 0.7,
      Advanced: intermediateRatio >= 0.7,
      progress: {
        Beginner: { completed: beginnerCompleted, total: lessonGroups.Beginner.length },
        Intermediate: { completed: intermediateCompleted, total: lessonGroups.Intermediate.length },
      },
    };
  }, [currentLessons, user.completedLessons]);

  const selectedLanguageCompletedCount = useMemo(
    () => countCompletedLessonsByLanguage(selectedLanguage, user.completedLessons),
    [selectedLanguage, user.completedLessons]
  );
  const selectedLanguageTotalLessons = getLessonCountByLanguage(selectedLanguage);

  const filteredLessons = useMemo(() => {
    const tierOrder: Record<DifficultyTier, number> = { Beginner: 0, Intermediate: 1, Advanced: 2 };

    return currentLessons
      .filter((lesson) => {
        if (filter === 'All Paths') return true;
        if (filter === 'Recommended') return !user.completedLessons.includes(lesson.id);
        if (filter === 'Completed') return user.completedLessons.includes(lesson.id);
        if (filter === 'Beginner' || filter === 'Intermediate' || filter === 'Advanced') return lesson.tier === filter;
        return true;
      })
      .sort((left, right) => {
        const tierDelta = tierOrder[left.tier] - tierOrder[right.tier];
        if (tierDelta !== 0) return tierDelta;
        return left.sortIndex - right.sortIndex;
      });
  }, [currentLessons, filter, user.completedLessons]);

  const languageStats = useMemo(
    () =>
      languageCatalog.map((language) => ({
        ...language,
        totalLessons: getLessonCountByLanguage(language.id),
        completedCount: countCompletedLessonsByLanguage(language.id, user.completedLessons),
      })),
    [user.completedLessons]
  );

  const handleRedirectToLearn = () => {
    setSelectedLesson(null);
    setCurrentSection?.('practice');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const getVisibleLessonTitle = (lesson: Pick<LessonPreview, 'id' | 'title'>) =>
    lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)
      ? lesson.title
      : formatLessonIdAsDisplayName(lesson.id);

  const handleStartLesson = (lesson: VisibleLesson) => {
    if (!isAuthenticated) {
      openAuthModal?.('signup');
      return;
    }

    const lessonTier = lesson.tier;
    if (!difficultyUnlocks[lessonTier]) {
      const requiredTier: 'Beginner' | 'Intermediate' = lessonTier === 'Intermediate' ? 'Beginner' : 'Intermediate';
      const progress = difficultyUnlocks.progress[requiredTier];
      const neededCompleted = Math.ceil((progress?.total ?? 0) * 0.7);
      toast.error(`Unlock ${lessonTier} by completing ${neededCompleted}/${progress?.total ?? 0} ${requiredTier} lessons.`);
      return;
    }

    setSelectedLesson({ ...lesson, title: getVisibleLessonTitle(lesson) });
  };

  const selectedTrack = languageStats.find((language) => language.id === selectedLanguage) ?? languageStats[0];
  const selectedProgressPercent = Math.round((selectedLanguageCompletedCount / Math.max(1, selectedLanguageTotalLessons)) * 100);
  const selectedLanguageBenchmarkHistory = useMemo(
    () => benchmarkHistory.filter((entry) => entry.setup.language === selectedLanguage),
    [benchmarkHistory, selectedLanguage]
  );
  const latestLanguageBenchmark = selectedLanguageBenchmarkHistory[0] || null;
  const previousLanguageBenchmark = selectedLanguageBenchmarkHistory[1] || null;
  const latestBenchmarkScoreDelta =
    latestLanguageBenchmark && previousLanguageBenchmark
      ? latestLanguageBenchmark.overallScore - previousLanguageBenchmark.overallScore
      : null;
  const suggestedLessonCount = latestLanguageBenchmark?.suggestedLessonIds.length || 0;
  const suggestedLessonsCompleted = latestLanguageBenchmark
    ? latestLanguageBenchmark.suggestedLessonIds.filter((lessonId) => user.completedLessons.includes(lessonId)).length
    : 0;
  const benchmarkActionState = useMemo(
    () =>
      buildBenchmarkActionState(
        latestLanguageBenchmark,
        suggestedLessonsCompleted,
        suggestedLessonCount,
        latestBenchmarkScoreDelta
      ),
    [latestBenchmarkScoreDelta, latestLanguageBenchmark, suggestedLessonCount, suggestedLessonsCompleted]
  );
  const benchmarkAgeDays = getReportAgeInDays(latestLanguageBenchmark);

  const goToBenchmarkWorkspace = (options?: { openLatestReport?: boolean }) => {
    const nextSetup: BenchmarkSetup = {
      goal: latestLanguageBenchmark?.setup.goal || 'interview_prep',
      language: selectedLanguage,
      roleLevel: latestLanguageBenchmark?.setup.roleLevel || 'junior',
    };

    saveBenchmarkSetupPreset(nextSetup);
    trackEvent('benchmark_retake_cta_clicked', {
      source: 'practice_workspace',
      language: nextSetup.language,
      goal: nextSetup.goal,
      roleLevel: nextSetup.roleLevel,
      hasPreviousReport: Boolean(latestLanguageBenchmark),
      action: options?.openLatestReport ? 'open_latest_report' : benchmarkActionState.shouldRetakeNow ? 'retake' : 'start_or_resume',
    });
    navigate(options?.openLatestReport ? '/app?section=benchmark&report=latest' : '/app?section=benchmark');
  };

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Practice Paths</h1>
          <p className="mt-1 text-muted-foreground">Use lessons to close benchmark gaps, sharpen weak spots, and return to duels with more signal.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => goToBenchmarkWorkspace()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
          >
            <Target className="h-4 w-4" />
            Benchmark
          </button>
          <button
            type="button"
            onClick={() => setCurrentSection?.('duels')}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            <Trophy className="h-4 w-4" />
            Duels
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Selected Path"
          value={`${selectedLanguageCompletedCount}/${selectedLanguageTotalLessons}`}
          subtitle={`${selectedTrack.name} lessons completed`}
          tone="primary"
        />
        <MetricCard
          icon={<Zap className="h-5 w-5" />}
          label="XP"
          value={user.xp.toLocaleString()}
          subtitle={`Level ${user.level}`}
          tone="xp"
        />
        <MetricCard
          icon={<Heart className="h-5 w-5 fill-current" />}
          label="Hearts"
          value={isUnlimitedHeartsActive() ? 'Unlimited' : `${user.hearts}/${user.maxHearts}`}
          subtitle={isUnlimitedHeartsActive() ? 'Practice without interruption' : 'Needed to start lessons'}
          tone="hearts"
        />
        <MetricCard
          icon={<Flame className="h-5 w-5" />}
          label="Streak"
          value={`${user.currentStreak} days`}
          subtitle="Consistency compounds benchmark gains"
          tone="streak"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Support content, not the starting point</span>
          </div>
          <h2 className="mt-5 text-3xl font-bold font-display text-foreground">Practice is here to sharpen exactly what your benchmark exposes.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            Start with the benchmark, then use these paths to repair fundamentals, deepen weak areas, and return to live duel conditions with more confidence.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ['Repair weak spots', 'Use beginner tracks to patch syntax and reading gaps.', CheckCircle2],
              ['Build speed', 'Move into intermediate problems once the basics feel automatic.', Zap],
              ['Prove it live', 'Treat duels as your proof layer after the practice loop.', Trophy],
            ].map(([title, description, IconComponent], index) => {
              const Icon = IconComponent as typeof Target;
              return (
                <div key={title as string} className="rounded-2xl border border-border bg-secondary/40 p-4">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-card text-primary shadow-card">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Step {index + 1}</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">{title}</div>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">{description}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-gradient-to-br from-card via-sidebar to-background p-6 shadow-elevated">
          <div className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            Benchmark momentum
          </div>
          <h3 className="mt-4 text-2xl font-bold font-display text-foreground">
            {latestLanguageBenchmark ? `${selectedTrack.name} benchmark: ${latestLanguageBenchmark.overallScore}/100` : `No ${selectedTrack.name} benchmark yet`}
          </h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            {benchmarkActionState.description}
          </p>
          {benchmarkHistoryLoading ? (
            <div className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">Syncing benchmark history...</div>
          ) : null}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-secondary/45 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Latest report</div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {latestLanguageBenchmark ? formatBenchmarkDate(latestLanguageBenchmark.createdAt) : 'Not started'}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {latestLanguageBenchmark
                  ? benchmarkAgeDays === 0
                    ? 'Completed today'
                    : `${benchmarkAgeDays} day${benchmarkAgeDays === 1 ? '' : 's'} since last benchmark`
                  : 'Measure the baseline before choosing the next path.'}
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/45 p-4">
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Improvement signal</div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {latestBenchmarkScoreDelta === null ? 'Waiting for retake' : `${latestBenchmarkScoreDelta > 0 ? '+' : ''}${latestBenchmarkScoreDelta} pts`}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {latestBenchmarkScoreDelta === null
                  ? 'A second benchmark turns practice into a visible delta.'
                  : 'Score change versus the previous benchmark in this language.'}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-border bg-secondary/35 p-4">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Suggested lesson progress</span>
              <span>{latestLanguageBenchmark ? `${suggestedLessonsCompleted}/${suggestedLessonCount || 0}` : '--'}</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${latestLanguageBenchmark ? Math.round((suggestedLessonsCompleted / Math.max(1, suggestedLessonCount)) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {latestLanguageBenchmark
                ? `${suggestedLessonsCompleted} of ${suggestedLessonCount} suggested lessons from the latest report are already complete.`
                : 'Run the benchmark first to generate a focused lesson list for this language.'}
            </p>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => goToBenchmarkWorkspace()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
            >
              <Target className="h-4 w-4" />
              {benchmarkActionState.primaryLabel}
            </button>
            {latestLanguageBenchmark ? (
              <button
                type="button"
                onClick={() => goToBenchmarkWorkspace({ openLatestReport: true })}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                <ArrowRight className="h-4 w-4" />
                Open latest report
              </button>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-secondary/45 p-5">
            <div className={`inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white ${selectedTrack.gradient}`}>
              {selectedTrack.name} track
            </div>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">{selectedTrack.description}</p>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="font-medium text-muted-foreground">Current progress</span>
              <span className="font-mono font-semibold text-foreground">{selectedProgressPercent}%</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className={`h-full rounded-full bg-gradient-to-r ${selectedTrack.gradient}`} style={{ width: `${selectedProgressPercent}%` }} />
            </div>
            <p className="mt-3 text-xs leading-6 text-muted-foreground">
              {selectedLanguageCompletedCount} of {selectedLanguageTotalLessons} lessons complete in this track.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            {([
              ['Intermediate unlock', difficultyUnlocks.progress.Beginner.completed, difficultyUnlocks.progress.Beginner.total],
              ['Advanced unlock', difficultyUnlocks.progress.Intermediate.completed, difficultyUnlocks.progress.Intermediate.total],
            ] as const).map(([label, completed, total]) => {
              const percent = total ? Math.round((completed / total) * 100) : 100;
              return (
                <div key={label} className="rounded-2xl border border-border bg-secondary/35 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{label}</span>
                    <span>{completed}/{total || 0}</span>
                  </div>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {languageStats.map((language) => {
          const Icon = language.icon;
          const isActive = selectedLanguage === language.id;
          const progressPercent = Math.round((language.completedCount / Math.max(1, language.totalLessons)) * 100);

          return (
            <button
              key={language.id}
              type="button"
              onClick={() => setSelectedLanguage(language.id)}
              className={cx(
                'rounded-2xl border p-5 text-left transition-all duration-300',
                isActive
                  ? `border-transparent bg-gradient-to-r ${language.gradient} text-white shadow-elevated`
                  : 'border-border bg-card shadow-card hover:border-primary/20 hover:shadow-elevated'
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-xl', isActive ? 'bg-white/15' : 'bg-primary/10 text-primary')}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className={cx('text-lg font-bold font-display', isActive ? 'text-white' : 'text-foreground')}>{language.name}</div>
                  <p className={cx('mt-1 text-sm leading-6', isActive ? 'text-white/80' : 'text-muted-foreground')}>{language.description}</p>
                </div>
              </div>
              <div className={cx('mt-4 flex items-center justify-between text-xs uppercase tracking-[0.18em]', isActive ? 'text-white/80' : 'text-muted-foreground')}>
                <span>Progress</span>
                <span>{language.completedCount}/{language.totalLessons}</span>
              </div>
              <div className={cx('mt-3 h-2 w-full overflow-hidden rounded-full', isActive ? 'bg-white/20' : 'bg-secondary')}>
                <div className={cx('h-full rounded-full transition-all duration-500', isActive ? 'bg-white/50' : 'bg-primary')} style={{ width: `${progressPercent}%` }} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((filterOption) => (
          <button
            key={filterOption}
            type="button"
            onClick={() => setFilter(filterOption)}
            className={cx(
              'rounded-full border px-4 py-2 text-sm font-medium transition-all',
              filter === filterOption
                ? 'border-primary bg-primary text-primary-foreground shadow-glow'
                : 'border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            {filterOption}
          </button>
        ))}
      </div>

      {lessonsError ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center shadow-card">
          <h3 className="text-lg font-semibold text-foreground">Lesson list failed to load</h3>
          <p className="mt-2 text-sm text-muted-foreground">{lessonsError}</p>
          <button
            type="button"
            onClick={() => setLessonsReloadKey((value) => value + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-destructive-foreground transition hover:bg-destructive/90"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
        </div>
      ) : null}

      {!lessonsError ? (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {isLessonsLoading
            ? Array.from({ length: 6 }, (_, index) => <LessonSkeleton key={index} />)
            : filteredLessons.length === 0
            ? (
              <div className="col-span-full rounded-2xl border border-border bg-card p-8 text-center shadow-card">
                <h3 className="text-lg font-semibold text-foreground">No practice items match this filter</h3>
                <p className="mt-2 text-sm text-muted-foreground">Try another path level or language to keep your roadmap moving.</p>
              </div>
            )
            : filteredLessons.map((lesson) => {
              const isCompleted = user.completedLessons.includes(lesson.id);
              const isDifficultyLocked = !difficultyUnlocks[lesson.tier];
              const canStartLesson = isAuthenticated && !isDifficultyLocked && (user.hearts > 0 || isUnlimitedHeartsActive());
              const disabledReason = !isAuthenticated
                ? null
                : isDifficultyLocked
                ? 'Tier locked'
                : !canStartLesson
                ? 'No hearts left'
                : null;

              return (
                <div
                  key={`${lesson.id}-${selectedLanguage}`}
                  className={cx(
                    'relative overflow-hidden rounded-2xl border bg-card p-5 shadow-card transition-all duration-300',
                    isDifficultyLocked
                      ? 'border-border/70 opacity-85'
                      : 'border-border hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated'
                  )}
                >
                  <div className="absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100" style={{ background: 'var(--gradient-card-glow)' }} />
                  {isDifficultyLocked ? <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-border" /> : null}

                  <div className="relative">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <BookOpen className={cx('h-5 w-5 shrink-0', isDifficultyLocked ? 'text-muted-foreground' : 'text-primary')} />
                        <span className={cx('rounded-full px-2.5 py-1 text-xs font-semibold', difficultyTone[lesson.tier])}>
                          {lesson.tier}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground">
                        <div className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1">
                          <Zap className="h-3.5 w-3.5 text-xp" />
                          <span>{lesson.baseXP}+ XP</span>
                        </div>
                      </div>
                    </div>

                    <h3 className="line-clamp-2 text-lg font-bold font-display text-foreground">
                      {getVisibleLessonTitle(lesson)}
                    </h3>
                    <p className="mt-2 line-clamp-3 text-sm leading-7 text-muted-foreground">{lesson.description}</p>

                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded-full bg-secondary px-3 py-1">{lesson.category}</span>
                      <span className="rounded-full bg-secondary px-3 py-1">Est. {lesson.baselineTime} min</span>
                      {isDifficultyLocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
                          <Link2 className="h-3.5 w-3.5" />
                          Locked
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs text-muted-foreground">
                        {isCompleted
                          ? 'Already completed'
                          : disabledReason
                          ? disabledReason
                          : 'Ready for guided practice'}
                      </div>

                      {isCompleted ? (
                        <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-xp/10 px-4 py-2.5 text-sm font-semibold text-xp">
                          <CheckCircle2 className="h-4 w-4" />
                          Completed
                        </div>
                      ) : lesson.isLocked || isDifficultyLocked ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                        >
                          {isDifficultyLocked ? <Link2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                          {isDifficultyLocked ? 'Locked tier' : 'Locked'}
                        </button>
                      ) : !isAuthenticated ? (
                        <button
                          type="button"
                          onClick={() => handleStartLesson(lesson)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
                        >
                          <Play className="h-4 w-4" />
                          Start practice
                        </button>
                      ) : !canStartLesson ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground"
                        >
                          <Heart className="h-4 w-4" />
                          No hearts left
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleStartLesson(lesson)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90"
                        >
                          <Play className="h-4 w-4" />
                          Start practice
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}

      {selectedLesson && isAuthenticated ? (
        <LessonModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onHeartLoss={() => {
            setSelectedLesson(null);
          }}
          onRedirectToLearn={handleRedirectToLearn}
        />
      ) : null}
    </div>
  );
};

export default Learn;
