import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { catalogFields } from './catalog-fields.schema';

const colorPair = z.object({
  colorId: catalogFields.id,
  color2Id: catalogFields.id.nullish(),
})
  .strict();

export const createProductVariantSchema = z.object({
  productId: catalogFields.id,
  sizeId: catalogFields.id,
  colorId: catalogFields.id,
  color2Id: catalogFields.id.nullish(),
  sku: catalogFields.sku.optional(),
  minStock: catalogFields.minStock.optional(),
  isActive: catalogFields.isActive.optional(),
})
  .strict();

export const updateProductVariantSchema = z.object({
  sku: catalogFields.sku,
  minStock: catalogFields.minStock,
  isActive: catalogFields.isActive,
})
  .partial()
  .strict();

export const productVariantMatrixSchema = z.object({
  productId: catalogFields.id,
  sizeIds: z.array(catalogFields.id).min(1).max(50),
  colors: z.array(colorPair).min(1).max(50),
})
  .strict();

export class CreateProductVariantDto extends createZodDto(createProductVariantSchema) {}
export class UpdateProductVariantDto extends createZodDto(updateProductVariantSchema) {}
export class ProductVariantMatrixDto extends createZodDto(productVariantMatrixSchema) {}
