import { Button } from 'antd';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icons } from '../../../shared/icons';

export function IdleWarning({
  until,
  onStay,
  onSignOut,
}: {
  until: number;
  onStay: () => void;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = Math.max(0, Math.ceil((until - now) / 1000));
  const clock = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center pl-62">
      <div
        role="status"
        aria-live="polite"
        className="page-enter pointer-events-auto flex w-[min(30rem,calc(100vw-17.5rem))] items-start gap-3 rounded-xl border border-warning/30 bg-warning-fill px-4 py-3.5 shadow-lg"
      >
        <Icons.warning size={19} weight="fill" className="mt-px text-warning" />

        <div className="flex-1">
          <p className="m-0 text-[13px] font-medium text-ink">
            {t('session.idleTitle')}
          </p>
          <p className="mt-0.5 mb-0 text-[12.5px] text-ink-secondary">
            {t('session.idleBody')}{' '}
            <span className="font-medium text-ink tabular-nums">{clock}</span>
          </p>

          <div className="mt-2.5 flex items-center gap-2">
            <Button type="primary" size="small" onClick={onStay}>
              {t('session.stay')}
            </Button>
            <Button size="small" type="text" onClick={onSignOut}>
              {t('session.signOutNow')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
