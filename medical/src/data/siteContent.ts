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
    helper: 'Structured lesson library',
  },
  {
    label: 'Practice prompts',
    value: `${duelProblemCounts.total}+`,
    helper: 'Practice and duel pool',
  },
  {
    label: 'Languages',
    value: '4',
    helper: 'Python, JS, Java, C++',
  },
  {
    label: 'Daily progress loop',
    value: 'Built in',
    helper: 'Practice, duels, streaks',
  },
];

export const interviewTracks: ProductTrack[] = [
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    description: 'Learn Python with clean fundamentals and steady practice.',
    audience: 'Beginners and early-career Python learners.',
    language: 'python',
    benchmarkLanguage: 'python',
    benchmarkRole: 'beginner',
    benchmarkGoal: 'skill_growth',
    highlightedSkills: ['Variables and data types', 'Control flow', 'Collections', 'Functions'],
    recommendedLessonIds: ['python-variables-1', 'python-variables-2', 'python-if-statements', 'python-functions'],
    duelProblemTitles: ['Curie\'s Cold Notes', 'Franklin\'s Signal Majority', 'Galileo\'s Rising Streak'],
    ctaLabel: 'Start Python path',
  },
  {
    id: 'javascript-interview-prep',
    title: 'JavaScript Practice Path',
    description: 'Sharpen JavaScript logic for projects and interviews.',
    audience: 'Frontend learners and job seekers.',
    language: 'javascript',
    benchmarkLanguage: 'javascript',
    benchmarkRole: 'junior',
    benchmarkGoal: 'interview_prep',
    highlightedSkills: ['Variables and scope', 'Control flow', 'Functions', 'Arrays and objects'],
    recommendedLessonIds: ['javascript-variables-1', 'javascript-if-else-1', 'javascript-functions-1', 'javascript-arrays-1'],
    duelProblemTitles: ['Hopper\'s Packet Pair', 'Kepler\'s Mirror Label', 'Meitner\'s Rotation Check'],
    ctaLabel: 'Start JavaScript path',
  },
  {
    id: 'data-structures-algorithms',
    title: 'Data Structures & Algorithms',
    description: 'Timed problem solving that builds speed and pattern recall.',
    audience: 'Ambitious learners and interview candidates.',
    language: 'multi',
    benchmarkLanguage: 'javascript',
    benchmarkRole: 'junior',
    benchmarkGoal: 'interview_prep',
    highlightedSkills: ['Arrays and strings', 'Hash maps', 'Greedy logic', 'Debugging speed'],
    recommendedLessonIds: ['javascript-arrays-1', 'cpp-arrays', 'java-arrays', 'python-lists'],
    duelProblemTitles: ['Hopper\'s Packet Pair', 'Kepler\'s Mirror Label', 'Galileo\'s Rising Streak'],
    ctaLabel: 'Open DSA path',
  },
  {
    id: 'backend-problem-solving',
    title: 'Backend Problem Solving',
    description: 'Practice backend-style data handling and readable logic.',
    audience: 'Backend learners and junior developers.',
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
    title: 'Junior Developer Readiness',
    description: 'Check core coding readiness before the next step.',
    audience: 'Learners, bootcamps, and teams validating fundamentals.',
    language: 'multi',
    benchmarkLanguage: 'python',
    benchmarkRole: 'intern',
    benchmarkGoal: 'class_improvement',
    highlightedSkills: ['Core syntax', 'Reading code', 'Problem solving', 'Readiness to duel'],
    recommendedLessonIds: ['python-variables-1', 'javascript-functions-1', 'java-methods', 'cpp-functions'],
    duelProblemTitles: ['Curie\'s Cold Notes', 'Hopper\'s Packet Pair', 'Raman\'s Digit Echo'],
    ctaLabel: 'Check junior readiness',
  },
];

export const pricingPlans: PricingPlan[] = [
  {
    name: 'Free',
    price: '$0',
    cadence: '/ forever',
    description: 'Start learning, practice daily, and build momentum.',
    features: [
      'Guided lessons and one starter path',
      'Practice workspace access',
      'Limited duel access',
      'One free skill check and starter report',
      'Public profile basics',
    ],
    ctaLabel: 'Start learning free',
    ctaKind: 'secondary',
  },
  {
    name: 'Pro',
    price: '$19',
    cadence: '/ month',
    description: 'For serious learners who want more depth and history.',
    badge: 'Most popular',
    features: [
      'Unlimited assessed practice',
      'Full skill reports and roadmap',
      'Progress history and retakes',
      'Interview and challenge tracks',
      'Advanced duel analytics',
      'AI coaching placeholder',
    ],
    ctaLabel: 'Unlock Pro',
    ctaKind: 'primary',
  },
  {
    name: 'Interview Sprint',
    price: '$149',
    cadence: '/ 8 weeks',
    description: 'Focused prep for high-intent interview windows.',
    features: [
      'Interview-focused skill check',
      'Role-based practice path',
      'Timed challenge packs',
      'Shareable progress summary',
    ],
    ctaLabel: 'Start Sprint',
    ctaKind: 'secondary',
  },
  {
    name: 'Teams',
    price: '$299',
    cadence: '/ month',
    description: 'Bring Codhak to a cohort of up to 25 learners.',
    features: [
      'Team dashboard',
      'Assignments and challenge packs',
      'Leaderboards',
      'Skill-check analytics',
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
    description: 'For larger teams running multiple cohorts.',
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
    description: 'For larger rollouts and custom training needs.',
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
    question: 'Is Codhak good for beginners?',
    answer: 'Yes. Start with lessons and guided practice, then use the skill check when you want a clearer baseline.',
  },
  {
    question: 'How is this different from video courses or LeetCode?',
    answer: 'Codhak combines short lessons, hands-on practice, duels, and visible progress in one loop.',
  },
  {
    question: 'What should I do first?',
    answer: 'Start learning in practice, or take the free skill check if you want a fast baseline first.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. Lessons, practice, skill checks, and duels all run in the browser.',
  },
  {
    question: 'Can teams or classes use this?',
    answer: 'Yes. Codhak for Teams adds dashboards, assignments, and progress views on top of the learner product.',
  },
  {
    question: 'How do you handle AI use and cheating?',
    answer: 'Timed prompts, trust telemetry, and follow-up duels help keep scores more trustworthy.',
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
    quote: 'Learner story goes here.',
    attribution: 'Learner, Python path',
    isPlaceholder: true,
  },
  {
    quote: 'Progress story goes here.',
    attribution: 'Learner, JavaScript sprint',
    isPlaceholder: true,
  },
  {
    quote: 'Team story goes here.',
    attribution: 'Instructor or team lead',
    isPlaceholder: true,
  },
];

export const audienceSegments = [
  {
    title: 'Start learning',
    description: 'Begin with lessons, coding practice, and steady progress.',
    ctaLabel: 'Open learner path',
    href: '/learn',
  },
  {
    title: 'Take the skill check',
    description: 'Find your level and get the next best path.',
    ctaLabel: 'Take free skill check',
    href: '/skill-check',
  },
  {
    title: 'Train a team',
    description: 'Use Codhak for cohorts, onboarding, and internal upskilling.',
    ctaLabel: 'Explore teams',
    href: '/teams',
  },
];

export const howItWorksSteps = [
  {
    title: 'Learn one skill',
    description: 'Move through short lessons and examples.',
  },
  {
    title: 'Practice with real code',
    description: 'Solve problems and build your streak.',
  },
  {
    title: 'Check your level',
    description: 'Use the skill check and duels to see progress.',
  },
];

export const languagePageDescriptions: Record<LanguageSlug, string> = {
  python: 'Learn Python with structured lessons, practice, and a quick skill check.',
  javascript: 'Learn JavaScript with practical coding paths and challenge-based progress.',
  java: 'Learn Java through class-ready fundamentals and junior developer practice.',
  cpp: 'Learn C++ through structured fundamentals and problem-solving practice.',
};

export const interviewPrepPageDescriptions: Record<string, string> = {
  'junior-developer-screening': 'Check junior developer readiness with practical coding signal.',
  'backend-problem-solving': 'Practice backend-style coding with clean, readable solutions.',
  'data-structures-algorithms': 'Build timed DSA skill through hands-on practice.',
};
