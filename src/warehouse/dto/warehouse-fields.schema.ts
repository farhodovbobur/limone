import { z } from 'zod';

export const warehouseFields = {
  id: z.coerce.number().int().positive(),
  qty: z.number().int().positive().max(1_000_000),
  date: z.iso.date(),
  clientRef: z.string().trim().min(1).max(64),
  note: z.string().trim().max(500),
};
