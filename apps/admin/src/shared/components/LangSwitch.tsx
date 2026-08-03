import { useTranslation } from 'react-i18next';
import { Icons } from '../icons';

const LANGS = ['uz', 'ru', 'en'] as const;

export function LangSwitch({ withIcon = false }: { withIcon?: boolean }) {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? 'uz';
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex h-8 items-center rounded-lg border border-line bg-surface p-1"
    >
      {withIcon && (
        <Icons.globe size={15} className="mx-1.5 text-ink-tertiary" />
      )}
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={current === l}
          onClick={() => void i18n.changeLanguage(l)}
          className={`h-6 rounded-md px-2.5 text-xs font-medium u-focus transition-colors ${
            current === l
              ? 'bg-olive-600 text-white'
              : 'text-ink-secondary hover:bg-olive-100 hover:text-olive-800 active:bg-olive-200'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
