import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Code,
  Database,
  Globe,
  Heart,
  Link2,
  Lock,
  Play,
  RefreshCcw,
  Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { usePlanAccess } from '../hooks/usePlanAccess';
import LessonModal from './LessonModal';
import {
  countCompletedLessonsByLanguage,
  formatLessonIdAsDisplayName,
  getLessonCatalogEntry,
  getLessonCountByLanguage,
  LessonLanguage,
} from '../data/lessonCatalog';
import { loadLessonsModule } from '../data/lessonsLoader';
import { STARTER_PATH_LANGUAGE, STARTER_PATH_LESSON_LIMIT } from '../lib/planAccess';
import { forceUnlockAllLessons } from '../lib/lessonAccess';

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
  languageIndex: number;
};

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

const filters = ['All Paths', 'Recommended', 'Completed', 'Beginner', 'Intermediate', 'Advanced'];

const languageCatalog = [
  {
    id: 'python' as Language,
    name: 'Python',
    icon: Code,
    gradient: 'from-emerald-500 to-green-400',
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

const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatCountLabel = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));
const DIFFICULTY_UNLOCK_TARGET = 12;

const getDifficultyUnlockTarget = (total: number) => {
  if (total <= 0) return 0;
  return Math.min(total, DIFFICULTY_UNLOCK_TARGET);
};

const difficultyTone: Record<DifficultyTier, string> = {
  Beginner: 'bg-xp/10 text-xp',
  Intermediate: 'bg-coins/10 text-coins',
  Advanced: 'bg-destructive/10 text-destructive',
};

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
  const { canAccessPracticeLanguage, canAccessPracticeLesson, hasPaidLearnerAccess } = usePlanAccess();
  const lessonsSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const [filter, setFilter] = useState('Recommended');
  const [selectedLesson, setSelectedLesson] = useState<LessonPreview | null>(null);
  const [lessonsModule, setLessonsModule] = useState<Awaited<ReturnType<typeof loadLessonsModule>> | null>(null);
  const [isLessonsLoading, setIsLessonsLoading] = useState(true);
  const [lessonsError, setLessonsError] = useState<string | null>(null);
  const [lessonsReloadKey, setLessonsReloadKey] = useState(0);

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

  const currentLessons = useMemo<VisibleLesson[]>(() => {
    if (!lessonsModule) return [];

    return lessonsModule.getLessonsByLanguage(selectedLanguage).map((lesson, index) => ({
      ...lesson,
      tier: normalizeDifficultyTier(lesson.difficulty),
      sortIndex: index,
      languageIndex: getLessonCatalogEntry(lesson.id)?.languageIndex ?? index,
    }));
  }, [lessonsModule, selectedLanguage]);

  useEffect(() => {
    if (!forceUnlockAllLessons && !canAccessPracticeLanguage(selectedLanguage)) {
      setSelectedLanguage(STARTER_PATH_LANGUAGE);
    }
  }, [canAccessPracticeLanguage, selectedLanguage]);

  const difficultyUnlocks = useMemo(() => {
    const lessonGroups: Record<DifficultyTier, VisibleLesson[]> = {
      Beginner: currentLessons.filter((lesson) => lesson.tier === 'Beginner'),
      Intermediate: currentLessons.filter((lesson) => lesson.tier === 'Intermediate'),
      Advanced: currentLessons.filter((lesson) => lesson.tier === 'Advanced'),
    };

    const beginnerCompleted = lessonGroups.Beginner.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
    const intermediateCompleted = lessonGroups.Intermediate.filter((lesson) => user.completedLessons.includes(lesson.id)).length;
    const beginnerTarget = getDifficultyUnlockTarget(lessonGroups.Beginner.length);
    const intermediateTarget = getDifficultyUnlockTarget(lessonGroups.Intermediate.length);

    return {
      Beginner: true,
      Intermediate: beginnerCompleted >= beginnerTarget,
      Advanced: intermediateCompleted >= intermediateTarget,
      progress: {
        Beginner: { completed: beginnerCompleted, total: lessonGroups.Beginner.length, target: beginnerTarget },
        Intermediate: { completed: intermediateCompleted, total: lessonGroups.Intermediate.length, target: intermediateTarget },
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

    if (!forceUnlockAllLessons && !canAccessPracticeLesson(lesson.language, lesson.languageIndex)) {
      toast.error('Upgrade to unlock the full practice library.');
      navigate('/pricing?intent=pro');
      return;
    }

    const lessonTier = lesson.tier;
    if (!forceUnlockAllLessons && !difficultyUnlocks[lessonTier]) {
      const requiredTier: 'Beginner' | 'Intermediate' = lessonTier === 'Intermediate' ? 'Beginner' : 'Intermediate';
      const progress = difficultyUnlocks.progress[requiredTier];
      const neededCompleted = progress?.target ?? getDifficultyUnlockTarget(progress?.total ?? 0);
      toast.error(`Unlock ${lessonTier} by completing ${neededCompleted} ${requiredTier} lessons.`);
      return;
    }

    setSelectedLesson({ ...lesson, title: getVisibleLessonTitle(lesson) });
  };

  const selectedTrack = languageStats.find((language) => language.id === selectedLanguage) ?? languageStats[0];
  const selectedProgressPercent = Math.round((selectedLanguageCompletedCount / Math.max(1, selectedLanguageTotalLessons)) * 100);
  const SelectedTrackIcon = selectedTrack.icon;
  const sortedCurrentLessons = useMemo(
    () => [...currentLessons].sort((left, right) => left.sortIndex - right.sortIndex),
    [currentLessons]
  );
  const accessibleCurrentLessons = useMemo(
    () =>
      sortedCurrentLessons.filter((lesson) => {
        const planLocked = !forceUnlockAllLessons && !canAccessPracticeLesson(lesson.language, lesson.languageIndex);
        const difficultyLocked = !forceUnlockAllLessons && !difficultyUnlocks[lesson.tier];
        return !lesson.isLocked && !planLocked && !difficultyLocked;
      }),
    [canAccessPracticeLesson, difficultyUnlocks, sortedCurrentLessons]
  );
  const nextActionableLesson = useMemo(
    () =>
      accessibleCurrentLessons.find((lesson) => !user.completedLessons.includes(lesson.id)) ??
      sortedCurrentLessons.find((lesson) => !user.completedLessons.includes(lesson.id)) ??
      accessibleCurrentLessons[0] ??
      sortedCurrentLessons[0] ??
      null,
    [accessibleCurrentLessons, sortedCurrentLessons, user.completedLessons]
  );
  const beginnerUnlockTarget = difficultyUnlocks.progress.Beginner.target || getDifficultyUnlockTarget(difficultyUnlocks.progress.Beginner.total || 0);
  const advancedUnlockTarget =
    difficultyUnlocks.progress.Intermediate.target || getDifficultyUnlockTarget(difficultyUnlocks.progress.Intermediate.total || 0);
  const beginnerUnlockProgress = Math.min(difficultyUnlocks.progress.Beginner.completed, beginnerUnlockTarget);
  const advancedUnlockProgress = Math.min(difficultyUnlocks.progress.Intermediate.completed, advancedUnlockTarget);
  const lessonsUntilIntermediate = Math.max(0, beginnerUnlockTarget - difficultyUnlocks.progress.Beginner.completed);
  const lessonsUntilAdvanced = Math.max(0, advancedUnlockTarget - difficultyUnlocks.progress.Intermediate.completed);
  const heartsLeft = isUnlimitedHeartsActive() ? Number.POSITIVE_INFINITY : user.hearts;
  const nextTierSummary = difficultyUnlocks.Intermediate
    ? difficultyUnlocks.Advanced
      ? 'All core tiers unlocked'
      : `${formatCountLabel(lessonsUntilAdvanced, 'lesson')} until Advanced`
    : `${formatCountLabel(lessonsUntilIntermediate, 'lesson')} until Intermediate`;
  const nextLessonSupportCopy = nextActionableLesson
    ? `${nextActionableLesson.baselineTime} min • +${nextActionableLesson.baseXP} XP • ${nextTierSummary}`
    : 'You cleared the current path. Review key lessons or switch tracks to keep your skill curve moving.';
  const continueLessonCanStart =
    !!nextActionableLesson &&
    (!isAuthenticated ||
      isUnlimitedHeartsActive() ||
      user.hearts > 0) &&
    (!nextActionableLesson ||
      forceUnlockAllLessons ||
      (canAccessPracticeLesson(nextActionableLesson.language, nextActionableLesson.languageIndex) &&
        difficultyUnlocks[nextActionableLesson.tier] &&
        !nextActionableLesson.isLocked));
  const scrollToLessons = () => {
    lessonsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const launchMissionLesson = () => {
    if (nextActionableLesson) {
      handleStartLesson(nextActionableLesson);
    } else {
      scrollToLessons();
    }
  };

  return (
    <div className="space-y-4 p-4 lg:p-5 xl:p-6">
      <div className="flex flex-col gap-1.5">
        <div className="min-w-0">
          <div className="type-kicker text-primary">Practice</div>
          <h1 className="mt-1 max-w-lg text-[1.35rem] font-semibold leading-[1.06] tracking-[-0.035em] text-foreground sm:text-[1.65rem]">
            Pick up where you left off and unlock harder challenges.
          </h1>
          <p className="type-body-sm mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
            Complete lessons to unlock harder tiers, build skill fast with short focused practice, and train before you step into duels.
          </p>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {languageStats.map((language) => {
          const Icon = language.icon;
          const isActive = selectedLanguage === language.id;
          const isLocked = !forceUnlockAllLessons && !canAccessPracticeLanguage(language.id);
          const progressPercent = clampPercent((language.completedCount / Math.max(1, language.totalLessons)) * 100);

          return (
            <button
              key={language.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  toast.error('Unlock Pro or Interview Sprint to open this language path.');
                  navigate('/pricing?intent=pro');
                  return;
                }
                setSelectedLanguage(language.id);
              }}
              className={cx(
                'rounded-2xl border px-3.5 py-2.5 text-left transition-all duration-300',
                isActive
                  ? `border-transparent bg-gradient-to-r ${language.gradient} text-white shadow-elevated`
                  : 'border-border/50 bg-card/35 text-foreground shadow-none hover:border-primary/15 hover:bg-card/55'
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                    isActive ? 'bg-white/15' : 'bg-secondary/70 text-muted-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className={cx('text-[15px] font-semibold', isActive ? 'text-white' : 'text-foreground/90')}>{language.name}</div>
                    {isLocked ? (
                      <span
                        className={cx(
                          'rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]',
                          isActive ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary'
                        )}
                      >
                        Pro
                      </span>
                    ) : null}
                  </div>
                  <div className={cx('mt-1 text-xs', isActive ? 'text-white/80' : 'text-muted-foreground')}>
                    {language.completedCount}/{language.totalLessons} complete
                  </div>
                </div>
              </div>
              <div className={cx('mt-2.5 h-1.5 w-full overflow-hidden rounded-full', isActive ? 'bg-white/20' : 'bg-secondary/70')}>
                <div
                  className={cx('h-full rounded-full transition-all duration-500', isActive ? 'bg-white/65' : 'bg-muted-foreground/60')}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {!hasPaidLearnerAccess && !forceUnlockAllLessons ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-3.5 text-sm leading-6 text-foreground">
          <div className="font-semibold text-primary">Free plan access</div>
          <div className="mt-1">
            Free includes the first {STARTER_PATH_LESSON_LIMIT} {STARTER_PATH_LANGUAGE.toUpperCase()} lessons and one skill check. Upgrade to unlock all languages, deeper practice, and retakes.
          </div>
        </div>
      ) : null}

      <section className="rounded-3xl border border-border bg-card p-3 shadow-card lg:p-3.5">
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.5fr)_minmax(14rem,0.56fr)] xl:items-start">
          <div className="min-w-0">
            <div className={`type-kicker inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-white ${selectedTrack.gradient}`}>
              {selectedTrack.name} path
            </div>
            <div className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Next lesson</div>
            <h3 className="mt-1 max-w-2xl text-[1.28rem] font-semibold tracking-[-0.035em] text-foreground sm:text-[1.5rem]">
              {nextActionableLesson ? getVisibleLessonTitle(nextActionableLesson) : `${selectedTrack.name} path complete`}
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">{nextLessonSupportCopy}</p>

            <div className="mt-3 flex flex-wrap gap-2.5">
              <button
                type="button"
                onClick={launchMissionLesson}
                disabled={!continueLessonCanStart && isAuthenticated}
                className="inline-flex min-w-[172px] items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Play className="h-4 w-4" />
                {!isAuthenticated
                  ? 'Start Learning Free'
                  : nextActionableLesson && user.completedLessons.includes(nextActionableLesson.id)
                  ? 'Review Lesson'
                  : 'Continue Lesson'}
              </button>
              <button
                type="button"
                onClick={scrollToLessons}
                className="inline-flex min-w-[172px] items-center justify-center gap-2 rounded-xl border border-border bg-secondary/60 px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                <ArrowRight className="h-4 w-4" />
                View All Lessons
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-secondary/20 p-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="type-label text-muted-foreground">Next reward</div>
                <div className="mt-1 text-sm font-semibold text-foreground">
                  {nextActionableLesson ? 'Finish the next lesson' : 'Path ready for review'}
                </div>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r text-white ${selectedTrack.gradient}`}>
                <SelectedTrackIcon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2.5 space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sprint</span>
                <span className="font-medium text-foreground">
                  {nextActionableLesson ? `${nextActionableLesson.baselineTime} min` : 'Review mode'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Reward</span>
                <span className="font-medium text-foreground">
                  {nextActionableLesson ? `+${nextActionableLesson.baseXP} XP` : `${selectedProgressPercent}% complete`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Intermediate</span>
                <span className="font-medium text-foreground">
                  {difficultyUnlocks.Intermediate
                    ? 'Unlocked'
                    : `${beginnerUnlockProgress}/${Math.max(1, beginnerUnlockTarget)}`}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Advanced</span>
                <span className="font-medium text-foreground">
                  {difficultyUnlocks.Advanced
                    ? 'Unlocked'
                    : `${advancedUnlockProgress}/${Math.max(1, advancedUnlockTarget)}`}
                </span>
              </div>
            </div>

            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${selectedTrack.gradient}`}
                style={{ width: `${selectedProgressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className={cx("grid gap-2", !difficultyUnlocks.Intermediate || !difficultyUnlocks.Advanced ? "sm:grid-cols-2 xl:grid-cols-3" : "sm:grid-cols-1")}>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Heart className="h-3.5 w-3.5 text-hearts" />
            Hearts
          </div>
          <div className="mt-2.5 text-base font-semibold text-foreground">
            {isUnlimitedHeartsActive() ? 'Unlimited hearts' : `${user.hearts} hearts left`}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            {isUnlimitedHeartsActive()
              ? 'Perfect for longer sessions. You can push through mistakes without losing momentum.'
              : heartsLeft <= 1
              ? 'Last heart. Miss once more and guided practice pauses until refill.'
              : 'You still have room to make mistakes, but harder tiers will punish careless runs.'}
          </p>
        </div>

        {!difficultyUnlocks.Intermediate ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Intermediate</span>
              <span>{beginnerUnlockProgress}/{Math.max(1, beginnerUnlockTarget)}</span>
            </div>
            <div className="mt-2.5 text-base font-semibold text-foreground">
              {`${formatCountLabel(lessonsUntilIntermediate, 'lesson')} to unlock`}
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${clampPercent((beginnerUnlockProgress / Math.max(1, beginnerUnlockTarget)) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {!difficultyUnlocks.Advanced ? (
          <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-card">
            <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Advanced</span>
              <span>{advancedUnlockProgress}/{Math.max(1, advancedUnlockTarget)}</span>
            </div>
            <div className="mt-2.5 text-base font-semibold text-foreground">
              {`${formatCountLabel(lessonsUntilAdvanced, 'lesson')} to unlock`}
            </div>
            <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${clampPercent((advancedUnlockProgress / Math.max(1, advancedUnlockTarget)) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>

      <section ref={lessonsSectionRef} className="space-y-2.5">
        <div className="flex justify-end">
          <div className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground shadow-card">
            {filteredLessons.length} lesson{filteredLessons.length === 1 ? '' : 's'} in this view
          </div>
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
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                const isNextUp = !!nextActionableLesson && lesson.id === nextActionableLesson.id && !isCompleted;
                const isSystemLocked = !forceUnlockAllLessons && lesson.isLocked;
                const isDifficultyLocked = !forceUnlockAllLessons && !difficultyUnlocks[lesson.tier];
                const isPlanLocked = !forceUnlockAllLessons && !canAccessPracticeLesson(lesson.language, lesson.languageIndex);
                const canStartLesson = isAuthenticated && !isSystemLocked && !isDifficultyLocked && !isPlanLocked && (user.hearts > 0 || isUnlimitedHeartsActive());
                const disabledReason = !isAuthenticated
                  ? null
                  : isPlanLocked
                  ? 'Upgrade required'
                  : isSystemLocked
                  ? 'Locked'
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
                      isNextUp && !isSystemLocked && !isDifficultyLocked && !isPlanLocked
                        ? 'border-primary/35 ring-1 ring-primary/20'
                        : '',
                      isSystemLocked || isDifficultyLocked || isPlanLocked
                        ? 'border-border/70 opacity-85'
                        : 'border-border hover:-translate-y-1 hover:border-primary/30 hover:shadow-elevated'
                    )}
                  >
                    <div className="absolute inset-0 opacity-0 transition-opacity duration-300 hover:opacity-100" style={{ background: 'var(--gradient-card-glow)' }} />
                    {isSystemLocked || isDifficultyLocked || isPlanLocked ? <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-border" /> : null}

                    <div className="relative">
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <BookOpen className={cx('h-5 w-5 shrink-0', isDifficultyLocked ? 'text-muted-foreground' : 'text-primary')} />
                          {isNextUp ? (
                            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                              Next up
                            </span>
                          ) : null}
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

                      <h3 className="type-title-sm line-clamp-2 text-foreground">
                        {getVisibleLessonTitle(lesson)}
                      </h3>
                      <p className="type-body-sm mt-2 line-clamp-3 text-muted-foreground">{lesson.description}</p>

                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-secondary px-3 py-1">{lesson.category}</span>
                        <span className="rounded-full bg-secondary px-3 py-1">Est. {lesson.baselineTime} min</span>
                        {isPlanLocked ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1">
                            <Lock className="h-3.5 w-3.5" />
                            Pro
                          </span>
                        ) : null}
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
                            : isNextUp
                            ? 'Resume here'
                            : disabledReason
                            ? disabledReason
                            : 'Ready for guided practice'}
                        </div>

                        {isCompleted ? (
                          <div className="inline-flex items-center justify-center gap-2 rounded-xl bg-xp/10 px-4 py-2.5 text-sm font-semibold text-xp">
                            <CheckCircle2 className="h-4 w-4" />
                            Completed
                          </div>
                        ) : isSystemLocked || isDifficultyLocked || isPlanLocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (isPlanLocked) {
                                navigate('/pricing?intent=pro');
                              }
                            }}
                            disabled={isSystemLocked || isDifficultyLocked}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed"
                          >
                            {isPlanLocked ? <Lock className="h-4 w-4" /> : isDifficultyLocked ? <Link2 className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                            {isPlanLocked ? 'Unlock full path' : isDifficultyLocked ? 'Locked tier' : 'Locked'}
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
                            {isNextUp ? 'Continue next' : 'Start practice'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ) : null}
      </section>

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
