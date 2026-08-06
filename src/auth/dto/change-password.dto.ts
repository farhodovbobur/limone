import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { userFields } from '../../users/dto/user-fields.schema';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: userFields.password,
  })
  .strict();

export class ChangePasswordDto extends createZodDto(changePasswordSchema) {}
