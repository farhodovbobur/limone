import { describe, expect, it } from 'vitest';
import { PASSWORD_MIN, passwordRules, passwordStrength } from './password';

const met = (pw: string) =>
  passwordRules(pw)
    .filter((r) => r.met)
    .map((r) => r.key);

describe('passwordRules', () => {
  it('always returns all three rules so the list never changes shape', () => {
    expect(passwordRules('').map((r) => r.key)).toEqual([
      'req8',
      'reqMix',
      'reqSpecial',
    ]);
    expect(passwordRules('').every((r) => !r.met)).toBe(true);
  });

  it('marks the length rule at exactly eight characters', () => {
    expect(met('1234567')).not.toContain('req8');
    expect(met('12345678')).toContain('req8');
  });

  it('needs both a letter and a digit for the mix rule', () => {
    expect(met('abcdefghij')).not.toContain('reqMix');
    expect(met('1234567890')).not.toContain('reqMix');
    expect(met('abcdefg1')).toContain('reqMix');
  });

  it('counts anything outside a–z and 0–9 as special', () => {
    expect(met('abcdefg1')).not.toContain('reqSpecial');
    expect(met('abcdefg1!')).toContain('reqSpecial');
    expect(met('abcdefg1 ')).toContain('reqSpecial');
  });
});

describe('passwordStrength', () => {
  it('scores an empty field zero, not one', () => {
    expect(passwordStrength('')).toBe(0);
  });

  it('rates a bare eight characters weak — and weak is still saveable', () => {
    // This is the contract the user asked for: the meter may say "weak" while
    // the schema (min-8, matching the API) still lets the form submit.
    expect(passwordStrength('abcdefgh')).toBe(1);
    expect(met('abcdefgh')).toContain('req8');
  });

  it('climbs as rules are satisfied', () => {
    expect(passwordStrength('abcdefg1')).toBe(2); // 8 chars + mix
    expect(passwordStrength('abcdefghijk1')).toBe(3); // + 12 chars
    expect(passwordStrength('abcdefghijk1!')).toBe(4); // + special
  });

  it('rewards a long passphrase over a short cryptic one', () => {
    // Length is what actually resists guessing, so this ordering is deliberate.
    expect(passwordStrength('correcthorsebatterystaple')).toBeGreaterThan(
      passwordStrength('a1!bc'),
    );
  });

  it('still calls a password at the accepted minimum weak', () => {
    // The gap is on purpose: PASSWORD_MIN (6) is what the form accepts, the
    // checklist asks for 8. A saveable password may honestly read "weak".
    const atMinimum = 'a1!'.padEnd(PASSWORD_MIN, 'x');
    expect(atMinimum).toHaveLength(PASSWORD_MIN);
    expect(passwordStrength(atMinimum)).toBe(1);
  });

  it('keeps anything below the recommended length at the weakest reading', () => {
    // The bug this locks out: mix and special used to score independently of
    // length, so three characters could read 2 of 4.
    for (const short of ['a', 'a1', 'a1!', 'Ab1!', 'Ab1!cd']) {
      expect(passwordStrength(short)).toBe(1);
    }
  });

  it('never exceeds the four bars the meter draws', () => {
    expect(passwordStrength('A'.repeat(100) + '1!')).toBeLessThanOrEqual(4);
  });
});
