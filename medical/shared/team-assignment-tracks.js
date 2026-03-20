export const TEAM_ASSIGNMENT_TRACKS = {
  'python-fundamentals': {
    language: 'python',
    recommendedLessonIds: ['python-variables-1', 'python-variables-2', 'python-if-statements', 'python-functions'],
  },
  'javascript-interview-prep': {
    language: 'javascript',
    recommendedLessonIds: [
      'javascript-variables-1',
      'javascript-if-else-1',
      'javascript-functions-1',
      'javascript-arrays-1',
    ],
  },
  'data-structures-algorithms': {
    language: 'multi',
    recommendedLessonIds: ['javascript-arrays-1', 'cpp-arrays', 'java-arrays', 'python-lists'],
  },
  'backend-problem-solving': {
    language: 'multi',
    recommendedLessonIds: ['python-dictionaries', 'python-functions', 'java-map', 'cpp-vectors'],
  },
  'junior-developer-screening': {
    language: 'multi',
    recommendedLessonIds: ['python-variables-1', 'javascript-functions-1', 'java-methods', 'cpp-functions'],
  },
};

export const getTeamAssignmentTrack = (trackId) => {
  if (!trackId) {
    return null;
  }

  return TEAM_ASSIGNMENT_TRACKS[trackId] || null;
};
