import { RoleCode } from '../shared/enums/role.enum';

export const PRICE_READERS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.DIRECTOR,
  RoleCode.SALES,
  RoleCode.WAREHOUSE_KEEPER,
  RoleCode.WORKSHOP_MANAGER,
] as const;

export const PRICE_EDITORS = [
  RoleCode.ADMIN,
  RoleCode.SUPERADMIN,
  RoleCode.DIRECTOR,
] as const;
