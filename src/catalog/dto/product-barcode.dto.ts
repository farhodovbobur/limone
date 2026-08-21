import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { BarcodeType } from '../entities/product-barcode.entity';
import { catalogFields } from './catalog-fields.schema';

export const createProductBarcodeSchema = z.object({
  variantId: catalogFields.id,
  code: catalogFields.barcode,
  type: z.enum([BarcodeType.EAN13, BarcodeType.SUPPLIER]),
  note: z.string().trim().max(255).nullish(),
})
  .strict();

export class CreateProductBarcodeDto extends createZodDto(createProductBarcodeSchema) {}
