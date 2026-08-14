import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DESKTOP_QUERY = '(min-width: 1024px)';

const desktopMedia = (): MediaQueryList | null =>
  typeof window === 'undefined' || !window.matchMedia
    ? null
    : window.matchMedia(DESKTOP_QUERY);

export const isDesktop = (): boolean => desktopMedia()?.matches ?? true;

interface SidebarState {
  collapsed: boolean;
  railPreference: boolean;
  toggle: () => void;
  close: () => void;
}

type Persisted = Partial<Pick<SidebarState, 'railPreference'>>;

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      collapsed: false,
      railPreference: false,
      toggle: () =>
        set((s) => ({
          collapsed: !s.collapsed,
          ...(isDesktop() ? { railPreference: !s.collapsed } : {}),
        })),
      close: () => set({ collapsed: true }),
    }),
    {
      name: 'limone-sidebar',
      partialize: (s): Persisted => ({ railPreference: s.railPreference }),
      merge: (persisted, current) => {
        const pref = (persisted as Persisted | undefined)?.railPreference;
        const railPreference = pref ?? current.railPreference;
        return {
          ...current,
          railPreference,
          collapsed: isDesktop() ? railPreference : true,
        };
      },
    },
  ),
);

desktopMedia()?.addEventListener('change', (e) => {
  if (!e.matches) useSidebarStore.setState({ collapsed: true });
});
