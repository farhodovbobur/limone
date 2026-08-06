import { z } from 'zod';
import { PHONE_PATTERN } from '../../../shared/phone';

export const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1, 'drawer.vRequired').max(100),
  lastName: z.string().trim().max(100),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'drawer.vPhone')
    .or(z.literal('')),
  email: z.email('drawer.vEmail').max(150).or(z.literal('')),
});

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
