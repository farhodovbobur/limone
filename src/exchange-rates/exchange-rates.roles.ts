import { RoleCode } from '../shared/enums/role.enum';

/** Anyone who sees money in two currencies needs to read the rate. */
export const RATE_READERS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.DIRECTOR,
  RoleCode.WAREHOUSE_KEEPER,
  RoleCode.WORKSHOP_MANAGER,
] as const;

export const RATE_EDITORS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN
] as const;
