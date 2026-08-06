import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App, Button, Drawer, Form, Input, Select, Switch } from 'antd';
import { AxiosError } from 'axios';
import type { ChangeEvent } from 'react';
import { Controller, useForm, useWatch, type Control } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../shared/components/Avatar';
import {
  PasswordMeter,
  PasswordRules,
} from '../../../shared/components/PasswordStrength';
import { Req } from '../../../shared/components/Req';
import { sanitizePhone } from '../../../shared/phone';
import { ASSIGNABLE_ROLES, usersApi, type User } from '../api/usersApi';
import {
  buildUserFormSchema,
  type UserFormValues,
} from '../schemas/user-form.schema';

export function UserDrawer({
  mode,
  user,
  existingUsernames,
  onClose,
}: {
  mode: 'create' | 'edit';
  user?: User;
  existingUsernames: string[];
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const isEdit = mode === 'edit';

  const schema = buildUserFormSchema(existingUsernames, isEdit);

  const { control, handleSubmit } = useForm<UserFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      username: user?.username ?? '',
      role: user?.role ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
      password: '',
      isActive: user?.isActive ?? true,
    },
  });

  const password = useWatch({ control, name: 'password' }) ?? '';

  const save = useMutation({
    mutationFn: (v: UserFormValues) => {
      if (isEdit && user) {
        return usersApi.update(user.id, {
          firstName: v.firstName,
          lastName: v.lastName,
          role: v.role,
          phone: v.phone || null,
          email: v.email || null,
          isActive: v.isActive,
        });
      }
      return usersApi.create({
        username: v.username,
        password: v.password,
        firstName: v.firstName,
        lastName: v.lastName,
        role: v.role,
        phone: v.phone || undefined,
        email: v.email || undefined,
      });
    },
    onSuccess: (saved) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      const name = `${saved.firstName} ${saved.lastName ?? ''}`.trim();
      message.success(t(isEdit ? 'users.saved' : 'users.created', { name }));
      onClose();
    },
    onError: (err) => {
      const conflict =
        err instanceof AxiosError && err.response?.status === 409;
      message.error(t(conflict ? 'drawer.conflict' : 'users.errBody'));
    },
  });

  return (
    <Drawer
      open
      onClose={onClose}
      size={480}
      title={
        <div>
          <div className="text-lg font-medium">
            {t(isEdit ? 'drawer.editTitle' : 'drawer.addTitle')}
          </div>
          <div className="mt-0.5 text-[13px] font-normal text-ink-secondary">
            {t(isEdit ? 'drawer.editSub' : 'drawer.addSub')}
          </div>
        </div>
      }
      footer={
        <div className="flex justify-end gap-2.5">
          <Button onClick={onClose}>{t('drawer.cancel')}</Button>
          <Button
            type="primary"
            loading={save.isPending}
            onClick={() => void handleSubmit((v) => save.mutate(v))()}
          >
            {t(isEdit ? 'drawer.save' : 'drawer.create')}
          </Button>
        </div>
      }
    >
      <Form
        layout="vertical"
        requiredMark={false}
        onSubmitCapture={(e) => {
          e.preventDefault();
          void handleSubmit((v) => save.mutate(v))();
        }}
      >
        {isEdit && user && (
          <div className="mb-4 flex items-center gap-3">
            <Avatar first={user.firstName} last={user.lastName} size="lg" />
            <div className="leading-snug">
              <div className="font-medium">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-ink-tertiary">@{user.username}</div>
            </div>
          </div>
        )}

        <div className="flex gap-3.5">
          <FieldText
            control={control}
            name="firstName"
            label={t('drawer.firstName')}
            required
          />
          <FieldText
            control={control}
            name="lastName"
            label={t('drawer.lastName')}
            required
          />
        </div>

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
                prefix={<span className="text-ink-tertiary">@</span>}
                disabled={isEdit}
                aria-required
                onChange={(e) =>
                  field.onChange(e.target.value.replace(/\s/g, ''))
                }
              />
            </Form.Item>
          )}
        />

        <Controller
          control={control}
          name="role"
          render={({ field, fieldState }) => (
            <Form.Item
              label={
                <>
                  {t('drawer.role')}
                  <Req />
                </>
              }
              validateStatus={fieldState.error ? 'error' : undefined}
              help={fieldState.error?.message && t(fieldState.error.message)}
            >
              <Select
                {...field}
                value={field.value || undefined}
                aria-required
                options={ASSIGNABLE_ROLES.map((r) => ({
                  value: r,
                  label: t(`roles.${r}`),
                }))}
              />
            </Form.Item>
          )}
        />

        <div className="flex gap-3.5">
          <FieldText control={control} name="phone" label={t('drawer.phone')} />
          <FieldText control={control} name="email" label={t('drawer.email')} />
        </div>

        {!isEdit && (
          <Controller
            control={control}
            name="password"
            render={({ field, fieldState }) => (
              <Form.Item
                label={
                  <>
                    {t('drawer.password')}
                    <Req />
                  </>
                }
                validateStatus={fieldState.error ? 'error' : undefined}
                // No static hint: the rule list below says "at least 8
                // characters" already, and repeating it here would be the only
                // thing shown while the field is untouched.
                help={fieldState.error?.message && t(fieldState.error.message)}
              >
                <Input.Password
                  {...field}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-required
                />
              </Form.Item>
            )}
          />
        )}

        {!isEdit && (
          <div className="-mt-2 flex flex-col gap-3">
            <PasswordMeter value={password} />
            <PasswordRules value={password} />
          </div>
        )}

        {isEdit && (
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <div className="mt-1 flex items-center justify-between gap-4 rounded-lg border border-line bg-surface-subtle px-3.5 py-3">
                <div>
                  <div className="text-[13px] font-medium">
                    {t('drawer.activeTitle')}
                  </div>
                  <div className="mt-0.5 text-xs text-ink-tertiary">
                    {t('drawer.activeSub')}
                  </div>
                </div>
                <Switch checked={field.value} onChange={field.onChange} />
              </div>
            )}
          />
        )}
      </Form>
    </Drawer>
  );
}

function FieldText({
  control,
  name,
  label,
  placeholder,
  required,
}: {
  control: Control<UserFormValues>;
  name: 'firstName' | 'lastName' | 'phone' | 'email';
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Form.Item
          className="flex-1"
          label={
            <>
              {label}
              {required && <Req />}
            </>
          }
          validateStatus={fieldState.error ? 'error' : undefined}
          help={fieldState.error?.message && t(fieldState.error.message)}
        >
          <Input
            {...field}
            placeholder={placeholder}
            aria-required={required || undefined}
            {...(name === 'phone' && {
              inputMode: 'tel' as const,
              onChange: (e: ChangeEvent<HTMLInputElement>) =>
                field.onChange(sanitizePhone(e.target.value)),
            })}
          />
        </Form.Item>
      )}
    />
  );
}
