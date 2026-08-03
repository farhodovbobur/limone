import {
  ALL_ROLES,
  canAccess,
  type ModuleKey,
  type Role,
} from '../shared/access';
import { MODULE_ICONS, type AppIcon } from '../shared/icons';

export interface NavItem {
  key: ModuleKey;
  path: string;
  icon: AppIcon;
}

export const NAV: NavItem[] = [
  { key: 'dashboard', path: '/', icon: MODULE_ICONS.dashboard },
  { key: 'staff', path: '/staff', icon: MODULE_ICONS.staff },
  { key: 'orders', path: '/orders', icon: MODULE_ICONS.orders },
  { key: 'reports', path: '/reports', icon: MODULE_ICONS.reports },
];

export const NAV_BY_ROLE: Record<Role, NavItem[]> = Object.fromEntries(
  ALL_ROLES.map((role) => [role, NAV.filter((n) => canAccess(n.key, role))]),
) as Record<Role, NavItem[]>;

export function findActiveNav(pathname: string): NavItem | undefined {
  return NAV.find((n) =>
    n.path === '/' ? pathname === '/' : pathname.startsWith(n.path),
  );
}
