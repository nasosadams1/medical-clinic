import React, { useState, useMemo } from 'react';
import { Trophy, Play, Lock, BookOpen, Code, Database, Globe, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useUser } from '../context/UserContext';
import LessonModal from './LessonModal';
import { getLessonsByLanguage, getTotalLessonsByLanguage, getCompletedLessonsByLanguage, formatLessonDisplayName } from '../data/lessons';

type Language = 'python' | 'javascript' | 'cpp' | 'java';
type DifficultyTier = 'Beginner' | 'Intermediate' | 'Advanced';

interface LearnProps {
  setCurrentSection?: (section: string) => void;
  openAuthModal?: () => void;
  isAuthenticated?: boolean;
}

const Learn: React.FC<LearnProps> = ({ setCurrentSection, openAuthModal, isAuthenticated = false }) => {
  const { user, isUnlimitedHeartsActive } = useUser();
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('python');
  const [filter, setFilter] = useState('Available');
  const [selectedLesson, setSelectedLesson] = useState<any>(null);

  const languages = [
    { id: 'python' as Language, name: 'Python', icon: Code, color: 'from-blue-400 to-green-500', description: '50 comprehensive Python lessons' },
    { id: 'javascript' as Language, name: 'JavaScript', icon: Database, color: 'from-purple-400 to-blue-500', description: 'Interactive JavaScript fundamentals and problem solving' },
    { id: 'cpp' as Language, name: 'C++', icon: Globe, color: 'from-orange-400 to-red-500', description: 'Core C++ syntax, logic, and structured programming' },
    { id: 'java' as Language, name: 'Java', icon: Globe, color: 'from-orange-400 to-red-500', description: 'Java basics, object-oriented thinking, and syntax practice' },
  ];

  const normalizeDifficultyTier = (difficulty: string): DifficultyTier => {
    const value = String(difficulty || '').toLowerCase();
    if (value.includes('advanced')) return 'Advanced';
    if (value.includes('intermediate')) return 'Intermediate';
    return 'Beginner';
  };

  const currentLessons = useMemo(() => {
    return getLessonsByLanguage(selectedLanguage).map((lesson, index) => ({
      ...lesson,
      tier: normalizeDifficultyTier(lesson.difficulty),
      sortIndex: index,
    }));
  }, [selectedLanguage]);

  const difficultyUnlocks = useMemo(() => {
    const lessonGroups: Record<DifficultyTier, any[]> = {
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
    () => currentLessons.reduce((count, lesson) => count + (user.completedLessons.includes(lesson.id) ? 1 : 0), 0),
    [currentLessons, user.completedLessons]
  );


  const filters = ['All Lessons', 'Available', 'Completed', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredLessons = useMemo(() => {
    const tierOrder: Record<DifficultyTier, number> = {
      Beginner: 0,
      Intermediate: 1,
      Advanced: 2,
    };

    return currentLessons
      .filter((lesson) => {
        if (filter === 'All Lessons') return true;
        if (filter === 'Available') return !user.completedLessons.includes(lesson.id);
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
    return languages.map(language => {
      const totalLessons = getTotalLessonsByLanguage(language.id);
      const completedCount = getCompletedLessonsByLanguage(language.id, user.completedLessons);
      return {
        ...language,
        totalLessons,
        completedCount,
      };
    });
  }, [user.completedLessons]);

  const handleRedirectToLearn = () => {
    setSelectedLesson(null);
    if (setCurrentSection) {
      setCurrentSection('learn');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getVisibleLessonTitle = (lesson: any) => {
    return lesson?.title && !/^[a-z0-9]+(?:[-_][a-z0-9]+)+$/i.test(lesson.title)
      ? lesson.title
      : formatLessonDisplayName(lesson.id);
  };

  const handleStartLesson = (lesson: any) => {
    if (!isAuthenticated) {
      openAuthModal?.();
      return;
    }

    const lessonTier = lesson.tier as DifficultyTier;
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
          <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-3xl">Learn Programming</h1>
          <p className="text-gray-600">Master coding fundamentals with interactive lessons</p>
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
                  style={{ width: `${(language.completedCount / language.totalLessons) * 100}%` }}
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
        <div className="rounded-2xl bg-gradient-to-br from-green-400 to-blue-500 p-5 text-white shadow-lg sm:p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-white/20">
            <Trophy className="w-6 h-6" />
          </div>
          <div className="mb-1 text-xl font-bold lg:text-2xl">
            {selectedLanguageCompletedCount}/{currentLessons.length}
          </div>
          <div className="text-sm text-white/80 lg:text-base">{selectedLanguage.toUpperCase()} Lessons Completed</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {filteredLessons.map((lesson) => {
          const isCompleted = user.completedLessons.includes(lesson.id);
          const isDifficultyLocked = !difficultyUnlocks[lesson.tier as DifficultyTier];
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
                      Start lesson
                    </button>
                  ) : !canStartLesson ? (
                    <div className="tooltip">
                      <button
                        disabled
                        className="w-full cursor-not-allowed rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600 sm:w-auto flex items-center justify-center space-x-1"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start</span>
                      </button>
                      <span className="tooltiptext">You have no hearts left</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleStartLesson(lesson)}
                      className="w-full rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-600 sm:w-auto flex items-center justify-center space-x-1"
                    >
                      <Play className="w-4 h-4" />
                      <span>Start</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
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


