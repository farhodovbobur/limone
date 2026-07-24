import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// Moves to libs/shared with the Nx restructure so the admin UI reuses the same schema.
export const loginSchema = z
  .object({
    username: z.string().min(3).max(50),
    password: z.string().min(3),
  })
  .strict();

export class LoginDto extends createZodDto(loginSchema) {}
