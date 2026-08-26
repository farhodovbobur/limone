import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { Currency } from '../../shared/enums/currency.enum';

export const productPriceFields = {
  id: z.number().int().positive(),
  date: z.iso.date(),
  money: z.number().positive().max(999_999_999_999.99),
  note: z.string().trim().max(500),
};

export const createProductPriceSchema = z.object({
  variantId: productPriceFields.id,
  currency: z.enum([Currency.UZS, Currency.USD]),
  price: productPriceFields.money,
  date: productPriceFields.date,
  cost: productPriceFields.money,
  note: productPriceFields.note.nullish(),
})
  .strict();

export class CreateProductPriceDto extends createZodDto(createProductPriceSchema) {}
