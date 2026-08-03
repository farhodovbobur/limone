import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { Icons } from '../icons';

export function AccessDenied() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="flex h-full min-h-105 flex-col items-center justify-center gap-2 text-center">
      <span className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-cream-200 bg-cream-100 text-olive-600">
        <Icons.lock size={30} />
      </span>
      <h3 className="m-0 text-[17px] font-medium">{t('shell.deniedTitle')}</h3>
      <p className="m-0 max-w-90 text-[13px] text-ink-secondary">
        {t('shell.deniedBody')}
      </p>
      <Button
        type="primary"
        className="mt-3"
        onClick={() => void navigate('/')}
      >
        {t('shell.deniedCta')}
      </Button>
    </div>
  );
}
