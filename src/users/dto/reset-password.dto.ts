import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8).max(100),
  })
  .strict();

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
