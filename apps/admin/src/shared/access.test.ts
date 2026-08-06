import { describe, expect, it } from 'vitest';
import { NAV, NAV_BY_ROLE } from '../layouts/nav';
import {
  ALL_ROLES,
  canAccess,
  isAdminOnly,
  MODULE_ACCESS,
  type ModuleKey,
  type Role,
} from './access';

const EXPECTED: Record<ModuleKey, Record<Role, boolean>> = {
  dashboard: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: true,
    workshop_manager: true,
    worker: true,
    sales: true,
    customer: true,
  },
  materials: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: true,
    workshop_manager: true,
    worker: false,
    sales: false,
    customer: false,
  },
  goods: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: true,
    workshop_manager: true,
    worker: false,
    sales: true,
    customer: false,
  },
  production: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: false,
    workshop_manager: true,
    worker: true,
    sales: false,
    customer: false,
  },
  users: {
    admin: true,
    superadmin: true,
    director: false,
    warehouse_keeper: false,
    workshop_manager: false,
    worker: false,
    sales: false,
    customer: false,
  },
  orders: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: false,
    workshop_manager: false,
    worker: false,
    sales: true,
    customer: false,
  },
  reports: {
    admin: true,
    superadmin: true,
    director: true,
    warehouse_keeper: true,
    workshop_manager: true,
    worker: false,
    sales: true,
    customer: false,
  },
};

describe('MODULE_ACCESS matrix (PHASE_0 §6)', () => {
  for (const moduleKey of Object.keys(EXPECTED) as ModuleKey[]) {
    for (const role of ALL_ROLES) {
      const allowed = EXPECTED[moduleKey][role];
      it(`${role} ${allowed ? 'sees' : 'does NOT see'} ${moduleKey}`, () => {
        expect(canAccess(moduleKey, role)).toBe(allowed);
      });
    }
  }

  it('the expected table covers every module, no more, no less', () => {
    expect(Object.keys(EXPECTED).sort()).toEqual(
      Object.keys(MODULE_ACCESS).sort(),
    );
  });

  it('unknown or missing role sees nothing restricted', () => {
    expect(canAccess('users', undefined)).toBe(false);
    expect(canAccess('users', 'ghost')).toBe(false);
    // dashboard is 'authenticated' — the real gate is RequireAuth (token),
    // not the role, so visibility is true even without one.
    expect(canAccess('dashboard', undefined)).toBe(true);
  });
});

describe('isAdminOnly (sidebar lock badge)', () => {
  it('flags exactly the users module', () => {
    const flagged = (Object.keys(MODULE_ACCESS) as ModuleKey[]).filter((k) =>
      isAdminOnly(k),
    );
    expect(flagged).toEqual(['users']);
  });
});

describe('NAV_BY_ROLE', () => {
  // Derived from EXPECTED, so this stays valid as NAV grows in Phase 1+.
  for (const role of ALL_ROLES) {
    it(`${role} nav matches the matrix`, () => {
      const expectedKeys = NAV.map((n) => n.key).filter(
        (k) => EXPECTED[k][role],
      );
      expect(NAV_BY_ROLE[role].map((n) => n.key)).toEqual(expectedKeys);
    });
  }
});
