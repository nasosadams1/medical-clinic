let lessonsModulePromise: Promise<typeof import('./lessons')> | null = null;

export const loadLessonsModule = () => {
  if (!lessonsModulePromise) {
    lessonsModulePromise = import('./lessons').catch((error) => {
      lessonsModulePromise = null;
      throw error;
    });
  }

  return lessonsModulePromise;
};

export const preloadLessonsModule = () => {
  void loadLessonsModule();
};
