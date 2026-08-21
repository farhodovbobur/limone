import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

export const createProductSchema = z.object({
  name: catalogFields.productName,
  translations: catalogFields.translations.optional(),
  code: catalogFields.productCode.nullish(),
  categoryId: catalogFields.id.nullish(),
  notes: catalogFields.notes.nullish(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateProductSchema = createProductSchema
  .partial()
  .strict();

export class CreateProductDto extends createZodDto(createProductSchema) {}
export class UpdateProductDto extends createZodDto(updateProductSchema) {}
