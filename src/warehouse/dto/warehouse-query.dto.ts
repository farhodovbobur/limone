import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { warehouseFields } from './warehouse-fields.schema';

const limit = z.coerce.number().int().min(1).max(200).optional();
const offset = z.coerce.number().int().min(0).max(1_000_000).optional();

export const balanceQuerySchema = z.object({
  productId: warehouseFields.id.optional(),
  variantId: warehouseFields.id.optional(),
  limit,
  offset,
})
  .strict();

export const movementQuerySchema = z.object({
  variantId: warehouseFields.id.optional(),
  limit,
  offset,
})
  .strict();

export class BalanceQueryDto extends createZodDto(balanceQuerySchema) {}
export class MovementQueryDto extends createZodDto(movementQuerySchema) {}
