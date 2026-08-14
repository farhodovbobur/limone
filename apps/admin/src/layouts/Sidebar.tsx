import type { Ref } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import logo from '../assets/logos/limone-logo.svg';
import { useAuthStore } from '../features/auth/store/authStore';
import { isAdminOnly, type Role } from '../shared/access';
import { Icons } from '../shared/icons';
import { findActiveNav, NAV_BY_ROLE } from './nav';
import { useSidebarStore } from './sidebarStore';
import { useDrawerNavigate } from './useNavDrawer';
import { UserMenu } from './UserMenu';

export function Sidebar({ panelRef }: { panelRef?: Ref<HTMLElement> }) {
  const { t } = useTranslation();
  const location = useLocation();
  const go = useDrawerNavigate();
  const user = useAuthStore((s) => s.user);
  const collapsed = useSidebarStore((s) => s.collapsed);
  const active = findActiveNav(location.pathname);
  const items = user ? (NAV_BY_ROLE[user.role as Role] ?? []) : [];

  return (
    <nav
      id="app-sidebar"
      ref={panelRef}
      inert={collapsed}
      className={`shell-motion fixed inset-y-0 left-0 z-30 flex w-62 flex-col rounded-r-3xl border-r border-cream-200 bg-cream-100 shadow-drawer lg:rounded-none lg:shadow-sidebar ${
        collapsed ? '-translate-x-full' : 'translate-x-0'
      }`}
    >
      <div className="flex h-16 items-center justify-center border-b border-cream-200 px-5">
        <img
          src={logo}
          alt="LIMONÉ APPAREL"
          className="w-40 select-none"
          draggable={false}
        />
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-3">
        <div className="px-3 pt-3 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-ink-tertiary uppercase">
          {t('shell.navSection')}
        </div>
        {items.map((n) => {
          const Icon = n.icon;
          const isActive = active?.key === n.key;
          return (
            <button
              key={n.key}
              // Stable hook for scripts; nav labels are translated.
              data-nav={n.key}
              type="button"
              onClick={() => go(n.path)}
              className={`group flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left font-medium u-focus transition-colors pointer-coarse:h-11 ${
                isActive
                  ? 'bg-olive-700 text-white'
                  : 'text-ink-secondary hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200'
              }`}
            >
              <Icon
                size={19}
                weight={isActive ? 'fill' : 'regular'}
                className={
                  isActive
                    ? 'text-white'
                    : 'text-ink-tertiary transition-colors group-hover:text-olive-700'
                }
              />
              <span className="flex-1 truncate">{t(`nav.${n.key}`)}</span>
              {isAdminOnly(n.key) && (
                <span
                  role="img"
                  title={t('shell.adminOnly')}
                  aria-label={t('shell.adminOnly')}
                  className="inline-flex"
                >
                  <Icons.lock
                    size={14}
                    className={
                      isActive ? 'text-white/70' : 'text-ink-tertiary/80'
                    }
                  />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="border-t border-cream-200 p-3">
        <UserMenu />
      </div>
    </nav>
  );
}
