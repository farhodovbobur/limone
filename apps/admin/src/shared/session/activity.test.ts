import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  claimRefreshSlot,
  clearActivity,
  DEFAULT_IDLE_LIMIT_MS,
  idleFor,
  isIdleExpired,
  lastActivityAt,
  markActivity,
} from './activity';

// Vitest runs on Node, which has no localStorage. A ten-line in-memory Storage
// keeps this suite dependency-free; pulling in jsdom for a string map would be
// a heavier answer than the question deserves. Safe below the import because
// activity.ts only touches storage inside its functions, never at module load.
const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, String(v)),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
  key: (i: number) => [...store.keys()][i] ?? null,
  get length() {
    return store.size;
  },
} satisfies Storage);

describe('activity', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-05T10:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('reads a missing stamp as "now", never as 1970', () => {
    // The dangerous default: an empty key parsed as 0 would make every fresh
    // login look two hours idle and sign the user straight back out.
    expect(isIdleExpired(DEFAULT_IDLE_LIMIT_MS)).toBe(false);
    expect(idleFor()).toBe(0);
  });

  it('records activity and measures the gap in wall-clock time', () => {
    markActivity(true);
    vi.advanceTimersByTime(90 * 60 * 1000);
    expect(idleFor()).toBe(90 * 60 * 1000);
    expect(isIdleExpired(DEFAULT_IDLE_LIMIT_MS)).toBe(false);
  });

  it('expires exactly at the limit, not a tick later', () => {
    markActivity(true);
    vi.advanceTimersByTime(DEFAULT_IDLE_LIMIT_MS - 1);
    expect(isIdleExpired(DEFAULT_IDLE_LIMIT_MS)).toBe(false);
    vi.advanceTimersByTime(1);
    expect(isIdleExpired(DEFAULT_IDLE_LIMIT_MS)).toBe(true);
  });

  it('survives a sleeping laptop — the gap is measured, not counted', () => {
    // No ticks run while the machine sleeps; only the clock moves.
    markActivity(true);
    vi.setSystemTime(new Date('2026-08-05T13:00:00Z'));
    expect(isIdleExpired(DEFAULT_IDLE_LIMIT_MS)).toBe(true);
  });

  it('throttles writes but honours a forced one', () => {
    markActivity(true);
    const first = lastActivityAt();

    vi.advanceTimersByTime(5_000);
    markActivity();
    expect(lastActivityAt()).toBe(first);

    markActivity(true);
    expect(lastActivityAt()).toBe(first + 5_000);
  });

  it('lets the write through once the throttle window passes', () => {
    markActivity(true);
    const first = lastActivityAt();
    vi.advanceTimersByTime(20_000);
    markActivity();
    expect(lastActivityAt()).toBe(first + 20_000);
  });

  it('gives the refresh slot to one caller at a time', () => {
    // Two tabs share a token and reach the refresh margin together; the loser
    // must back off, or it presents an already-rotated token and the API
    // treats that as reuse and kills every session.
    expect(claimRefreshSlot()).toBe(true);
    expect(claimRefreshSlot()).toBe(false);
  });

  it('reopens the refresh slot after the lock window', () => {
    expect(claimRefreshSlot()).toBe(true);
    vi.advanceTimersByTime(30_000);
    expect(claimRefreshSlot()).toBe(true);
  });

  it('clears both keys on sign-out', () => {
    markActivity(true);
    claimRefreshSlot();
    clearActivity();
    expect(localStorage.getItem('limone-activity')).toBeNull();
    expect(localStorage.getItem('limone-refresh-lock')).toBeNull();
  });
});
