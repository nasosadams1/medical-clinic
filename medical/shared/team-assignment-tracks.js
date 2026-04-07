export const TEAM_ASSIGNMENT_TRACKS = {
  'python-fundamentals': {
    title: 'Python Fundamentals',
    language: 'python',
    version: 1,
    recommendedLessonIds: ['python-variables-1', 'python-variables-2', 'python-if-statements', 'python-functions'],
  },
  'javascript-interview-prep': {
    title: 'JavaScript Practice Path',
    language: 'javascript',
    version: 1,
    recommendedLessonIds: [
      'javascript-variables-1',
      'javascript-if-else-1',
      'javascript-functions-1',
      'javascript-arrays-1',
    ],
  },
  'data-structures-algorithms': {
    title: 'Data Structures & Algorithms',
    language: 'multi',
    version: 1,
    recommendedLessonIds: ['javascript-arrays-1', 'cpp-arrays', 'java-arrays', 'python-lists'],
  },
  'backend-problem-solving': {
    title: 'Backend Problem Solving',
    language: 'multi',
    version: 1,
    recommendedLessonIds: ['python-dictionaries', 'python-functions', 'java-map', 'cpp-vectors'],
  },
  'junior-developer-screening': {
    title: 'Junior Developer Readiness',
    language: 'multi',
    version: 1,
    recommendedLessonIds: ['python-variables-1', 'javascript-functions-1', 'java-methods', 'cpp-functions'],
  },
};

export const getTeamAssignmentTrack = (trackId) => {
  if (!trackId) {
    return null;
  }

  return TEAM_ASSIGNMENT_TRACKS[trackId] || null;
};
