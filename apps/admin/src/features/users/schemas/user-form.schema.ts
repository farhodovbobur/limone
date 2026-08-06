import { z } from 'zod';
import { PASSWORD_MIN } from '../../../shared/password';
import { PHONE_PATTERN } from '../../../shared/phone';

const baseUserSchema = z.object({
  firstName: z.string().trim().min(1, 'drawer.vRequired').max(100),
  lastName: z.string().trim().max(100),
  username: z.string().trim().min(3, 'drawer.vUserShort').max(50),
  role: z.string().min(1, 'drawer.vRequired'),
  phone: z
    .string()
    .trim()
    .regex(PHONE_PATTERN, 'drawer.vPhone')
    .or(z.literal('')),
  email: z.email('drawer.vEmail').max(150).or(z.literal('')),
  password: z.string(),
  isActive: z.boolean(),
});

export type UserFormValues = z.infer<typeof baseUserSchema>;

export function buildUserFormSchema(
  existingUsernames: string[],
  isEdit: boolean,
) {
  return baseUserSchema.superRefine((v, ctx) => {
    if (existingUsernames.includes(v.username.trim().toLowerCase())) {
      ctx.addIssue({
        code: 'custom',
        path: ['username'],
        message: 'drawer.vUserTaken',
      });
    }
    if (!isEdit) {
      if (!v.password) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'drawer.vRequired',
        });
      } else if (v.password.length < PASSWORD_MIN) {
        ctx.addIssue({
          code: 'custom',
          path: ['password'],
          message: 'drawer.vPwShort',
        });
      }
    }
  });
}
