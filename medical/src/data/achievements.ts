import { allLessons, getLessonsByLanguage, Lesson } from './lessons';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'learning' | 'practice' | 'social' | 'special';
  requirement: {
    type:
      | 'lessons_completed'
      | 'xp_earned'
      | 'streak_days'
      | 'languages_tried'
      | 'projects_completed'
      | 'level_reached'
      | 'coins_earned'
      | 'avatars_owned';
    value: number;
    language?: string;
  };
  reward: {
    xp: number;
  };
}

const TOTALS = {
  python: getLessonsByLanguage('python').length,
  javascript: getLessonsByLanguage('javascript').length,
  cpp: getLessonsByLanguage('cpp').length,
  java: getLessonsByLanguage('java').length,
};

export const achievements: Achievement[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    description: 'Finish your first lesson.',
    icon: '\u{1F3AF}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 1 },
    reward: { xp: 15 },
  },
  {
    id: 'warming_up',
    name: 'Warming Up',
    description: 'Complete 5 lessons in total.',
    icon: '\u{1F525}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 5 },
    reward: { xp: 40 },
  },
  {
    id: 'into_the_flow',
    name: 'Into the Flow',
    description: 'Complete 25 lessons in total.',
    icon: '\u{1F30A}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 25 },
    reward: { xp: 120 },
  },
  {
    id: 'halfway_hacker',
    name: 'Halfway Hacker',
    description: 'Complete 50 lessons in total.',
    icon: '\u{1F680}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 50 },
    reward: { xp: 250 },
  },
  {
    id: 'century_club',
    name: 'Century Club',
    description: 'Complete 100 lessons in total.',
    icon: '\u{1F4AF}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 100 },
    reward: { xp: 500 },
  },
  {
    id: 'full_curriculum',
    name: 'Full Curriculum',
    description: 'Complete every lesson currently in the app.',
    icon: '\u{1F393}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: allLessons.length },
    reward: { xp: 1500 },
  },

  {
    id: 'python_foundations',
    name: 'Python Foundations',
    description: 'Complete 10 Python lessons.',
    icon: '\u{1F40D}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 10, language: 'python' },
    reward: { xp: 80 },
  },
  {
    id: 'python_mastery',
    name: 'Python Mastery',
    description: `Complete all ${TOTALS.python} Python lessons.`,
    icon: '\u{1F40D}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: TOTALS.python, language: 'python' },
    reward: { xp: 350 },
  },
  {
    id: 'javascript_foundations',
    name: 'JavaScript Foundations',
    description: 'Complete 10 JavaScript lessons.',
    icon: '\u{1F7E8}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 10, language: 'javascript' },
    reward: { xp: 80 },
  },
  {
    id: 'javascript_mastery',
    name: 'JavaScript Mastery',
    description: `Complete all ${TOTALS.javascript} JavaScript lessons.`,
    icon: '\u{1F7E8}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: TOTALS.javascript, language: 'javascript' },
    reward: { xp: 350 },
  },
  {
    id: 'cpp_foundations',
    name: 'C++ Foundations',
    description: 'Complete 10 C++ lessons.',
    icon: '\u{2699}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 10, language: 'cpp' },
    reward: { xp: 80 },
  },
  {
    id: 'cpp_mastery',
    name: 'C++ Mastery',
    description: `Complete all ${TOTALS.cpp} C++ lessons.`,
    icon: '\u{2699}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: TOTALS.cpp, language: 'cpp' },
    reward: { xp: 350 },
  },
  {
    id: 'java_foundations',
    name: 'Java Foundations',
    description: 'Complete 10 Java lessons.',
    icon: '\u{2615}',
    category: 'learning',
    requirement: { type: 'lessons_completed', value: 10, language: 'java' },
    reward: { xp: 80 },
  },
  {
    id: 'java_mastery',
    name: 'Java Mastery',
    description: `Complete all ${TOTALS.java} Java lessons.`,
    icon: '\u{2615}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: TOTALS.java, language: 'java' },
    reward: { xp: 350 },
  },

  {
    id: 'code_explorer',
    name: 'Code Explorer',
    description: 'Complete lessons in 2 different languages.',
    icon: '\u{1F9ED}',
    category: 'learning',
    requirement: { type: 'languages_tried', value: 2 },
    reward: { xp: 100 },
  },
  {
    id: 'stack_walker',
    name: 'Stack Walker',
    description: 'Complete lessons in all 4 languages.',
    icon: '\u{1F30D}',
    category: 'special',
    requirement: { type: 'languages_tried', value: 4 },
    reward: { xp: 250 },
  },
  {
    id: 'dual_mastery',
    name: 'Dual Mastery',
    description: 'Fully clear 2 language tracks.',
    icon: '\u{1F3C6}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: 2 },
    reward: { xp: 600 },
  },
  {
    id: 'quad_mastery',
    name: 'Four-Stack Finisher',
    description: 'Fully clear all 4 language tracks.',
    icon: '\u{1F451}',
    category: 'special',
    requirement: { type: 'lessons_completed', value: 4 },
    reward: { xp: 1200 },
  },

  {
    id: 'streak_3',
    name: 'Streak Starter',
    description: 'Reach a 3-day learning streak.',
    icon: '\u{1F525}',
    category: 'practice',
    requirement: { type: 'streak_days', value: 3 },
    reward: { xp: 40 },
  },
  {
    id: 'streak_7',
    name: 'On a Roll',
    description: 'Reach a 7-day learning streak.',
    icon: '\u{1F525}',
    category: 'practice',
    requirement: { type: 'streak_days', value: 7 },
    reward: { xp: 100 },
  },
  {
    id: 'streak_14',
    name: 'Two-Week Run',
    description: 'Reach a 14-day learning streak.',
    icon: '\u{1F4C5}',
    category: 'practice',
    requirement: { type: 'streak_days', value: 14 },
    reward: { xp: 180 },
  },
  {
    id: 'streak_30',
    name: 'Consistency Machine',
    description: 'Reach a 30-day learning streak.',
    icon: '\u{1F3C5}',
    category: 'practice',
    requirement: { type: 'streak_days', value: 30 },
    reward: { xp: 450 },
  },

  {
    id: 'xp_250',
    name: 'XP Ignition',
    description: 'Earn 250 total XP.',
    icon: '\u{2728}',
    category: 'special',
    requirement: { type: 'xp_earned', value: 250 },
    reward: { xp: 30 },
  },
  {
    id: 'xp_1000',
    name: 'Momentum',
    description: 'Earn 1,000 total XP.',
    icon: '\u{1F4A0}',
    category: 'special',
    requirement: { type: 'xp_earned', value: 1000 },
    reward: { xp: 80 },
  },
  {
    id: 'xp_5000',
    name: 'Deep Work',
    description: 'Earn 5,000 total XP.',
    icon: '\u{1F4A5}',
    category: 'special',
    requirement: { type: 'xp_earned', value: 5000 },
    reward: { xp: 200 },
  },
  {
    id: 'xp_15000',
    name: 'Knowledge Engine',
    description: 'Earn 15,000 total XP.',
    icon: '\u{1F680}',
    category: 'special',
    requirement: { type: 'xp_earned', value: 15000 },
    reward: { xp: 600 },
  },

  {
    id: 'level_5',
    name: 'Getting Comfortable',
    description: 'Reach level 5.',
    icon: '\u{2B50}',
    category: 'special',
    requirement: { type: 'level_reached', value: 5 },
    reward: { xp: 40 },
  },
  {
    id: 'level_15',
    name: 'Serious Builder',
    description: 'Reach level 15.',
    icon: '\u{1F6E0}',
    category: 'special',
    requirement: { type: 'level_reached', value: 15 },
    reward: { xp: 140 },
  },
  {
    id: 'level_30',
    name: 'Veteran Coder',
    description: 'Reach level 30.',
    icon: '\u{1F396}',
    category: 'special',
    requirement: { type: 'level_reached', value: 30 },
    reward: { xp: 300 },
  },
  {
    id: 'level_50',
    name: 'Codhak Legend',
    description: 'Reach level 50.',
    icon: '\u{1F451}',
    category: 'special',
    requirement: { type: 'level_reached', value: 50 },
    reward: { xp: 800 },
  },

  {
    id: 'coin_collector',
    name: 'Coin Collector',
    description: 'Earn 500 total coins over time.',
    icon: '\u{1FA99}',
    category: 'special',
    requirement: { type: 'coins_earned', value: 500 },
    reward: { xp: 60 },
  },
  {
    id: 'coin_stash',
    name: 'Coin Stash',
    description: 'Earn 2,500 total coins over time.',
    icon: '\u{1F4B0}',
    category: 'special',
    requirement: { type: 'coins_earned', value: 2500 },
    reward: { xp: 180 },
  },
  {
    id: 'identity_upgrade',
    name: 'Identity Upgrade',
    description: 'Own 2 avatars.',
    icon: '\u{1F3AD}',
    category: 'special',
    requirement: { type: 'avatars_owned', value: 2 },
    reward: { xp: 70 },
  },
  {
    id: 'collector_case',
    name: 'Collector Case',
    description: 'Own 5 avatars.',
    icon: '\u{1F48E}',
    category: 'special',
    requirement: { type: 'avatars_owned', value: 5 },
    reward: { xp: 200 },
  },
];

export const checkAchievements = (user: {
  unlockedAchievements?: string[];
  level: number;
  xp: number;
  currentStreak: number;
  totalLessonsCompleted?: number;
  completedLessons: string[];
  totalCoinsEarned?: number;
  ownedAvatars?: string[];
  projects?: number;
}, completedLessons: string[]): Achievement[] => {
  const newAchievements: Achievement[] = [];
  const userUnlockedAchievements = user.unlockedAchievements || [];

  const validCompletedLessonObjects = completedLessons
    .map((lessonId) => allLessons.find((lesson) => lesson.id === lessonId))
    .filter((lesson): lesson is Lesson => Boolean(lesson));

  const countsByLanguage = {
    python: validCompletedLessonObjects.filter((lesson) => lesson.language === 'python').length,
    javascript: validCompletedLessonObjects.filter((lesson) => lesson.language === 'javascript').length,
    cpp: validCompletedLessonObjects.filter((lesson) => lesson.language === 'cpp').length,
    java: validCompletedLessonObjects.filter((lesson) => lesson.language === 'java').length,
  };

  const languagesTried = Object.entries(countsByLanguage)
    .filter(([, count]) => count > 0)
    .map(([language]) => language);

  const masteredLanguages = Object.entries(countsByLanguage)
    .filter(([language, count]) => {
      const total = TOTALS[language as keyof typeof TOTALS];
      return total > 0 && count >= total;
    })
    .map(([language]) => language);

  achievements.forEach((achievement) => {
    if (userUnlockedAchievements.includes(achievement.id)) {
      return;
    }

    let isUnlocked = false;

    switch (achievement.requirement.type) {
      case 'lessons_completed':
        if (achievement.requirement.language) {
          const language = achievement.requirement.language as keyof typeof countsByLanguage;
          isUnlocked = (countsByLanguage[language] || 0) >= achievement.requirement.value;
        } else if (achievement.id === 'dual_mastery' || achievement.id === 'quad_mastery') {
          isUnlocked = masteredLanguages.length >= achievement.requirement.value;
        } else {
          isUnlocked = (user.totalLessonsCompleted || 0) >= achievement.requirement.value;
        }
        break;
      case 'languages_tried':
        isUnlocked = languagesTried.length >= achievement.requirement.value;
        break;
      case 'level_reached':
        isUnlocked = (user.level || 0) >= achievement.requirement.value;
        break;
      case 'xp_earned':
        isUnlocked = (user.xp || 0) >= achievement.requirement.value;
        break;
      case 'streak_days':
        isUnlocked = (user.currentStreak || 0) >= achievement.requirement.value;
        break;
      case 'coins_earned':
        isUnlocked = (user.totalCoinsEarned || 0) >= achievement.requirement.value;
        break;
      case 'avatars_owned':
        isUnlocked = (user.ownedAvatars?.length || 0) >= achievement.requirement.value;
        break;
      case 'projects_completed':
        isUnlocked = (user.projects || 0) >= achievement.requirement.value;
        break;
      default:
        break;
    }

    if (isUnlocked) {
      newAchievements.push(achievement);
    }
  });

  return newAchievements;
};

