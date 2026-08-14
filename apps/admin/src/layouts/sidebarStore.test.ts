import { beforeEach, describe, expect, it, vi } from 'vitest';

// Vitest runs on Node: no localStorage, no window. Both are stubbed rather
// than pulling in jsdom, matching the approach in shared/session/activity.test.
const stored = new Map<string, string>();
const storage = {
  getItem: (k: string) => stored.get(k) ?? null,
  setItem: (k: string, v: string) => void stored.set(k, String(v)),
  removeItem: (k: string) => void stored.delete(k),
  clear: () => stored.clear(),
  key: (i: number) => [...stored.keys()][i] ?? null,
  get length() {
    return stored.size;
  },
} satisfies Storage;

vi.stubGlobal('localStorage', storage);

/**
 * Re-imports the store with `matchMedia` reporting the given mode. The merge
 * runs once at module load, so every case needs a fresh module registry.
 */
async function loadStore(mode: 'desktop' | 'narrow') {
  vi.resetModules();
  vi.stubGlobal('window', {
    localStorage: storage,
    matchMedia: (media: string) => ({
      media,
      matches: mode === 'desktop',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });
  return (await import('./sidebarStore')).useSidebarStore;
}

const persist = (railPreference: boolean) =>
  stored.set('limone-sidebar', JSON.stringify({ state: { railPreference } }));

const savedPreference = (): boolean | undefined => {
  const raw = stored.get('limone-sidebar');
  if (!raw) return undefined;
  const parsed = JSON.parse(raw) as { state?: { railPreference?: boolean } };
  return parsed.state?.railPreference;
};

describe('sidebarStore', () => {
  beforeEach(() => stored.clear());

  describe('on desktop the stored preference is honoured', () => {
    it('restores a collapsed rail', async () => {
      persist(true);
      const store = await loadStore('desktop');
      expect(store.getState().collapsed).toBe(true);
    });

    it('restores an open rail', async () => {
      persist(false);
      const store = await loadStore('desktop');
      expect(store.getState().collapsed).toBe(false);
    });

    it('defaults to open with nothing stored', async () => {
      const store = await loadStore('desktop');
      expect(store.getState().collapsed).toBe(false);
    });
  });

  describe('below the breakpoint the panel always starts closed', () => {
    // The regression this guards: the same bit means "rail visible" on desktop
    // and "drawer covering the page" on a phone. Restoring it there would land
    // a workshop phone on a screen full of navigation instead of the page.
    it('ignores a stored open rail', async () => {
      persist(false);
      const store = await loadStore('narrow');
      expect(store.getState().collapsed).toBe(true);
    });

    it('stays closed with nothing stored', async () => {
      const store = await loadStore('narrow');
      expect(store.getState().collapsed).toBe(true);
    });
  });

  describe('actions', () => {
    it('toggle flips the current value', async () => {
      const store = await loadStore('desktop');
      expect(store.getState().collapsed).toBe(false);
      store.getState().toggle();
      expect(store.getState().collapsed).toBe(true);
      store.getState().toggle();
      expect(store.getState().collapsed).toBe(false);
    });

    it('close is idempotent — the scrim can fire it more than once', async () => {
      const store = await loadStore('desktop');
      store.getState().close();
      store.getState().close();
      expect(store.getState().collapsed).toBe(true);
    });
  });

  describe('the desktop preference survives narrow use', () => {
    // Found live: with one bit doing both jobs, every drawer close wrote
    // "collapsed" to storage, so a single phone-width visit left the desktop
    // rail shut for good. `railPreference` is what is persisted, and only a
    // toggle made in rail mode may write it.
    it('a toggle in rail mode is remembered', async () => {
      const store = await loadStore('desktop');
      store.getState().toggle();
      expect(savedPreference()).toBe(true);
    });

    it('closing the drawer does not overwrite it', async () => {
      persist(false);
      const store = await loadStore('narrow');
      store.getState().close();
      expect(store.getState().collapsed).toBe(true);
      expect(savedPreference()).toBe(false);
    });

    it('toggling the drawer does not overwrite it', async () => {
      persist(false);
      const store = await loadStore('narrow');
      store.getState().toggle(); // open the drawer
      store.getState().toggle(); // close it again
      expect(savedPreference()).toBe(false);
    });
  });
});
