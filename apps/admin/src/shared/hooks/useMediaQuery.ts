import { useCallback, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string, fallback = true): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) return () => {};
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );

  const snapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return fallback;
    return window.matchMedia(query).matches;
  }, [query, fallback]);

  return useSyncExternalStore(subscribe, snapshot, () => fallback);
}
