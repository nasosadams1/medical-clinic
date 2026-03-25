let lessonsModulePromise: Promise<typeof import('./lessonsV2')> | null = null;

export const loadLessonsModule = () => {
  if (!lessonsModulePromise) {
    lessonsModulePromise = import('./lessonsV2').catch((error) => {
      lessonsModulePromise = null;
      throw error;
    });
  }

  return lessonsModulePromise;
};

export const preloadLessonsModule = () => {
  void loadLessonsModule();
};
