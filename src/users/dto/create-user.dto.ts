import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';
import { RoleCode } from '../../shared/enums/role.enum';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const createUserSchema = z
  .object({
    username: z.string().min(3).max(50),
    password: z.string().min(8).max(100),
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100).nullish(),
    phone: z.string().min(7).max(20).nullish(),
    email: z.email().max(150).nullish(),
    role: z.enum(RoleCode),
  })
  .strict();

export class CreateUserDto extends createZodDto(createUserSchema) {}
