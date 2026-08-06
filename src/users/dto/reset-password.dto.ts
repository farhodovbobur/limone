import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userFields } from './user-fields.schema';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const resetPasswordSchema = z.object({
  newPassword: userFields.password,
})
.strict();

export class ResetPasswordDto extends createZodDto(resetPasswordSchema) {}
