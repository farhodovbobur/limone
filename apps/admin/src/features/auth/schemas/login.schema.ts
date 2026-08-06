import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(3, 'login.validation.usernameMin').max(50),
  password: z.string().min(3, 'login.validation.passwordMin'),
})
.strict();

export type LoginInput = z.infer<typeof loginSchema>;
