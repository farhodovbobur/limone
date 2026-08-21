import { z } from 'zod';

const localeName = z.string().trim().min(1).max(100).optional();

const translations = z.object({
  uz: localeName,
  ru: localeName,
  en: localeName
})
  .strict();

const NO_CYRILLIC = /^[^\u0400-\u04FF]*$/;

const latinName = (max: number) => z
    .string()
    .trim()
    .min(1)
    .max(max)
    .regex(NO_CYRILLIC, 'Must be Latin script — check the keyboard layout');

export const catalogFields = {
  translations,
  categoryName: latinName(100),
  productName: latinName(150),
  productCode: latinName(30),
  notes: z.string().trim().max(2000),
  sku: latinName(60),
  barcode: latinName(32),
  minStock: z.number().int().min(0).max(1_000_000),
  id: z.number().int().positive(),
  sizeName: latinName(20),
  colorName: latinName(50),
  sortOrder: z.number().int().min(0).max(9999),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB'),
  isActive: z.boolean(),
};
