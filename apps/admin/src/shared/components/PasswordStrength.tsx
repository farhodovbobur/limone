import { useTranslation } from 'react-i18next';
import { Icons } from '../icons';
import { passwordRules, passwordStrength } from '../password';

const STRENGTH_COLORS = [
  '',
  'bg-danger',
  'bg-warning',
  'bg-success',
  'bg-success',
];

export function PasswordMeter({ value }: { value: string }) {
  const { t } = useTranslation();
  if (!value) return null;

  const score = passwordStrength(value);

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3, 4].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${
              i <= score ? STRENGTH_COLORS[score] : 'bg-line'
            }`}
          />
        ))}
      </div>
      <span className="text-[11.5px] text-ink-secondary">
        {t(`password.strength${Math.max(score, 1)}`)}
      </span>
    </div>
  );
}

export function PasswordRules({ value }: { value: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2.5">
      {passwordRules(value).map((rule) => (
        <div key={rule.key} className="flex items-center gap-2.5">
          {rule.met ? (
            <Icons.checkCircle
              size={16}
              weight="fill"
              className="text-success"
            />
          ) : (
            <Icons.circle size={16} className="text-ink-tertiary/50" />
          )}
          <span
            className={`text-[12.5px] ${rule.met ? 'text-ink-secondary' : 'text-ink-tertiary'}`}
          >
            {t(`password.${rule.key}`)}
          </span>
        </div>
      ))}
    </div>
  );
}
