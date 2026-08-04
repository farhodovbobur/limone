import { z } from 'zod';

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'drawer.vRequired'),
  newPassword: z.string().min(8, 'drawer.vPwShort').max(100),
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
