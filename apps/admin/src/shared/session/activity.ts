const ACTIVITY_KEY = 'limone-activity';
const REFRESH_LOCK_KEY = 'limone-refresh-lock';

export const DEFAULT_IDLE_LIMIT_MS = 2 * 60 * 60 * 1000;

/** How long the "still there?" dialog stays up before the session is closed. */
export const IDLE_WARN_MS = 2 * 60 * 1000;

/** Renew the access token this long before it expires. */
export const REFRESH_MARGIN_MS = 3 * 60 * 1000;

/** localStorage writes are synchronous — not on every keystroke. */
const WRITE_THROTTLE_MS = 15_000;

/** How long one tab's refresh suppresses the others' proactive attempts. */
const REFRESH_LOCK_MS = 30_000;

let lastWrite = 0;

export function markActivity(force = false): void {
  const now = Date.now();
  if (!force && now - lastWrite < WRITE_THROTTLE_MS) return;
  lastWrite = now;
  localStorage.setItem(ACTIVITY_KEY, String(now));
}

export function lastActivityAt(): number {
  return Number(localStorage.getItem(ACTIVITY_KEY)) || Date.now();
}

export function idleFor(): number {
  return Date.now() - lastActivityAt();
}

/** `limitMs` is passed in, not read here, so this file stays store-free. */
export function isIdleExpired(limitMs: number): boolean {
  return idleFor() >= limitMs;
}

export function claimRefreshSlot(): boolean {
  const now = Date.now();
  const previous = Number(localStorage.getItem(REFRESH_LOCK_KEY));
  if (now - previous < REFRESH_LOCK_MS) return false;
  localStorage.setItem(REFRESH_LOCK_KEY, String(now));
  return true;
}

export function clearActivity(): void {
  localStorage.removeItem(ACTIVITY_KEY);
  localStorage.removeItem(REFRESH_LOCK_KEY);
}

const ACTIVITY_EVENTS = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
] as const;

export function watchActivity(onActivity?: () => void): () => void {
  const onEvent = () => {
    markActivity();
    onActivity?.();
  };
  for (const name of ACTIVITY_EVENTS) {
    window.addEventListener(name, onEvent, { passive: true });
  }
  return () => {
    for (const name of ACTIVITY_EVENTS) {
      window.removeEventListener(name, onEvent);
    }
  };
}
