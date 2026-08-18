import { RoleCode } from '../shared/enums/role.enum';

export const CATALOG_READERS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.WAREHOUSE_KEEPER,
  RoleCode.WORKSHOP_MANAGER,
] as const;

export const CATALOG_EDITORS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.WAREHOUSE_KEEPER,
] as const;
