export function sanitizePhone(raw: string): string {
  const plusAt = raw.indexOf('+');
  const firstDigitAt = raw.search(/\d/);
  const plus =
    plusAt !== -1 && (firstDigitAt === -1 || plusAt < firstDigitAt) ? '+' : '';
  return plus + raw.replace(/\D/g, '').slice(0, 15);
}

export const PHONE_PATTERN = /^\+?\d{7,15}$/;

export const PHONE_PLACEHOLDER = '+998901234567';
