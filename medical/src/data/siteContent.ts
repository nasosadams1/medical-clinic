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
    helper: 'Real lesson library already in the product',
  },
  {
    label: 'Duel-ready challenges',
    value: `${duelProblemCounts.total}+`,
    helper: 'Timed coding prompts connected to the duel stack',
  },
  {
    label: 'Languages',
    value: '4',
    helper: 'Python, JavaScript, Java, and C++',
  },
  {
    label: 'Team workflows',
    value: 'Pilot-ready',
    helper: 'Cohort dashboards, assignments, and leaderboards',
  },
];

export const interviewTracks: ProductTrack[] = [
  {
    id: 'python-fundamentals',
    title: 'Python Fundamentals',
    description: 'Benchmark Python basics, tighten syntax, and move into applied backend logic with clear next steps.',
    audience: 'Beginners, interns, and junior developers building Python confidence.',
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
    description: 'Move from frontend fundamentals into interview-style reasoning with measurable scorecards.',
    audience: 'Frontend learners, bootcamp students, and job seekers preparing for JavaScript screens.',
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
    description: 'Use timed prompts and duel-style pressure to prove problem-solving under realistic interview conditions.',
    audience: 'Interview candidates and high-performing cohorts.',
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
    description: 'Build confidence in input handling, data structures, and logic that shows up in backend screenings.',
    audience: 'Backend juniors, apprentices, and internal upskilling programs.',
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
    description: 'Give learners or applicants one clear benchmark, a report, and a practice roadmap without wasting reviewer time.',
    audience: 'Hiring teams, bootcamps, and universities screening junior talent.',
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
    description: 'Start with one benchmark, a starter path, and limited duel access.',
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
    description: 'For individuals who want full skill reports, practice history, and interview tracks.',
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
    description: 'A focused prep package for short, high-intent interview windows.',
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
    description: 'For bootcamps, clubs, and classrooms running up to 25 active learners.',
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
    description: 'For multi-cohort programs and internal upskilling teams with up to 100 active learners.',
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
    description: 'For larger pilots, branded workflows, or integration-heavy use cases.',
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
    answer:
      'Both. The benchmark adapts to your goal and role level, then routes you into practice paths that are either foundational, cohort-oriented, or interview-focused.',
  },
  {
    question: 'How is this different from LeetCode?',
    answer:
      'Codhak combines skill benchmarking, guided practice, live duels, and cohort reporting. It is designed to measure readiness and show improvement, not just serve a question bank.',
  },
  {
    question: 'Can teams or classes use this?',
    answer:
      'Yes. Codhak now supports cohort-style workflows with benchmark dashboards, assignments, leaderboards, and progress snapshots for bootcamps, universities, clubs, and upskilling teams.',
  },
  {
    question: 'Do I need to install anything?',
    answer:
      'No. The benchmark, practice paths, and duels all run in the browser.',
  },
  {
    question: 'How do you handle AI use and cheating?',
    answer:
      'Benchmarks and duels are designed around timed prompts, judged outcomes, and anti-cheat telemetry. Teams can use the benchmark as a signal layer, then validate through live duels or interview-style review.',
  },
];

export const teamUseCases: TeamUseCase[] = [
  {
    slug: 'bootcamps',
    title: 'Bootcamp cohorts',
    description: 'Benchmark incoming learners, assign recovery paths, and prove improvement before career placement.',
    outcomes: ['Faster learner segmentation', 'Cohort leaderboards', 'Clear benchmark-to-placement story'],
    primaryCta: 'Pilot with a bootcamp cohort',
  },
  {
    slug: 'universities',
    title: 'Universities and classrooms',
    description: 'Give instructors a browser-based way to benchmark coding fluency and track assignment progress.',
    outcomes: ['Benchmark completion tracking', 'Progress over time', 'Top performer visibility'],
    primaryCta: 'Use Codhak in a class',
  },
  {
    slug: 'coding-clubs',
    title: 'Coding clubs and communities',
    description: 'Run competitions, create challenge packs, and keep members engaged through measurable practice.',
    outcomes: ['Friendly competition', 'Challenge-based practice', 'Shareable progress and rankings'],
    primaryCta: 'Run a coding club season',
  },
  {
    slug: 'upskilling',
    title: 'Internal upskilling teams',
    description: 'Benchmark junior developers quickly, assign remediation, and surface the strongest performers.',
    outcomes: ['Skill-gap visibility', 'Role-based challenge packs', 'Progress snapshots for managers'],
    primaryCta: 'Benchmark an upskilling team',
  },
];

export const testimonialPlaceholders = [
  {
    quote: 'Placeholder for an early pilot quote about how benchmark reports improved learner coaching.',
    attribution: 'Pilot coach, bootcamp cohort',
    isPlaceholder: true,
  },
  {
    quote: 'Placeholder for a team lead quote about using Codhak to benchmark junior developer readiness.',
    attribution: 'Engineering manager, hiring/upskilling team',
    isPlaceholder: true,
  },
  {
    quote: 'Placeholder for a learner quote about using Codhak to go from vague practice to a clear roadmap.',
    attribution: 'Learner, interview prep path',
    isPlaceholder: true,
  },
];

export const audienceSegments = [
  {
    title: 'For Learners',
    description: 'Start with a benchmark, get a report, and move into role-based practice instead of wandering through generic content.',
    ctaLabel: 'Start free benchmark',
    href: '/benchmark',
  },
  {
    title: 'For Cohorts / Bootcamps / Schools',
    description: 'Benchmark classes quickly, assign challenge packs, and track improvement through one dashboard.',
    ctaLabel: 'See team plans',
    href: '/teams',
  },
  {
    title: 'For Hiring / Upskilling Teams',
    description: 'Use practical coding signals, not passive content completion, to understand junior developer readiness.',
    ctaLabel: 'View screening workflow',
    href: '/teams/upskilling',
  },
];

export const howItWorksSteps = [
  {
    title: 'Take benchmark',
    description: 'Choose your goal, language, and target level, then complete a short, structured benchmark.',
  },
  {
    title: 'Get skill report',
    description: 'See overall score, strengths, weaknesses, duel readiness, and your recommended next path.',
  },
  {
    title: 'Follow roadmap',
    description: 'Work through practice paths, duel challenges, or assign the benchmark to a cohort.',
  },
];

export const languagePageDescriptions: Record<LanguageSlug, string> = {
  python:
    'Benchmark Python skill, sharpen core syntax, and move into backend-ready problem solving with a measurable roadmap.',
  javascript:
    'Benchmark JavaScript fluency, strengthen interview fundamentals, and move from syntax into practical reasoning.',
  java:
    'Benchmark Java fluency for classes, internship prep, and junior backend practice with structured follow-up paths.',
  cpp:
    'Benchmark C++ fundamentals, logic, and data-structure fluency with guided next steps and timed challenge recommendations.',
};

export const interviewPrepPageDescriptions: Record<string, string> = {
  'junior-developer-screening':
    'A practical benchmark and challenge flow for junior developer screening, internal mobility, and early-career interview prep.',
  'backend-problem-solving':
    'Timed coding practice for backend-style reasoning, data handling, and interview-readiness under real conditions.',
  'data-structures-algorithms':
    'Hands-on challenge flow for arrays, strings, hash maps, and algorithmic reasoning.',
};
