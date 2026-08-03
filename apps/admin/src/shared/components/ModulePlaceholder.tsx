import { useTranslation } from 'react-i18next';
import type { ModuleKey } from '../access';
import { MODULE_ICONS } from '../icons';
import { Breadcrumbs } from '../../layouts/Breadcrumbs';

export function ModulePlaceholder({ navKey }: { navKey: ModuleKey }) {
  const { t } = useTranslation();
  const Icon = MODULE_ICONS[navKey];
  return (
    <div className="flex h-full min-h-105 flex-col">
      <Breadcrumbs className="mb-3" />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
        <span className="mb-3 inline-flex h-16 w-16 items-center justify-center rounded-[18px] border border-cream-200 bg-cream-100 text-olive-600">
          <Icon size={30} />
        </span>
        <h3 className="m-0 text-[17px] font-medium">{t(`nav.${navKey}`)}</h3>
        <p className="m-0 max-w-90 text-[13px] text-ink-secondary">
          {t('shell.soonBody')}
        </p>
      </div>
    </div>
  );
}
