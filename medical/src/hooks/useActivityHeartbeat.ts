import { useEffect, useRef } from 'react';
import { sendActivityHeartbeat, type ActivityHeartbeatReason, type ActivityVisibilityState } from '../lib/activity';

interface UseActivityHeartbeatOptions {
  enabled: boolean;
  path: string;
  heartbeatIntervalMs?: number;
  throttleMs?: number;
}

export function useActivityHeartbeat({
  enabled,
  path,
  heartbeatIntervalMs = 60_000,
  throttleMs = 45_000,
}: UseActivityHeartbeatOptions) {
  const lastSentAtRef = useRef(0);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const resolveVisibilityState = (): ActivityVisibilityState =>
      document.visibilityState === 'hidden' ? 'hidden' : 'visible';

    const sendHeartbeat = async (
      reason: ActivityHeartbeatReason,
      options?: { force?: boolean; visibilityState?: ActivityVisibilityState }
    ) => {
      const visibilityState = options?.visibilityState || resolveVisibilityState();
      const now = Date.now();
      const force = Boolean(options?.force);

      if (!force && visibilityState === 'visible' && now - lastSentAtRef.current < throttleMs) {
        return;
      }

      if (inFlightRef.current && !force) {
        return;
      }

      inFlightRef.current = true;
      try {
        await sendActivityHeartbeat({
          path,
          reason,
          visibilityState,
        });
        lastSentAtRef.current = Date.now();
      } catch {
        // Presence should never break the user experience.
      } finally {
        inFlightRef.current = false;
      }
    };

    void sendHeartbeat('bootstrap', { force: true });

    const onInteraction = () => {
      if (resolveVisibilityState() === 'visible') {
        void sendHeartbeat('interaction');
      }
    };

    const onFocus = () => {
      void sendHeartbeat('focus', { force: true, visibilityState: 'visible' });
    };

    const onVisibilityChange = () => {
      const visibilityState = resolveVisibilityState();
      if (visibilityState === 'hidden') {
        void sendHeartbeat('hidden', { force: true, visibilityState });
      } else {
        void sendHeartbeat('focus', { force: true, visibilityState });
      }
    };

    const onPageHide = () => {
      void sendHeartbeat('hidden', { force: true, visibilityState: 'hidden' });
    };

    const intervalId = window.setInterval(() => {
      if (resolveVisibilityState() === 'visible') {
        void sendHeartbeat('interval', { force: true, visibilityState: 'visible' });
      }
    }, heartbeatIntervalMs);

    window.addEventListener('focus', onFocus);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pointerdown', onInteraction, { passive: true });
    window.addEventListener('keydown', onInteraction, { passive: true });
    window.addEventListener('scroll', onInteraction, { passive: true });
    window.addEventListener('touchstart', onInteraction, { passive: true });
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pointerdown', onInteraction);
      window.removeEventListener('keydown', onInteraction);
      window.removeEventListener('scroll', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, heartbeatIntervalMs, path, throttleMs]);
}
