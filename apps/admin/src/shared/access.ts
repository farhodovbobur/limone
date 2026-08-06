// Module visibility per role — mirrors the authorization matrix in
// PHASE_0_FOUNDATION.md §6. Single source for the sidebar AND route guards.
// UI hiding is UX only: the API enforces the same rules with RolesGuard.
// superadmin/director semantics are still open (BUSINESS_PLAN §12) —
// for now superadmin = admin everywhere, director = read-only viewer.
// Moves to libs/shared when Nx returns. Phase 1 will widen values to
// { view, write } per PHASE_1 §8.

// Mirrors the API's RoleCode enum (src/shared/enums/role.enum.ts).
export type Role =
  | 'admin'
  | 'superadmin'
  | 'director'
  | 'warehouse_keeper'
  | 'workshop_manager'
  | 'worker'
  | 'sales'
  | 'customer';

export const ALL_ROLES: readonly Role[] = [
  'admin',
  'superadmin',
  'director',
  'warehouse_keeper',
  'workshop_manager',
  'worker',
  'sales',
  'customer',
];

export const ADMIN_ROLES: readonly Role[] = ['admin', 'superadmin'];

const VIEWERS: readonly Role[] = [...ADMIN_ROLES, 'director'];

export const MODULE_ACCESS = {
  dashboard: 'authenticated',
  materials: [...VIEWERS, 'warehouse_keeper', 'workshop_manager'],
  goods: [...VIEWERS, 'warehouse_keeper', 'workshop_manager', 'sales'],
  production: [...VIEWERS, 'workshop_manager', 'worker'],
  users: ADMIN_ROLES,
  orders: [...VIEWERS, 'sales'],
  reports: [...VIEWERS, 'warehouse_keeper', 'workshop_manager', 'sales'],
} as const satisfies Record<string, readonly Role[] | 'authenticated'>;

export type ModuleKey = keyof typeof MODULE_ACCESS;

export function canAccess(
  moduleKey: ModuleKey,
  role: string | undefined,
): boolean {
  const allowed = MODULE_ACCESS[moduleKey];
  if (allowed === 'authenticated') return true;
  return role !== undefined && (allowed as readonly string[]).includes(role);
}

// True only when a module is restricted to admins — drives the lock badge.
export function isAdminOnly(moduleKey: ModuleKey): boolean {
  const allowed = MODULE_ACCESS[moduleKey];
  return (
    allowed !== 'authenticated' &&
    allowed.every((r) => (ADMIN_ROLES as readonly string[]).includes(r))
  );
}
