import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App, Button, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { Hangtag } from '../../../shared/components/Hangtag';
import { Icons } from '../../../shared/icons';
import { profileApi } from '../api/profileApi';
import { deviceInfo, isPrivateIp, sessionTime } from '../lib';

const ROW_GRID =
  'grid grid-cols-[1fr_190px_215px] items-center gap-4 border-l-2 px-5 max-md:grid-cols-[1fr_150px]';

export function SessionsCard() {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: profileApi.sessions,
    refetchInterval: 30_000,
  });

  const revokeOne = useMutation({
    mutationFn: profileApi.revokeSession,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success(t('profile.revoked'));
    },
    onError: () => message.error(t('users.errBody')),
  });

  const revokeOthers = useMutation({
    mutationFn: profileApi.revokeOthers,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions'] });
      message.success(t('profile.revokedOthers'));
    },
    onError: () => message.error(t('users.errBody')),
  });

  const rows = sessions.data ?? [];
  const hasOthers = rows.some((s) => !s.current);

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-line/60 px-5 py-3.5">
        <Icons.devices size={17} className="text-olive-600" />
        <span className="flex-1 text-sm font-medium">
          {t('profile.sessions')}
        </span>
        <button
          type="button"
          disabled={!hasOthers || revokeOthers.isPending}
          onClick={() => revokeOthers.mutate()}
          className="rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-danger u-focus transition-colors enabled:hover:bg-danger-fill disabled:opacity-40"
        >
          {t('profile.revokeOthers')}
        </button>
      </div>

      {sessions.isPending ? (
        <div className="flex justify-center px-5 py-10">
          <Spin />
        </div>
      ) : sessions.isError ? (
        <div className="flex flex-col items-center gap-3 px-5 py-8 text-center">
          <p className="m-0 text-[13px] text-ink-secondary">
            {t('users.errBody')}
          </p>
          <Button
            icon={<Icons.retry size={15} />}
            onClick={() => void sessions.refetch()}
          >
            {t('users.retry')}
          </Button>
        </div>
      ) : (
        <div className="py-3.5">
          <div
            className={`${ROW_GRID} border-b border-l-transparent border-line/40 pb-2 text-[11px] font-medium tracking-[0.08em] text-ink-tertiary uppercase`}
          >
            <span>{t('profile.thDevice')}</span>
            <span className="max-md:hidden">{t('profile.thLocation')}</span>
            <span className="text-right">{t('profile.thActivity')}</span>
          </div>
          {rows.map((s) => {
            const fallback = deviceInfo(s.userAgent);
            const label =
              [s.browser, s.os].filter(Boolean).join(' · ') || fallback.label;
            const Icon =
              s.deviceType === 'mobile' ? Icons.mobile : fallback.Icon;
            const place =
              s.location ??
              (isPrivateIp(s.ip) ? t('profile.localNetwork') : null);
            return (
              <div
                key={s.id}
                className={`${ROW_GRID} border-b border-line/40 py-3 ${
                  s.current
                    ? 'border-l-olive-500 bg-olive-50'
                    : 'border-l-transparent'
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon
                    size={19}
                    className={
                      s.current ? 'text-olive-600' : 'text-ink-secondary'
                    }
                  />
                  <span
                    className={`truncate text-[13px] ${s.current ? 'font-medium' : ''}`}
                  >
                    {label ?? t('profile.unknownDevice')}
                  </span>
                  {s.current && <Hangtag>{t('profile.current')}</Hangtag>}
                </div>
                <span className="truncate text-[12.5px] text-ink-secondary max-md:hidden">
                  {place ?? '—'}
                </span>
                <div className="flex items-center justify-end gap-2.5">
                  <span className="text-[12.5px] whitespace-nowrap text-ink-tertiary tabular-nums">
                    {sessionTime(
                      s.createdAt,
                      i18n.language,
                      t('profile.today'),
                      t('profile.yesterday'),
                    )}
                  </span>
                  {!s.current && (
                    <button
                      type="button"
                      disabled={revokeOne.isPending}
                      onClick={() => revokeOne.mutate(s.id)}
                      className="rounded-lg px-2 py-1 text-xs font-medium text-danger u-focus transition-colors enabled:hover:bg-danger-fill disabled:opacity-40"
                    >
                      {t('profile.revoke')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <p className="m-0 px-5 pt-3 text-xs text-ink-tertiary">
            {t('profile.sessionNote')}
          </p>
        </div>
      )}
    </div>
  );
}
