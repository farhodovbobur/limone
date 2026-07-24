import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RoleCode } from '../../shared/enums/role.enum';

// No username here — it is the login identity and stays immutable.
// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const updateUserSchema = z
  .object({
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100).nullable(),
    phone: z.string().min(7).max(20).nullable(),
    email: z.email().max(150).nullable(),
    role: z.enum(RoleCode),
    isActive: z.boolean(),
  })
  .partial()
  .strict();

export class UpdateUserDto extends createZodDto(updateUserSchema) {}
