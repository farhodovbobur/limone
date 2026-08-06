export const PASSWORD_MIN = 6;

const RECOMMENDED_LENGTH = 6;

const hasRecommendedLength = (pw: string) => pw.length >= RECOMMENDED_LENGTH;
const hasLetterAndDigit = (pw: string) => /[a-zA-Z]/.test(pw) && /\d/.test(pw);
const hasSpecial = (pw: string) => /[^a-zA-Z0-9]/.test(pw);
const isLong = (pw: string) => pw.length >= 12;

/** i18n key under `password.*`, and whether the password satisfies it. */
export interface PasswordRule {
  key: 'req6' | 'reqMix' | 'reqSpecial';
  met: boolean;
}

export function passwordRules(pw: string): PasswordRule[] {
  return [
    { key: 'req6', met: hasRecommendedLength(pw) },
    { key: 'reqMix', met: hasLetterAndDigit(pw) },
    { key: 'reqSpecial', met: hasSpecial(pw) },
  ];
}

export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  if (!hasRecommendedLength(pw)) return 1;
  return (
    1 +
    [hasLetterAndDigit, isLong, hasSpecial].filter((test) => test(pw)).length
  );
}
