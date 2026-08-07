import { z } from 'zod';
import { PASSWORD_MIN } from '../../../shared/password';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'drawer.vRequired'),
  newPassword: z.string().min(PASSWORD_MIN, 'drawer.vPwShort').max(100),
  confirm: z.string(),
})
.superRefine((v, ctx) => {
  if (v.confirm !== v.newPassword) {
    ctx.addIssue({
      code: 'custom',
      path: ['confirm'],
      message: 'cp.vMismatch',
    });
  }
});

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
