import React, { useEffect, useMemo, useState } from 'react';
import { Trophy, Play, Lock, BookOpen, Code, Database, Globe, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import LessonModal from './LessonModal';
import {
  countCompletedLessonsByLanguage,
  formatLessonIdAsDisplayName,
  getLessonCountByLanguage,
  LessonLanguage,
} from '../data/lessonCatalog';
import { loadLessonsModule } from '../data/lessonsLoader';

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

const Learn: React.FC<LearnProps> = ({ setCurrentSection, openAuthModal, isAuthenticated = false }) => {
  const { user, isUnlimitedHeartsActive } = useUser();
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

  const languages = [
    { id: 'python' as Language, name: 'Python', icon: Code, color: 'from-blue-500 to-emerald-500', description: 'Benchmark gaps, backend fundamentals, and applied problem solving' },
    { id: 'javascript' as Language, name: 'JavaScript', icon: Database, color: 'from-cyan-500 to-blue-600', description: 'Interview-style practice for frontend logic, arrays, and functions' },
    { id: 'cpp' as Language, name: 'C++', icon: Globe, color: 'from-orange-500 to-rose-500', description: 'Structured logic, arrays, and fundamentals for timed challenge work' },
    { id: 'java' as Language, name: 'Java', icon: Globe, color: 'from-amber-500 to-orange-600', description: 'OOP foundations, class-ready practice, and junior developer prep' },
  ];

  const normalizeDifficultyTier = (difficulty: string): DifficultyTier => {
    const value = String(difficulty || '').toLowerCase();
    if (value.includes('advanced')) return 'Advanced';
    if (value.includes('intermediate')) return 'Intermediate';
    return 'Beginner';
  };

  const currentLessons = useMemo<VisibleLesson[]>(() => {
    if (!lessonsModule) {
      return [];
    }

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
        Beginner: {
          completed: beginnerCompleted,
          total: lessonGroups.Beginner.length,
        },
        Intermediate: {
          completed: intermediateCompleted,
          total: lessonGroups.Intermediate.length,
        },
      },
    };
  }, [currentLessons, user.completedLessons]);

  const selectedLanguageCompletedCount = useMemo(
    () => countCompletedLessonsByLanguage(selectedLanguage, user.completedLessons),
    [selectedLanguage, user.completedLessons]
  );
  const selectedLanguageTotalLessons = getLessonCountByLanguage(selectedLanguage);

  const filters = ['All Paths', 'Recommended', 'Completed', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredLessons = useMemo(() => {
    const tierOrder: Record<DifficultyTier, number> = {
      Beginner: 0,
      Intermediate: 1,
      Advanced: 2,
    };

    return currentLessons
      .filter((lesson) => {
        if (filter === 'All Paths') return true;
        if (filter === 'Recommended') return !user.completedLessons.includes(lesson.id);
        if (filter === 'Completed') return user.completedLessons.includes(lesson.id);
        if (filter === 'Beginner' || filter === 'Intermediate' || filter === 'Advanced') {
          return lesson.tier === filter;
        }
        return true;
      })
      .sort((left, right) => {
        const tierDelta = tierOrder[left.tier] - tierOrder[right.tier];
        if (tierDelta !== 0) return tierDelta;
        return left.sortIndex - right.sortIndex;
      });
  }, [currentLessons, filter, user.completedLessons]);

  const getDifficultyColor = (difficulty: DifficultyTier) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-700';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-700';
      case 'Advanced': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const languageStats = useMemo(() => {
    return languages.map((language) => ({
      ...language,
      totalLessons: getLessonCountByLanguage(language.id),
      completedCount: countCompletedLessonsByLanguage(language.id, user.completedLessons),
    }));
  }, [user.completedLessons]);

  const handleRedirectToLearn = () => {
    setSelectedLesson(null);
    setCurrentSection?.('practice');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  const getVisibleLessonTitle = (lesson: Pick<LessonPreview, 'id' | 'title'>) => {
    return lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)
      ? lesson.title
      : formatLessonIdAsDisplayName(lesson.id);
  };

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

  return (
    <div className="px-3 py-4 sm:px-4 lg:px-8 lg:py-8">
      <div className="mb-6 lg:mb-8">
        <div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">Practice Paths</h1>
          <p className="text-gray-600">Use lessons to close benchmark gaps, reinforce fundamentals, and prepare for duels.</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:mb-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Support content, not the starting point</div>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Lessons are here to sharpen the exact skills your benchmark exposes.</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
            Start with the benchmark, then use these lesson paths to tighten syntax, rebuild weak spots, and return to timed challenge work with more confidence.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => setCurrentSection?.('benchmark')}
              className="inline-flex items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              View benchmark workspace
            </button>
            <button
              type="button"
              onClick={() => setCurrentSection?.('duels')}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Go to duels
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-sm sm:p-6">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Best use of this page</div>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-100">
            <li>Use beginner paths to repair benchmark gaps before retaking the assessment.</li>
            <li>Move into intermediate and advanced lessons when your report calls for more depth.</li>
            <li>Treat duels as proof of skill after practice, not as the first step.</li>
          </ul>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:mb-8 lg:grid-cols-3 xl:grid-cols-4 lg:gap-4">
        {languageStats.map((language) => {
          const Icon = language.icon;

          return (
            <button
              key={language.id}
              onClick={() => setSelectedLanguage(language.id)}
              className={`rounded-2xl p-4 text-left transition-all duration-300 sm:p-5 lg:p-6 ${
                selectedLanguage === language.id
                  ? `bg-gradient-to-r ${language.color} text-white shadow-lg lg:scale-[1.02]`
                  : 'bg-white hover:bg-gray-50 border border-gray-200 hover:shadow-md'
              }`}
            >
              <div className="mb-3 flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
                <Icon className={`w-8 h-8 ${selectedLanguage === language.id ? 'text-white' : 'text-gray-600'}`} />
                <div>
                  <h3 className={`text-lg lg:text-xl font-bold ${selectedLanguage === language.id ? 'text-white' : 'text-gray-900'}`}>
                    {language.name}
                  </h3>
                  <p className={`text-sm ${selectedLanguage === language.id ? 'text-white/80' : 'text-gray-600'}`}>
                    {language.description}
                  </p>
                </div>
              </div>
              <div className={`text-sm ${selectedLanguage === language.id ? 'text-white/90' : 'text-gray-500'}`}>
                Progress: {language.completedCount}/{language.totalLessons} lessons completed
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-white/20">
                <div
                  className={`h-2 rounded-full transition-all duration-500 ${
                    selectedLanguage === language.id ? 'bg-white/40' : 'bg-gray-300'
                  }`}
                  style={{ width: `${(language.completedCount / Math.max(1, language.totalLessons)) * 100}%` }}
                ></div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 lg:mb-8">
        {filters.map((filterOption) => (
          <button
            key={filterOption}
            onClick={() => setFilter(filterOption)}
            className={`px-3 lg:px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
              filter === filterOption
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterOption}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mb-8 lg:grid-cols-3 lg:gap-6">
          <div className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-lg sm:p-6">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
              <Trophy className="w-6 h-6" />
            </div>
          <div className="mb-1 text-xl font-bold lg:text-2xl">
            {selectedLanguageCompletedCount}/{selectedLanguageTotalLessons}
          </div>
          <div className="text-sm text-white/80 lg:text-base">{selectedLanguage.toUpperCase()} practice lessons completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {lessonsError ? (
          <div className="col-span-full rounded-2xl border border-red-100 bg-red-50 p-6 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-red-900">Lesson list failed to load</h3>
            <p className="mt-2 text-sm text-red-700">{lessonsError}</p>
            <button
              type="button"
              onClick={() => setLessonsReloadKey((value) => value + 1)}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
            >
              Try again
            </button>
          </div>
        ) : isLessonsLoading ? (
          Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-gray-100 bg-white p-4 shadow-md sm:p-5 lg:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="h-5 w-5 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 w-24 animate-pulse rounded-full bg-gray-200" />
                </div>
                <div className="h-4 w-14 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="mb-2 h-6 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="mb-4 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
              <div className="mb-4 h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-gray-200 sm:w-28" />
              </div>
            </div>
          ))
        ) : filteredLessons.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">No practice items match this filter</h3>
            <p className="mt-2 text-sm text-gray-500">Try another path level or language to keep your roadmap moving.</p>
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const isCompleted = user.completedLessons.includes(lesson.id);
            const isDifficultyLocked = !difficultyUnlocks[lesson.tier];
            const canStartLesson = isAuthenticated && !isDifficultyLocked && (user.hearts > 0 || isUnlimitedHeartsActive());

            return (
              <div
                key={`${lesson.id}-${selectedLanguage}`}
                className={`relative overflow-hidden rounded-2xl border bg-white shadow-md transition-all duration-300 ${
                  isDifficultyLocked ? 'border-gray-300 bg-gray-50' : 'border-gray-100 hover:-translate-y-1 hover:shadow-lg'
                }`}
              >
                {isDifficultyLocked && <div className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-dashed border-gray-300" />}

                <div className="p-4 sm:p-5 lg:p-6">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <BookOpen className={`w-5 h-5 ${isDifficultyLocked ? 'text-gray-400' : 'text-blue-500'}`} />
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDifficultyLocked ? 'bg-gray-200 text-gray-600' : getDifficultyColor(lesson.tier)}`}>
                        {lesson.tier}
                      </span>
                    </div>
                    <div className="shrink-0 text-right text-xs text-gray-500">
                      {isDifficultyLocked && (
                        <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600">
                          <Link2 className="h-3.5 w-3.5" />
                          Locked
                        </div>
                      )}
                      <span className="mr-1 h-2 w-2 rounded-full bg-blue-400"></span>
                      {lesson.baseXP}+ XP
                    </div>
                  </div>

                  <h3 className={`mb-2 line-clamp-2 text-base font-semibold lg:text-lg ${isDifficultyLocked ? 'text-gray-700' : 'text-gray-900'}`}>{getVisibleLessonTitle(lesson)}</h3>
                  <p className={`mb-4 line-clamp-3 text-sm ${isDifficultyLocked ? 'text-gray-500' : 'text-gray-600'}`}>{lesson.description}</p>

                  <div className="mb-4 flex items-center text-xs text-gray-500">
                    <span>Est. time: {lesson.baselineTime} min</span>
                  </div>

                  <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="inline-flex max-w-full items-center rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700">
                      {lesson.category}
                    </span>

                    {isCompleted ? (
                      <button className="w-full cursor-default rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 sm:w-auto">
                        Completed
                      </button>
                    ) : isDifficultyLocked ? (
                      <button className="w-full cursor-not-allowed rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-600 sm:w-auto flex items-center justify-center space-x-1">
                        <Link2 className="w-4 h-4" />
                        <span>Locked</span>
                      </button>
                    ) : lesson.isLocked ? (
                      <button className="w-full cursor-not-allowed rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-500 sm:w-auto flex items-center justify-center space-x-1">
                        <Lock className="w-4 h-4" />
                        <span>Locked</span>
                      </button>
                    ) : !isAuthenticated ? (
                      <button
                        type="button"
                        onClick={() => handleStartLesson(lesson)}
                        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 sm:w-auto"
                      >
                        Start practice
                      </button>
                    ) : !canStartLesson ? (
                      <div className="tooltip">
                        <button
                          disabled
                          className="w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600 sm:w-auto flex items-center justify-center space-x-1"
                        >
                          <Play className="w-4 h-4" />
                          <span>Start practice</span>
                        </button>
                        <span className="tooltiptext">You have no hearts left</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleStartLesson(lesson)}
                        className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 sm:w-auto flex items-center justify-center space-x-1"
                      >
                        <Play className="w-4 h-4" />
                          <span>Start practice</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedLesson && isAuthenticated && (
        <LessonModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onHeartLoss={() => {
            setSelectedLesson(null);
          }}
          onRedirectToLearn={handleRedirectToLearn}
        />
      )}
    </div>
  );
};

export default Learn;
