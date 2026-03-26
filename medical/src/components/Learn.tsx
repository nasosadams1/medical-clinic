import React, { useEffect, useMemo, useState } from 'react';
import {
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

    if (!forceUnlockAllLessons && !canAccessPracticeLesson(lesson.language, lesson.languageIndex)) {
      toast.error('Upgrade to unlock the full practice library.');
      navigate('/pricing?intent=pro');
      return;
    }

    const lessonTier = lesson.tier;
    if (!forceUnlockAllLessons && !difficultyUnlocks[lessonTier]) {
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

  return (
    <div className="space-y-8 p-4 lg:p-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="type-headline text-foreground">Practice Lessons</h1>
          <p className="type-body-sm mt-1 max-w-3xl text-muted-foreground">Choose a language path, unlock harder tiers, and move through the lesson library.</p>
        </div>
      </div>

      {!hasPaidLearnerAccess && !forceUnlockAllLessons ? (
        <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
          <div className="font-semibold text-primary">Free plan access</div>
          <div className="mt-1">
            Free includes the first {STARTER_PATH_LESSON_LIMIT} {STARTER_PATH_LANGUAGE.toUpperCase()} lessons and one skill check. Upgrade to unlock all languages, deeper practice, and retakes.
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className={`type-kicker inline-flex rounded-full bg-gradient-to-r px-3 py-1 text-white ${selectedTrack.gradient}`}>
          {selectedTrack.name} path
        </div>
        <h2 className="type-display-section mt-4 max-w-4xl text-foreground">Lessons first. Everything here should help you learn by doing.</h2>
        <p className="type-body-md mt-3 max-w-3xl text-muted-foreground">{selectedTrack.description}</p>

        <div className="mt-6 rounded-2xl border border-border bg-secondary/35 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Path progress</span>
            <span className="font-mono font-semibold text-foreground">{selectedProgressPercent}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div className={`h-full rounded-full bg-gradient-to-r ${selectedTrack.gradient}`} style={{ width: `${selectedProgressPercent}%` }} />
          </div>
          <p className="mt-3 text-xs leading-6 text-muted-foreground">
            {selectedLanguageCompletedCount} of {selectedLanguageTotalLessons} lessons complete in this path.
          </p>

          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card px-4 py-4">
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Hearts</div>
              <div className="mt-2 text-lg font-semibold text-foreground">
                {isUnlimitedHeartsActive() ? 'Unlimited' : `${user.hearts}/${user.maxHearts}`}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {isUnlimitedHeartsActive() ? 'Practice without interruption.' : 'Lessons use hearts when you make mistakes.'}
              </div>
            </div>
            {([
              ['Intermediate unlock', difficultyUnlocks.progress.Beginner.completed, difficultyUnlocks.progress.Beginner.total],
              ['Advanced unlock', difficultyUnlocks.progress.Intermediate.completed, difficultyUnlocks.progress.Intermediate.total],
            ] as const).map(([label, completed, total]) => {
              const percent = total ? Math.round((completed / total) * 100) : 100;
              return (
                <div key={label} className="rounded-2xl border border-border bg-card px-4 py-4">
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
          const isLocked = !forceUnlockAllLessons && !canAccessPracticeLanguage(language.id);
          const progressPercent = Math.round((language.completedCount / Math.max(1, language.totalLessons)) * 100);

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
                  <div className="flex items-center gap-2">
                    <div className={cx('type-title-sm', isActive ? 'text-white' : 'text-foreground')}>{language.name}</div>
                    {isLocked ? (
                      <span className={cx('rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]', isActive ? 'bg-white/15 text-white' : 'bg-primary/10 text-primary')}>
                        Pro
                      </span>
                    ) : null}
                  </div>
                  <p className={cx('mt-1 text-sm leading-6', isActive ? 'text-white/80' : 'text-muted-foreground')}>{language.description}</p>
                </div>
              </div>
              <div className={cx('type-label mt-4 flex items-center justify-between', isActive ? 'text-white/80' : 'text-muted-foreground')}>
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
