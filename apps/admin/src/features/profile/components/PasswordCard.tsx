import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Input } from 'antd';
import { AxiosError } from 'axios';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { authApi } from '../../auth/api/authApi';
import { useAuthStore } from '../../auth/store/authStore';
import { Req } from '../../../shared/components/Req';
import { Icons } from '../../../shared/icons';
import { passwordStrength } from '../lib';
import {
  changePasswordSchema,
  type ChangePasswordFormValues,
} from '../schemas/change-password.schema';

const STRENGTH_COLORS = [
  '',
  'bg-danger',
  'bg-warning',
  'bg-success',
  'bg-success',
];

export function PasswordCard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const clearSession = useAuthStore((s) => s.clearSession);

  const { control, handleSubmit } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const newPassword = useWatch({ control, name: 'newPassword' }) ?? '';
  const strength = passwordStrength(newPassword);

  const change = useMutation({
    mutationFn: (v: ChangePasswordFormValues) =>
      authApi.changePassword({
        currentPassword: v.currentPassword,
        newPassword: v.newPassword,
      }),
    onSuccess: () => {
      clearSession();
      void navigate('/login', { replace: true });
    },
  });

  const errorKey =
    change.error instanceof AxiosError && change.error.response?.status === 400
      ? 'cp.wrongCurrent'
      : change.error
        ? 'login.serverError'
        : null;

  const checks = [
    { ok: newPassword.length >= 8, label: t('profile.req8') },
    {
      ok: /[a-zA-Z]/.test(newPassword) && /\d/.test(newPassword),
      label: t('profile.reqMix'),
    },
    {
      ok: /[^a-zA-Z0-9]/.test(newPassword),
      label: t('profile.reqSpecial'),
    },
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-line/60 px-5 py-3.5">
          <Icons.key size={17} className="text-olive-600" />
          <span className="flex-1 text-sm font-medium">{t('cp.title')}</span>
        </div>

        <form
          className="flex flex-col gap-3 px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit((v) => change.mutate(v))();
          }}
        >
          {errorKey && <Alert type="error" showIcon title={t(errorKey)} />}

          {(
            [
              {
                name: 'currentPassword',
                label: 'cp.current',
                auto: 'current-password',
              },
              { name: 'newPassword', label: 'cp.new', auto: 'new-password' },
              { name: 'confirm', label: 'cp.confirm', auto: 'new-password' },
            ] as const
          ).map((f) => (
            <Controller
              key={f.name}
              control={control}
              name={f.name}
              render={({ field, fieldState }) => (
                <div className="flex items-start gap-4">
                  <label
                    htmlFor={`pw-${f.name}`}
                    className="w-44 flex-none pt-2 text-[13px] text-ink-secondary"
                  >
                    {t(f.label)}
                    <Req />
                  </label>
                  <div className="flex flex-1 flex-col gap-1">
                    <Input.Password
                      {...field}
                      id={`pw-${f.name}`}
                      autoComplete={f.auto}
                      aria-required
                      status={fieldState.error ? 'error' : undefined}
                    />
                    {fieldState.error?.message && (
                      <span className="text-xs text-danger">
                        {t(fieldState.error.message)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            />
          ))}

          {newPassword && (
            <div className="flex items-center gap-4">
              <span className="w-44 flex-none" />
              <div className="flex flex-1 items-center gap-2.5">
                <div className="flex flex-1 gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span
                      key={i}
                      className={`h-1 flex-1 rounded-full ${
                        i <= strength ? STRENGTH_COLORS[strength] : 'bg-line'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-[11.5px] text-ink-secondary">
                  {t(`profile.strength${Math.max(strength, 1)}`)}
                </span>
              </div>
            </div>
          )}

          <div className="mt-1 flex justify-end border-t border-line/60 pt-3.5">
            <Button type="primary" htmlType="submit" loading={change.isPending}>
              {t('cp.submit')}
            </Button>
          </div>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-line/60 px-5 py-3.5">
          <Icons.shieldCheck size={17} className="text-olive-600" />
          <span className="text-sm font-medium">{t('profile.reqTitle')}</span>
        </div>
        <div className="flex flex-col gap-2.5 px-5 py-4">
          {checks.map((c) => (
            <div key={c.label} className="flex items-center gap-2.5">
              {c.ok ? (
                <Icons.checkCircle
                  size={16}
                  weight="fill"
                  className="text-success"
                />
              ) : (
                <Icons.circle size={16} className="text-ink-tertiary/50" />
              )}
              <span
                className={`text-[12.5px] ${c.ok ? 'text-ink-secondary' : 'text-ink-tertiary'}`}
              >
                {c.label}
              </span>
            </div>
          ))}
          <div className="my-1 h-px bg-line/60" />
          <p className="m-0 text-xs leading-relaxed text-ink-tertiary">
            {t('profile.reqNote')}
          </p>
        </div>
      </div>
    </div>
  );
}
