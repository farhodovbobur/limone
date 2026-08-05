import { useCallback, useEffect, useRef, useState } from 'react';
import { refreshAccessToken } from '../../../shared/api/axios';
import {
  claimRefreshSlot,
  IDLE_WARN_MS,
  idleFor,
  lastActivityAt,
  markActivity,
  REFRESH_MARGIN_MS,
  watchActivity,
} from '../../../shared/session/activity';
import { endSession } from '../../../shared/session/endSession';
import { accessTokenLifetime } from '../../../shared/session/token';
import { sessionIdleLimit, useAuthStore } from '../store/authStore';

const TICK_MS = 1_000;

export function useSessionKeepAlive() {
  const signedIn = useAuthStore((s) => s.accessToken !== null);
  const [warnUntil, setWarnUntil] = useState<number | null>(null);
  const warning = useRef(false);

  useEffect(() => {
    if (!signedIn) {
      warning.current = false;
      return;
    }

    markActivity(true);

    const tick = async () => {
      const { accessToken, tokenIssuedAt } = useAuthStore.getState();
      if (!accessToken) return;

      const idle = idleFor();
      const limit = sessionIdleLimit();

      if (idle >= limit) {
        await endSession('idle');
        return;
      }

      if (idle >= limit - IDLE_WARN_MS) {
        warning.current = true;
        setWarnUntil(lastActivityAt() + limit);
        return;
      }

      warning.current = false;
      setWarnUntil(null);
      const lifetime = accessTokenLifetime(accessToken);
      const nearExpiry =
        lifetime !== null &&
        tokenIssuedAt !== null &&
        Date.now() - tokenIssuedAt > lifetime - REFRESH_MARGIN_MS;

      if (nearExpiry && claimRefreshSlot()) {
        await refreshAccessToken().catch(() => undefined);
      }
    };

    const stopWatching = watchActivity(() => {
      if (!warning.current) return;
      markActivity(true);
      void tick();
    });

    void tick();
    const timer = setInterval(() => void tick(), TICK_MS);

    const onVisible = () => {
      if (document.visibilityState === 'visible') void tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      stopWatching();
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [signedIn]);

  const staySignedIn = useCallback(() => {
    markActivity(true);
    warning.current = false;
    setWarnUntil(null);
    if (claimRefreshSlot()) {
      void refreshAccessToken().catch(() => undefined);
    }
  }, []);

  const signOutNow = useCallback(() => void endSession('idle'), []);

  return { warnUntil: signedIn ? warnUntil : null, staySignedIn, signOutNow };
}
