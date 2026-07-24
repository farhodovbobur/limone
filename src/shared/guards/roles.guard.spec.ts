import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleCode } from '../enums/role.enum';
import { RolesGuard } from './roles.guard';

function contextWithUser(user?: { role?: string }): ExecutionContext {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const withRequired = (roles?: RoleCode[]) =>
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles);

  afterEach(() => jest.restoreAllMocks());

  it('opens endpoints that declare no @Roles', () => {
    withRequired(undefined);

    expect(guard.canActivate(contextWithUser({ role: 'worker' }))).toBe(true);
  });

  it('allows a user whose role is in the required list', () => {
    withRequired([RoleCode.ADMIN, RoleCode.SUPERADMIN]);

    expect(guard.canActivate(contextWithUser({ role: 'admin' }))).toBe(true);
  });

  it('rejects a user with a different role', () => {
    withRequired([RoleCode.ADMIN]);

    expect(guard.canActivate(contextWithUser({ role: 'worker' }))).toBe(false);
  });

  it('rejects when there is no authenticated user at all', () => {
    withRequired([RoleCode.ADMIN]);

    expect(guard.canActivate(contextWithUser(undefined))).toBe(false);
  });
});
