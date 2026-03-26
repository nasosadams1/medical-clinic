const envOverride = import.meta.env.VITE_FORCE_UNLOCK_ALL_LESSONS;

// Temporary production override: keep lessons open until the current lock model is re-enabled.
// Set VITE_FORCE_UNLOCK_ALL_LESSONS=0 later to restore the existing plan + tier gating.
export const forceUnlockAllLessons = envOverride == null ? true : envOverride !== '0';

