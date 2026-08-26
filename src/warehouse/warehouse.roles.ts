import { RoleCode } from '../shared/enums/role.enum';

export const WAREHOUSE_READERS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.DIRECTOR,
  RoleCode.WAREHOUSE_KEEPER,
  RoleCode.WORKSHOP_MANAGER,
] as const;

export const WAREHOUSE_EDITORS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.WAREHOUSE_KEEPER,
] as const;
