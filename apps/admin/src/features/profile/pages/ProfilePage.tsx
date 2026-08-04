import { useQuery } from '@tanstack/react-query';
import { Button, Skeleton } from 'antd';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { Breadcrumbs } from '../../../layouts/Breadcrumbs';
import { Avatar } from '../../../shared/components/Avatar';
import { Hangtag } from '../../../shared/components/Hangtag';
import { Icons, type AppIcon } from '../../../shared/icons';
import { profileApi } from '../api/profileApi';
import { PasswordCard } from '../components/PasswordCard';
import { PersonalInfoCard } from '../components/PersonalInfoCard';
import { SessionsCard } from '../components/SessionsCard';
import { memberSince } from '../lib';

type TabKey = 'info' | 'password' | 'sessions';

const TABS: { key: TabKey; icon: AppIcon; labelKey: string }[] = [
  { key: 'info', icon: Icons.user, labelKey: 'profile.tabInfo' },
  { key: 'password', icon: Icons.key, labelKey: 'cp.title' },
  { key: 'sessions', icon: Icons.devices, labelKey: 'profile.sessions' },
];

export function ProfilePage() {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab');
  const tab: TabKey =
    rawTab === 'password' || rawTab === 'sessions' ? rawTab : 'info';

  const profile = useQuery({ queryKey: ['profile'], queryFn: profileApi.me });
  const user = profile.data;

  const setTab = (next: TabKey) =>
    setSearchParams(next === 'info' ? {} : { tab: next }, { replace: true });

  const joined = user ? memberSince(user.createdAt, i18n.language) : '';

  return (
    <div>
      <Breadcrumbs className="mb-3" />

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-6 py-5 shadow-sm">
        {user ? (
          <>
            <Avatar first={user.firstName} last={user.lastName} size="xl" />
            <div className="min-w-0">
              <h2 className="m-0 text-xl leading-tight font-medium">
                {user.firstName} {user.lastName}
              </h2>
              <p className="m-0 mt-1 text-[13px] text-ink-tertiary">
                @{user.username} · {t('profile.memberSince', { date: joined })}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Hangtag>{t(`roles.${user.role}`)}</Hangtag>
              <Hangtag variant="success">{t('staff.active')}</Hangtag>
            </div>
          </>
        ) : profile.isError ? (
          <div className="flex w-full flex-col items-center gap-3 py-2 text-center">
            <p className="m-0 text-[13px] text-ink-secondary">
              {t('staff.errBody')}
            </p>
            <Button
              icon={<Icons.retry size={15} />}
              onClick={() => void profile.refetch()}
            >
              {t('staff.retry')}
            </Button>
          </div>
        ) : (
          <Skeleton active avatar paragraph={{ rows: 1 }} title={false} />
        )}
      </div>

      <div
        role="tablist"
        aria-label={t('shell.profile')}
        className="mt-5.5 mb-5 flex items-stretch gap-1 border-b border-line"
      >
        {TABS.map(({ key, icon: Icon, labelKey }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`-mb-px inline-flex items-center gap-2 rounded-t-lg border-b-2 px-3.5 pt-2.5 pb-3 text-[13px] font-medium u-focus transition-colors ${
                active
                  ? 'border-olive-600 text-olive-800'
                  : 'border-transparent text-ink-secondary hover:bg-olive-100/60 hover:text-olive-800'
              }`}
            >
              <Icon size={16} weight={active ? 'fill' : 'regular'} />
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      {tab === 'info' && user && <PersonalInfoCard user={user} />}
      {tab === 'password' && <PasswordCard />}
      {tab === 'sessions' && <SessionsCard />}
    </div>
  );
}
