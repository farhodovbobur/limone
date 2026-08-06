import { z } from 'zod';

// Moves to libs/shared with the Nx restructure.
export const userFields = {
  username: z.string().min(3).max(50),
  password: z.string().min(6).max(100),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+?\d{7,15}$/),
  email: z.email().max(150),
};
