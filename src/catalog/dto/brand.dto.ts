import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

export const createBrandSchema = z.object({
  name: catalogFields.brandName,
  logo: catalogFields.logo.nullish(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateBrandSchema = createBrandSchema
  .partial()
  .strict();

export class CreateBrandDto extends createZodDto(createBrandSchema) {}
export class UpdateBrandDto extends createZodDto(updateBrandSchema) {}
