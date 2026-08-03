import { Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';
import { LangSwitch } from '../shared/components/LangSwitch';
import { Icons } from '../shared/icons';

export function Topbar() {
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 right-0 left-62 z-20 flex h-16 items-center justify-end border-b border-cream-200 bg-cream-100 px-7 shadow-topbar">
      <div className="flex items-center gap-3.5">
        <LangSwitch withIcon />

        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          popupRender={() => (
            <div className="w-65 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
              <div className="px-2.5 pt-2 pb-1 text-[13px] font-medium">
                {t('shell.notif')}
              </div>
              <div className="mx-1 my-1 h-px bg-line" />
              <div className="px-2.5 py-3 text-xs text-ink-tertiary">
                {t('shell.soonBody')}
              </div>
            </div>
          )}
        >
          <button
            type="button"
            aria-label={t('shell.notif')}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-secondary u-focus transition-colors hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200"
          >
            <Icons.bell size={19} />
          </button>
        </Dropdown>
      </div>
    </header>
  );
}
