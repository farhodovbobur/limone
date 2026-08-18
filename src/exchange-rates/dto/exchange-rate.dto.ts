import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Moves to libs/shared with the Nx restructure, like userFields.
export const exchangeRateFields = {
  date: z.iso.date(),
  rate: z.number().positive().max(1_000_000),
};

export const createExchangeRateSchema = z.object({
  date: exchangeRateFields.date,
  rate: exchangeRateFields.rate,
})
  .strict();

export const updateExchangeRateSchema = z.object({
  rate: exchangeRateFields.rate,
})
  .strict();

export class CreateExchangeRateDto extends createZodDto(createExchangeRateSchema) {}
export class UpdateExchangeRateDto extends createZodDto(updateExchangeRateSchema) {}
