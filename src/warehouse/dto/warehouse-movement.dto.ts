import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { warehouseFields } from './warehouse-fields.schema';

const header = {
  date: warehouseFields.date,
  clientRef: warehouseFields.clientRef.nullish(),
  note: warehouseFields.note.nullish(),
};

const shelfLine = z.object({
  variantId: warehouseFields.id,
  qty: warehouseFields.qty,
})
  .strict();

const countedLine = z.object({
  variantId: warehouseFields.id,
  countedQty: z.number().int().min(0).max(1_000_000),
})
  .strict();

export const createOpeningSchema = z.object({
  ...header,
  lines: z.array(shelfLine).min(1).max(500),
})
  .strict();

export const createIssueSchema = createOpeningSchema;

export const createCountSchema = z.object({
  ...header,
  lines: z.array(countedLine).min(1).max(500),
})
  .strict();

export const createReversalSchema = z.object({
  documentId: warehouseFields.id,
  date: warehouseFields.date,
  note: warehouseFields.note.nullish(),
})
  .strict();

export class CreateOpeningDto extends createZodDto(createOpeningSchema) {}
export class CreateIssueDto extends createZodDto(createIssueSchema) {}
export class CreateCountDto extends createZodDto(createCountSchema) {}
export class CreateReversalDto extends createZodDto(createReversalSchema) {}
