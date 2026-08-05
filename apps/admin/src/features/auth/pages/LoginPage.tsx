import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Alert, Button, Form, Input } from 'antd';
import { AxiosError } from 'axios';
import { Req } from '../../../shared/components/Req';
import { Icons } from '../../../shared/icons';
import { safeInternalPath } from '../../../shared/safePath';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import logo from '../../../assets/logos/limone-logo.svg';
import { authApi } from '../api/authApi';
import { loginSchema, type LoginInput } from '../schemas/login.schema';
import { useAuthStore } from '../store/authStore';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);

  const { control, handleSubmit } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setSession(session);
      const from = (location.state as { from?: { pathname: string } } | null)
        ?.from?.pathname;
      void navigate(safeInternalPath(from), { replace: true });
    },
  });

  const errorKey =
    login.error instanceof AxiosError && login.error.response?.status === 401
      ? 'login.invalidCredentials'
      : login.error
        ? 'login.serverError'
        : null;

  const reason = new URLSearchParams(location.search).get('reason');
  const endedKey = errorKey
    ? null
    : reason === 'idle'
      ? 'session.endedIdle'
      : reason === 'expired'
        ? 'login.sessionExpired'
        : null;

  return (
    <div className="relative w-100 max-w-full rounded-xl border border-line bg-surface p-9 pb-8 shadow-lg">
      <div className="mb-7 text-center">
        <img
          src={logo}
          alt="LIMONÉ APPAREL"
          draggable={false}
          className="mx-auto w-56 select-none"
        />
      </div>

      {errorKey && (
        <Alert type="error" showIcon title={t(errorKey)} className="mb-4" />
      )}
      {endedKey && (
        <Alert type="warning" showIcon title={t(endedKey)} className="mb-4" />
      )}

      <Form
        layout="vertical"
        requiredMark={false}
        onSubmitCapture={(e) => {
          void handleSubmit((values) => login.mutate(values))(e);
        }}
      >
        <Controller
          control={control}
          name="username"
          render={({ field, fieldState }) => (
            <Form.Item
              label={
                <>
                  {t('login.username')}
                  <Req />
                </>
              }
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message && t(fieldState.error.message)}
            >
              <Input
                {...field}
                prefix={<Icons.user size={16} className="text-ink-tertiary" />}
                placeholder={t('login.placeholderUsername')}
                autoComplete="username"
                aria-required
                autoFocus
              />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <Form.Item
              className="[&_label]:w-full [&_label]:after:hidden"
              label={
                <div className="flex w-full items-baseline justify-between gap-3">
                  <div>
                    <span>{t('login.password')}</span>
                    <Req />
                  </div>
                  <div>
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      title={t('shell.soonBody')}
                      className="text-xs justify-end font-medium whitespace-nowrap text-olive-600 hover:text-olive-700 hover:underline"
                    >
                      {t('login.forgot')}
                    </a>
                  </div>
                </div>
              }
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message && t(fieldState.error.message)}
            >
              <Input.Password
                {...field}
                prefix={<Icons.lock size={15} className="text-ink-tertiary" />}
                placeholder="••••••••"
                autoComplete="current-password"
                aria-required
              />
            </Form.Item>
          )}
        />

        <Button
          type="primary"
          htmlType="submit"
          block
          className="mt-2 h-10"
          loading={login.isPending}
        >
          {login.isPending ? t('login.signingIn') : t('login.submit')}
        </Button>
      </Form>

      <div className="mt-6 text-center text-xs text-ink-tertiary">
        {t('login.foot')}
      </div>
    </div>
  );
}
