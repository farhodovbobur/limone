import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

export const createSizeSchema = z.object({
  name: catalogFields.sizeName,
  translations: catalogFields.translations.optional(),
  sortOrder: catalogFields.sortOrder.optional(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateSizeSchema = createSizeSchema
  .partial()
  .strict();

export class CreateSizeDto extends createZodDto(createSizeSchema) {}
export class UpdateSizeDto extends createZodDto(updateSizeSchema) {}
