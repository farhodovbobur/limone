import { describe, expect, it } from 'vitest';
import { PHONE_PATTERN, sanitizePhone } from './phone';

describe('sanitizePhone', () => {
  it('drops letters', () => {
    expect(sanitizePhone('abc998xyz90')).toBe('99890');
  });

  it('drops separators typed or pasted around the digits', () => {
    expect(sanitizePhone('+998 (90) 111-22-33')).toBe('+998901112233');
  });

  it('keeps a leading plus only', () => {
    expect(sanitizePhone('+998+90')).toBe('+99890');
    expect(sanitizePhone('998+90')).toBe('99890');
  });

  it('ignores whitespace before the plus', () => {
    expect(sanitizePhone('  +99890')).toBe('+99890');
  });

  it('keeps the plus of a pasted string that has text in front of it', () => {
    expect(sanitizePhone('Tel: +998901112233')).toBe('+998901112233');
  });

  it('drops a plus that comes after a digit', () => {
    expect(sanitizePhone('998 +90')).toBe('99890');
  });

  it('caps at the 15-digit E.164 maximum', () => {
    expect(sanitizePhone('+1234567890123456789')).toBe('+123456789012345');
  });

  it('is idempotent — re-sanitizing changes nothing', () => {
    const once = sanitizePhone('+998 (90) 111-22-33');
    expect(sanitizePhone(once)).toBe(once);
  });

  it('collapses formatting variants to one canonical value (unique index)', () => {
    const variants = [
      '+998 90 111 22 33',
      '+998-90-111-22-33',
      '+998(90)1112233',
      '+998901112233',
    ];
    expect(new Set(variants.map(sanitizePhone)).size).toBe(1);
  });
});

describe('PHONE_PATTERN', () => {
  it('accepts what sanitizePhone produces for real numbers', () => {
    expect(PHONE_PATTERN.test(sanitizePhone('+998 90 111 22 33'))).toBe(true);
    expect(PHONE_PATTERN.test(sanitizePhone('901112233'))).toBe(true);
  });

  it('rejects too-short input', () => {
    expect(PHONE_PATTERN.test('+99890')).toBe(false);
  });

  it('rejects a bare plus', () => {
    expect(PHONE_PATTERN.test('+')).toBe(false);
  });

  // The rule is E.164, not a local one: 7 is the shortest international
  // number that exists (4-digit subscriber + 3-digit country code) and 15 is
  // the ITU maximum. Every country's own spacing style is stripped first.
  it.each([
    ['Uzbekistan', '+998 90 111 22 33'],
    ['USA', '+1 (415) 555-2671'],
    ['UK', '+44 20 7183 8750'],
    ['Germany', '+49 30 901820'],
    ['France', '+33 1 42 68 53 00'],
    ['Russia', '+7 495 123-45-67'],
    ['China', '+86 138 0013 8000'],
    ['India', '+91 98765 43210'],
    ['Japan', '+81 3-1234-5678'],
    ['Brazil', '+55 11 91234-5678'],
    ['Nigeria', '+234 802 123 4567'],
    ['Turkey', '+90 532 123 45 67'],
    ['Kazakhstan', '+7 701 123 4567'],
    ['UAE', '+971 50 123 4567'],
    ['Australia', '+61 4 1234 5678'],
    ['Iceland', '+354 590 6000'],
    ['Hong Kong', '+852 2846 6888'],
    ['Solomon Islands', '+677 21234'],
    ['Saint Helena (shortest)', '+290 2345'],
    ['Niue', '+683 4002'],
    ['Tokelau', '+690 3120'],
    ['E.164 maximum (15 digits)', '+49 1234 567890123'],
  ])('accepts a %s number', (_country, written) => {
    expect(PHONE_PATTERN.test(sanitizePhone(written))).toBe(true);
  });

  it('rejects one digit past the E.164 maximum', () => {
    expect(PHONE_PATTERN.test('+4912345678901234')).toBe(false);
  });
});
