import { z } from 'zod';

const localeName = z.string().trim().min(1).max(100).optional();

const translations = z.object({
  uz: localeName,
  ru: localeName,
  en: localeName
})
  .strict();

export const catalogFields = {
  translations,
  categoryName: z.string().trim().min(1).max(100),
  sizeName: z.string().trim().min(1).max(20),
  colorName: z.string().trim().min(1).max(50),
  sortOrder: z.number().int().min(0).max(9999),
  hex: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB'),
  isActive: z.boolean(),
};
