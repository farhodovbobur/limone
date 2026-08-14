import { useMutation } from '@tanstack/react-query';
import { Dropdown } from 'antd';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useDrawerNavigate } from './useNavDrawer';
import { authApi } from '../features/auth/api/authApi';
import { useAuthStore } from '../features/auth/store/authStore';
import { Avatar } from '../shared/components/Avatar';
import { Icons } from '../shared/icons';

export function UserMenu() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const go = useDrawerNavigate();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);

  const logout = useMutation({
    mutationFn: () => {
      const { refreshToken } = useAuthStore.getState();
      return refreshToken ? authApi.logout(refreshToken) : Promise.resolve();
    },
    onSettled: () => {
      clearSession();
      void navigate('/login', { replace: true });
    },
  });

  const act = (run: () => void) => () => {
    setInstant(true);
    setOpen(false);
    run();
  };

  const openChange = (next: boolean) => {
    if (next) setInstant(false);
    setOpen(next);
  };

  const popup = () => (
    <div className="w-54 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        <Avatar
          first={user?.firstName ?? '?'}
          last={user?.lastName}
          size="lg"
        />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-[13px] font-medium">
            {user?.firstName} {user?.lastName}
          </div>
          <div className="text-[11px] text-ink-tertiary">@{user?.username}</div>
        </div>
      </div>
      <div className="mx-1 my-1 h-px bg-line" />
      <MenuItem
        testId="profile"
        icon={<Icons.user size={17} />}
        label={t('shell.profile')}
        onClick={act(() => go('/profile'))}
      />
      <MenuItem
        testId="password"
        icon={<Icons.key size={17} />}
        label={t('cp.title')}
        onClick={act(() => go('/profile?tab=password'))}
      />
      <div className="mx-1 my-1 h-px bg-line" />
      <MenuItem
        testId="logout"
        icon={<Icons.logout size={17} />}
        label={t('shell.logout')}
        danger
        onClick={act(() => logout.mutate())}
      />
    </div>
  );

  return (
    <Dropdown
      trigger={['click']}
      placement="topLeft"
      popupRender={popup}
      open={open}
      onOpenChange={openChange}
      transitionName={instant ? '' : undefined}
    >
      <button
        data-menu-trigger
        type="button"
        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left u-focus transition-colors hover:bg-olive-100 active:bg-olive-200"
      >
        <Avatar first={user?.firstName ?? '?'} last={user?.lastName} />
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="truncate text-[13px] font-medium">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-[11px] text-ink-tertiary">
            {t(`roles.${user?.role ?? 'worker'}`)}
          </span>
        </span>
        <Icons.caretUpDown size={15} className="text-ink-tertiary" />
      </button>
    </Dropdown>
  );
}

function MenuItem({
  icon,
  label,
  danger = false,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  danger?: boolean;
  onClick?: () => void;
  testId?: string;
}) {
  return (
    <button
      data-menu={testId}
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] u-focus transition-colors ${
        danger
          ? 'text-danger hover:bg-danger-fill active:bg-danger-fill/70'
          : 'text-ink hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
