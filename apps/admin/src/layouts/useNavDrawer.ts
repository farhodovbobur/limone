import { useCallback, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useMediaQuery } from '../shared/hooks/useMediaQuery';
import { DESKTOP_QUERY, isDesktop, useSidebarStore } from './sidebarStore';

export const NAV_TOGGLE_ID = 'app-nav-toggle';

export const useIsDesktop = (): boolean => useMediaQuery(DESKTOP_QUERY);

export function useDrawerNavigate() {
  const navigate = useNavigate();
  const close = useSidebarStore((s) => s.close);
  return useCallback(
    (to: string) => {
      if (!isDesktop()) close();
      void navigate(to);
    },
    [navigate, close],
  );
}

export function useNavDrawer() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const close = useSidebarStore((s) => s.close);
  const desktop = useIsDesktop();
  const { pathname } = useLocation();
  const panelRef = useRef<HTMLElement | null>(null);

  const drawerOpen = !desktop && !collapsed;

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const openOverlay = [...document.querySelectorAll('.ant-dropdown')].some(
        (el) =>
          !el.classList.contains('ant-dropdown-hidden') &&
          !el.className.includes('-leave'),
      );
      if (openOverlay) return;
      close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerOpen, close]);

  useEffect(() => {
    if (!isDesktop()) close();
  }, [pathname, close]);

  const hadFocus = useRef(false);
  useEffect(() => {
    if (drawerOpen) {
      hadFocus.current = true;
      panelRef.current?.querySelector<HTMLElement>('button, a')?.focus();
    } else if (hadFocus.current) {
      hadFocus.current = false;
      document.getElementById(NAV_TOGGLE_ID)?.focus();
    }
  }, [drawerOpen]);

  return { collapsed, drawerOpen, close, panelRef };
}
