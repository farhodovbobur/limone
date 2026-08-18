import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

export const createColorSchema = z.object({
  name: catalogFields.colorName,
  translations: catalogFields.translations.optional(),
  hex: catalogFields.hex.nullish(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateColorSchema = createColorSchema
  .partial()
  .strict();

export class CreateColorDto extends createZodDto(createColorSchema) {}
export class UpdateColorDto extends createZodDto(updateColorSchema) {}
