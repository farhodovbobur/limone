import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(100),
  })
  .strict();

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
