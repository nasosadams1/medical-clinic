import { TOTAL_LESSON_COUNT } from './lessonCatalog';
import { duelProblemCounts } from '../../data/duel-problem-catalog.js';

export type LanguageSlug = 'python' | 'javascript' | 'java' | 'cpp';

export interface ProductTrack {
  id: string;
  title: string;
  description: string;
  audience: string;
  language: LanguageSlug | 'multi';
  benchmarkLanguage?: LanguageSlug;
  benchmarkRole: 'beginner' | 'intern' | 'junior' | 'general_practice';
  benchmarkGoal: 'interview_prep' | 'class_improvement' | 'skill_growth';
  highlightedSkills: string[];
  recommendedLessonIds: string[];
  duelProblemTitles: string[];
  ctaLabel: string;
}

export interface PricingPlan {
  name: string;
  price: string;
  cadence: string;
  description: string;
  badge?: string;
  features: string[];
  ctaLabel: string;
  ctaKind: 'primary' | 'secondary';
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface TeamUseCase {
  slug: string;
  title: string;
  description: string;
  outcomes: string[];
  primaryCta: string;
}

export const publicProductMetrics = [
  {
    label: 'Guided lessons',
    value: `${TOTAL_LESSON_COUNT}+`,
    helper: 'Built-in lesson library',
  },
  {
    label: 'Duel-ready challenges',
    value: `${duelProblemCounts.total}+`,
    helper: 'Live duel prompt pool',
  },
  {
    label: 'Languages',
    value: '4',
    helper: 'Python, JS, Java, C++',
  },
  {
    label: 'Team workflows',
    value: 'Pilot-ready',
    helper: 'Cohorts, assignments, proof',
  },
];

export const interviewTracks: ProductTrack[] = [
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    description: 'Build Python basics and backend logic.',
    audience: 'Beginners and early-career Python learners.',
    language: 'python',
    benchmarkLanguage: 'python',
    benchmarkRole: 'beginner',
    benchmarkGoal: 'skill_growth',
    highlightedSkills: ['Variables and data types', 'Control flow', 'Collections', 'Functions'],
    recommendedLessonIds: ['python-variables-1', 'python-variables-2', 'python-if-statements', 'python-functions'],
    duelProblemTitles: ['Curie\'s Cold Notes', 'Franklin\'s Signal Majority', 'Galileo\'s Rising Streak'],
    ctaLabel: 'Start Python benchmark',
  },
  {
    id: 'javascript-interview-prep',
    title: 'JavaScript Interview Prep',
    description: 'Sharpen JavaScript for screens and take-homes.',
    audience: 'Frontend learners and job seekers.',
    language: 'javascript',
    benchmarkLanguage: 'javascript',
    benchmarkRole: 'junior',
    benchmarkGoal: 'interview_prep',
    highlightedSkills: ['Variables and scope', 'Control flow', 'Functions', 'Arrays and objects'],
    recommendedLessonIds: ['javascript-variables-1', 'javascript-if-else-1', 'javascript-functions-1', 'javascript-arrays-1'],
    duelProblemTitles: ['Hopper\'s Packet Pair', 'Kepler\'s Mirror Label', 'Meitner\'s Rotation Check'],
    ctaLabel: 'Benchmark JavaScript skills',
  },
  {
    id: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    description: 'Timed DSA practice for interview pressure.',
    audience: 'Interview candidates and strong cohorts.',
    language: 'multi',
    benchmarkLanguage: 'javascript',
    benchmarkRole: 'junior',
    benchmarkGoal: 'interview_prep',
    highlightedSkills: ['Arrays and strings', 'Hash maps', 'Greedy logic', 'Debugging speed'],
    recommendedLessonIds: ['javascript-arrays-1', 'cpp-arrays', 'java-arrays', 'python-lists'],
    duelProblemTitles: ['Hopper\'s Packet Pair', 'Kepler\'s Mirror Label', 'Galileo\'s Rising Streak'],
    ctaLabel: 'See DSA practice path',
  },
  {
    id: 'backend-problem-solving',
    title: 'Backend Problem Solving',
    description: 'Practice backend-style data handling and logic.',
    audience: 'Backend juniors and upskilling teams.',
    language: 'multi',
    benchmarkLanguage: 'python',
    benchmarkRole: 'junior',
    benchmarkGoal: 'interview_prep',
    highlightedSkills: ['Data structures', 'Defensive coding', 'Loops and conditions', 'Readable solutions'],
    recommendedLessonIds: ['python-dictionaries', 'python-functions', 'java-map', 'cpp-vectors'],
    duelProblemTitles: ['Curie\'s Cold Notes', 'Franklin\'s Signal Majority', 'Raman\'s Digit Echo'],
    ctaLabel: 'Open backend path',
  },
  {
    id: 'junior-developer-screening',
    title: 'Junior Developer Screening',
    description: 'Benchmark junior readiness fast.',
    audience: 'Hiring teams, bootcamps, and schools.',
    language: 'multi',
    benchmarkLanguage: 'python',
    benchmarkRole: 'intern',
    benchmarkGoal: 'class_improvement',
    highlightedSkills: ['Core syntax', 'Reading code', 'Problem solving', 'Readiness to duel'],
    recommendedLessonIds: ['python-variables-1', 'javascript-functions-1', 'java-methods', 'cpp-functions'],
    duelProblemTitles: ['Curie\'s Cold Notes', 'Hopper\'s Packet Pair', 'Raman\'s Digit Echo'],
    ctaLabel: 'View screening workflow',
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: '/ forever',
    description: 'One benchmark and starter access.',
    features: [
      'First benchmark and starter report',
      'One starter path',
      'Limited duel access',
      'Public profile basics',
    ],
    ctaLabel: 'Start free benchmark',
    ctaKind: 'secondary',
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: '/ month',
    description: 'Full reports, history, and tracks.',
    badge: 'Most popular',
    features: [
      'Full skill reports and roadmap',
      'Unlimited assessed practice',
      'Interview tracks',
      'Advanced duel analytics',
      'Progress history',
      'AI coaching placeholder',
    ],
    ctaLabel: 'Choose Pro',
    ctaKind: 'primary',
  },
  {
    name: 'Interview Sprint',
    price: '$149',
    cadence: '/ 8 weeks',
    description: 'Short, focused interview prep.',
    features: [
      'Interview-focused benchmark',
      'Role-based practice path',
      'Timed challenge packs',
      'Shareable progress summary',
    ],
    ctaLabel: 'Start Interview Sprint',
    ctaKind: 'secondary',
  },
  {
    name: 'Teams',
    price: '$299',
    cadence: '/ month',
    description: 'For cohorts up to 25 learners.',
    features: [
      'Cohort dashboard',
      'Assignments and challenge packs',
      'Leaderboards',
      'Benchmark analytics',
      'Instructor views',
      'Export-ready report placeholders',
    ],
    ctaLabel: 'See team plans',
    ctaKind: 'secondary',
  },
  {
    name: 'Teams Growth',
    price: '$999',
    cadence: '/ month',
    description: 'For multi-cohort teams up to 100.',
    features: [
      'Everything in Teams',
      'Multi-cohort visibility',
      'Expanded analytics',
      'Progress-over-time reporting',
      'Priority onboarding',
    ],
    ctaLabel: 'Talk about Growth',
    ctaKind: 'secondary',
  },
  {
    name: 'Custom',
    price: 'Contact',
    cadence: '',
    description: 'For larger or branded rollouts.',
    features: [
      'Custom challenge packs',
      'Branded rollouts',
      'SSO and integration planning',
      'Pilot design support',
    ],
    ctaLabel: 'Contact sales',
    ctaKind: 'secondary',
  },
];

export const faqItems: FaqItem[] = [
  {
    question: 'Is this for beginners or interview prep?',
    answer: 'Both. The benchmark adjusts to your goal and level.',
  },
  {
    question: 'How is this different from LeetCode?',
    answer: 'Codhak adds benchmarking, practice paths, duels, and team reporting.',
  },
  {
    question: 'Can teams or classes use this?',
    answer: 'Yes. Teams get dashboards, assignments, and progress views.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. The benchmark, practice paths, and duels all run in the browser.',
  },
  {
    question: 'How do you handle AI use and cheating?',
    answer: 'Timed prompts and telemetry reduce abuse. Teams can validate with duels or review.',
  },
];

export const teamUseCases: TeamUseCase[] = [
  {
    slug: 'bootcamps',
    title: 'Bootcamp cohorts',
    description: 'Benchmark learners and prove improvement.',
    outcomes: ['Faster learner segmentation', 'Cohort leaderboards', 'Clear benchmark-to-placement story'],
    primaryCta: 'Pilot with a bootcamp cohort',
  },
  {
    slug: 'universities',
    title: 'Universities and classrooms',
    description: 'Benchmark classes and track progress.',
    outcomes: ['Benchmark completion tracking', 'Progress over time', 'Top performer visibility'],
    primaryCta: 'Use Codhak in a class',
  },
  {
    slug: 'coding-clubs',
    title: 'Coding clubs and communities',
    description: 'Run competitions and track practice.',
    outcomes: ['Friendly competition', 'Challenge-based practice', 'Shareable progress and rankings'],
    primaryCta: 'Run a coding club season',
  },
  {
    slug: 'upskilling',
    title: 'Internal upskilling teams',
    description: 'Benchmark juniors and track growth.',
    outcomes: ['Skill-gap visibility', 'Role-based challenge packs', 'Progress snapshots for managers'],
    primaryCta: 'Benchmark an upskilling team',
  },
];

export const testimonialPlaceholders = [
  {
    quote: 'Pilot quote goes here.',
    attribution: 'Pilot coach, bootcamp cohort',
    isPlaceholder: true,
  },
  {
    quote: 'Team lead quote goes here.',
    attribution: 'Engineering manager, hiring/upskilling team',
    isPlaceholder: true,
  },
  {
    quote: 'Learner quote goes here.',
    attribution: 'Learner, interview prep path',
    isPlaceholder: true,
  },
];

export const audienceSegments = [
  {
    title: 'For Learners',
    description: 'Benchmark first. Practice next.',
    ctaLabel: 'Start free benchmark',
    href: '/benchmark',
  },
  {
    title: 'For Cohorts / Bootcamps / Schools',
    description: 'Benchmark, assign, track.',
    ctaLabel: 'See team plans',
    href: '/teams',
  },
  {
    title: 'For Hiring / Upskilling Teams',
    description: 'Use practical skill signals.',
    ctaLabel: 'View screening workflow',
    href: '/teams/upskilling',
  },
];

export const howItWorksSteps = [
  {
    title: 'Take benchmark',
    description: 'Pick goal, language, and level.',
  },
  {
    title: 'Get skill report',
    description: 'See score, gaps, and next step.',
  },
  {
    title: 'Follow roadmap',
    description: 'Open practice, duels, or teams.',
  },
];

export const languagePageDescriptions: Record<LanguageSlug, string> = {
  python: 'Benchmark Python and start the right path.',
  javascript: 'Benchmark JavaScript and sharpen interview basics.',
  java: 'Benchmark Java for classwork or junior roles.',
  cpp: 'Benchmark C++ fundamentals and problem solving.',
};

export const interviewPrepPageDescriptions: Record<string, string> = {
  'junior-developer-screening': 'Benchmark junior readiness fast.',
  'backend-problem-solving': 'Timed backend-style coding practice.',
  'data-structures-algorithms': 'Hands-on DSA practice.',
};
