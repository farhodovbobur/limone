import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Input } from 'antd';
import { AxiosError } from 'axios';
import { useState, type ChangeEvent } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../auth/store/authStore';
import { Hangtag } from '../../../shared/components/Hangtag';
import { Req } from '../../../shared/components/Req';
import { Icons } from '../../../shared/icons';
import { sanitizePhone } from '../../../shared/phone';
import { profileApi, type ProfileUser } from '../api/profileApi';
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from '../schemas/update-profile.schema';

export function PersonalInfoCard({ user }: { user: ProfileUser }) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const setUser = useAuthStore((s) => s.setUser);
  const [editing, setEditing] = useState(false);

  const { control, handleSubmit, reset } = useForm<UpdateProfileFormValues>({
    resolver: zodResolver(updateProfileSchema),
    values: {
      firstName: user.firstName,
      lastName: user.lastName ?? '',
      phone: user.phone ?? '',
      email: user.email ?? '',
    },
  });

  const save = useMutation({
    mutationFn: (v: UpdateProfileFormValues) =>
      profileApi.update({
        firstName: v.firstName,
        lastName: v.lastName || null,
        phone: v.phone || null,
        email: v.email || null,
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(['profile'], saved);
      setUser({
        id: saved.id,
        username: saved.username,
        firstName: saved.firstName,
        lastName: saved.lastName,
        role: saved.role,
      });
      message.success(t('profile.saved'));
      setEditing(false);
    },
    onError: (err) => {
      const conflict =
        err instanceof AxiosError && err.response?.status === 409;
      message.error(t(conflict ? 'drawer.conflict' : 'users.errBody'));
    },
  });

  const cancel = () => {
    reset();
    setEditing(false);
  };

  const rows = [
    { label: t('drawer.firstName'), value: user.firstName },
    { label: t('drawer.lastName'), value: user.lastName },
    { label: t('drawer.phone'), value: user.phone },
    { label: t('drawer.email'), value: user.email },
  ];

  return (
    // Same grid as PasswordCard, so both tabs' cards share one width.
    <div className="grid items-start gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-line/60 px-5 py-3.5">
          <Icons.user size={17} className="text-olive-600" />
          <span className="flex-1 text-sm font-medium">
            {t('profile.tabInfo')}
          </span>
          {editing ? (
            <Hangtag>{t('profile.editing')}</Hangtag>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-ink-secondary u-focus transition-colors hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200"
            >
              <Icons.edit size={14} />
              {t('users.edit')}
            </button>
          )}
        </div>

        {!editing ? (
          <div className="px-5 pt-1 pb-3">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between gap-4 border-b border-line/40 py-2.5"
              >
                <span className="text-[13px] text-ink-secondary">
                  {r.label}
                </span>
                <span className="text-[13px] font-medium">
                  {r.value || <span className="text-ink-tertiary">—</span>}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-[13px] text-ink-secondary">
                {t('login.username')}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-[13px] font-medium">
                  @{user.username}
                </span>
                <span className="text-[11.5px] text-ink-tertiary">
                  {t('profile.immutable')}
                </span>
              </span>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-3 px-5 py-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit((v) => save.mutate(v))();
            }}
          >
            {(
              [
                { name: 'firstName', label: t('drawer.firstName'), req: true },
                { name: 'lastName', label: t('drawer.lastName'), req: false },
                { name: 'phone', label: t('drawer.phone'), req: false },
                { name: 'email', label: t('drawer.email'), req: false },
              ] as const
            ).map((f) => (
              <Controller
                key={f.name}
                control={control}
                name={f.name}
                render={({ field, fieldState }) => (
                  <div className="flex items-start gap-4">
                    <label
                      htmlFor={`profile-${f.name}`}
                      className="w-24 flex-none pt-2 text-[13px] text-ink-secondary"
                    >
                      {f.label}
                      {f.req && <Req />}
                    </label>
                    <div className="flex flex-1 flex-col gap-1">
                      <Input
                        {...field}
                        id={`profile-${f.name}`}
                        aria-required={f.req || undefined}
                        status={fieldState.error ? 'error' : undefined}
                        {...(f.name === 'phone' && {
                          inputMode: 'tel' as const,
                          onChange: (e: ChangeEvent<HTMLInputElement>) =>
                            field.onChange(sanitizePhone(e.target.value)),
                        })}
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

            <div className="flex items-start gap-4">
              <span className="w-24 flex-none pt-2 text-[13px] text-ink-secondary">
                {t('login.username')}
              </span>
              <div className="flex flex-1 flex-col gap-1.5">
                <Input
                  value={`@${user.username}`}
                  disabled
                  suffix={
                    <Icons.lock size={14} className="text-ink-tertiary" />
                  }
                />
                <span className="text-[11.5px] text-ink-tertiary">
                  {t('profile.immutableHint')}
                </span>
              </div>
            </div>

            <div className="mt-1 flex justify-end gap-2 border-t border-line/60 pt-3.5">
              <Button onClick={cancel}>{t('drawer.cancel')}</Button>
              <Button type="primary" htmlType="submit" loading={save.isPending}>
                {t('drawer.save')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
