import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

export const createProductCategorySchema = z.object({
  name: catalogFields.categoryName,
  translations: catalogFields.translations.optional(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateProductCategorySchema = createProductCategorySchema
  .partial()
  .strict();

export class CreateProductCategoryDto extends createZodDto(createProductCategorySchema) {}
export class UpdateProductCategoryDto extends createZodDto(updateProductCategorySchema) {}
