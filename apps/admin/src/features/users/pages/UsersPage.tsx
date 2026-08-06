import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Input, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs } from '../../../layouts/Breadcrumbs';
import { useAuthStore } from '../../auth/store/authStore';
import { Avatar } from '../../../shared/components/Avatar';
import { Icons } from '../../../shared/icons';
import { Hangtag } from '../../../shared/components/Hangtag';
import { ASSIGNABLE_ROLES, usersApi, type User } from '../api/usersApi';
import { UserDrawer } from '../components/UserDrawer';

export function UsersPage() {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [drawer, setDrawer] = useState<
    { mode: 'create' } | { mode: 'edit'; user: User } | null
  >(null);

  const users = useQuery({ queryKey: ['users'], queryFn: usersApi.list });

  const toggleActive = useMutation({
    mutationFn: (u: User) => usersApi.update(u.id, { isActive: !u.isActive }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] });
      message.success(
        t(updated.isActive ? 'users.activated' : 'users.deactivated', {
          name: `${updated.firstName} ${updated.lastName ?? ''}`.trim(),
        }),
      );
    },
    onError: () => message.error(t('users.errBody')),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (users.data ?? []).filter((u) => {
      const matchQ =
        !q ||
        `${u.firstName} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q);
      const matchR = roleFilter === 'all' || u.role === roleFilter;
      return matchQ && matchR;
    });
  }, [users.data, query, roleFilter]);

  const columns: ColumnsType<User> = [
    {
      title: t('users.th.name'),
      key: 'name',
      sorter: (a, b) =>
        `${a.firstName} ${a.lastName ?? ''}`.localeCompare(
          `${b.firstName} ${b.lastName ?? ''}`,
        ),
      render: (_, u) => (
        <div className="flex items-center gap-3">
          <Avatar first={u.firstName} last={u.lastName} />
          <span className="flex flex-col leading-tight">
            <span className="font-medium whitespace-nowrap">
              {u.firstName} {u.lastName}
            </span>
            <span className="text-xs text-ink-tertiary">@{u.username}</span>
          </span>
        </div>
      ),
    },
    {
      title: t('users.th.username'),
      dataIndex: 'username',
      render: (v: string) => (
        <span className="text-ink-secondary tabular-nums">{v}</span>
      ),
    },
    {
      title: t('users.th.role'),
      dataIndex: 'role',
      render: (role: string) => <Hangtag>{t(`roles.${role}`)}</Hangtag>,
    },
    {
      title: t('users.th.phone'),
      dataIndex: 'phone',
      render: (v: string | null) => (
        <span className="text-ink-secondary tabular-nums">{v ?? '—'}</span>
      ),
    },
    {
      title: t('users.th.status'),
      dataIndex: 'isActive',
      render: (active: boolean) =>
        active ? (
          <Hangtag variant="success">{t('users.active')}</Hangtag>
        ) : (
          <Hangtag variant="neutral">{t('users.inactive')}</Hangtag>
        ),
    },
    {
      title: <span className="block text-right">{t('users.th.actions')}</span>,
      key: 'actions',
      render: (_, u) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title={t('users.edit')}
            onClick={() => setDrawer({ mode: 'edit', user: u })}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary u-focus transition-colors hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200"
          >
            <Icons.edit size={17} />
          </button>
          <button
            type="button"
            disabled={u.id === currentUserId}
            title={
              u.id === currentUserId
                ? t('users.cannotDeactivateSelf')
                : u.isActive
                  ? t('users.deactivate')
                  : t('users.activate')
            }
            onClick={() => toggleActive.mutate(u)}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg u-focus transition-colors enabled:hover:bg-olive-100 enabled:active:bg-olive-200 disabled:cursor-not-allowed disabled:opacity-35 ${
              u.isActive
                ? 'text-ink-secondary enabled:hover:text-olive-800'
                : 'text-success'
            }`}
          >
            <Icons.power size={17} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumbs className="mb-3" />
      <div className="mb-5 flex items-end justify-between gap-5">
        <div>
          <h2 className="m-0 text-lg font-medium">{t('users.title')}</h2>
          <p className="mt-1.5 mb-0 max-w-130 text-sm text-ink-secondary">
            {t('users.lead')}
          </p>
        </div>
        <Button
          type="primary"
          icon={<Icons.plus size={17} />}
          onClick={() => setDrawer({ mode: 'create' })}
        >
          {t('users.add')}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Input
            className="max-w-85 min-w-50 flex-1"
            prefix={<Icons.search size={16} className="text-ink-tertiary" />}
            placeholder={t('users.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            allowClear
          />
          <Select
            className="w-47.5"
            value={roleFilter}
            onChange={setRoleFilter}
            options={[
              { value: 'all', label: t('users.allRoles') },
              ...ASSIGNABLE_ROLES.map((r) => ({
                value: r,
                label: t(`roles.${r}`),
              })),
            ]}
          />
        </div>

        {users.isError ? (
          <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-16 text-center">
            <span className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-danger-fill text-danger">
              <Icons.warning size={26} />
            </span>
            <h3 className="m-0 text-base font-medium">{t('users.errTitle')}</h3>
            <p className="m-0 max-w-85 text-[13px] text-ink-secondary">
              {t('users.errBody')}
            </p>
            <Button
              type="primary"
              className="mt-3.5"
              icon={<Icons.retry size={15} />}
              onClick={() => void users.refetch()}
            >
              {t('users.retry')}
            </Button>
          </div>
        ) : (
          <Table<User>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            loading={users.isPending}
            locale={{
              emptyText: (
                <div className="flex flex-col items-center justify-center gap-1.5 px-6 py-14 text-center">
                  <span className="mb-2.5 flex h-14 w-14 items-center justify-center rounded-full bg-olive-50 text-olive-600">
                    <Icons.inbox size={26} />
                  </span>
                  <h3 className="m-0 text-base font-medium text-ink">
                    {t('users.emptyTitle')}
                  </h3>
                  <p className="m-0 max-w-85 text-[13px] text-ink-secondary">
                    {t('users.emptyBody')}
                  </p>
                  {(query || roleFilter !== 'all') && (
                    <Button
                      className="mt-3.5"
                      onClick={() => {
                        setQuery('');
                        setRoleFilter('all');
                      }}
                    >
                      {t('users.clearFilters')}
                    </Button>
                  )}
                </div>
              ),
            }}
            pagination={{
              pageSize: 8,
              hideOnSinglePage: false,
              showSizeChanger: false,
              showTotal: (total, range) =>
                t('users.showing', { from: range[0], to: range[1], total }),
            }}
          />
        )}
      </div>

      {drawer && (
        <UserDrawer
          mode={drawer.mode}
          user={drawer.mode === 'edit' ? drawer.user : undefined}
          existingUsernames={(users.data ?? [])
            .filter((u) => !(drawer.mode === 'edit' && u.id === drawer.user.id))
            .map((u) => u.username.toLowerCase())}
          onClose={() => setDrawer(null)}
        />
      )}
    </div>
  );
}
