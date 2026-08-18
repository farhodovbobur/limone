import {
  createExchangeRateSchema,
  updateExchangeRateSchema,
} from './dto/exchange-rate.dto';

const valid = { date: '2026-08-17', rate: 12650 };

/** The issue paths a failure touched — enough to prove *which* rule fired. */
const issues = (result: { success: boolean; error?: { issues: unknown[] } }) =>
  (result.error?.issues ?? []) as { code: string; path: (string | number)[] }[];

describe('createExchangeRateSchema', () => {
  it('accepts a plain date and rate', () => {
    expect(createExchangeRateSchema.safeParse(valid).success).toBe(true);
  });

  it('refuses a client-declared source', () => {
    // The whole point of the provenance column: a rate posted through the API
    // is MANUAL. If a client could claim CBU, the flag would lie.
    const result = createExchangeRateSchema.safeParse({
      ...valid,
      source: 'CBU',
    });

    expect(result.success).toBe(false);
    expect(issues(result)[0].code).toBe('unrecognized_keys');
  });

  it('refuses any other unknown field', () => {
    const result = createExchangeRateSchema.safeParse({ ...valid, note: 'x' });

    expect(result.success).toBe(false);
    expect(issues(result)[0].code).toBe('unrecognized_keys');
  });

  it.each([
    ['zero', 0],
    ['negative', -5],
    ['absurdly large', 1_000_001],
  ])('refuses a %s rate', (_label, rate) => {
    const result = createExchangeRateSchema.safeParse({ ...valid, rate });

    expect(result.success).toBe(false);
    expect(issues(result)[0].path).toEqual(['rate']);
  });

  it.each([
    ['a timestamp', '2026-08-17T00:00:00Z'],
    ['a non-date', 'yesterday'],
    ['an impossible day', '2026-02-30'],
  ])('refuses %s', (_label, date) => {
    const result = createExchangeRateSchema.safeParse({ ...valid, date });

    expect(result.success).toBe(false);
    expect(issues(result)[0].path).toEqual(['date']);
  });

  it('requires both fields', () => {
    expect(
      createExchangeRateSchema.safeParse({ date: '2026-08-17' }).success,
    ).toBe(false);
    expect(createExchangeRateSchema.safeParse({ rate: 12650 }).success).toBe(
      false,
    );
  });
});

describe('updateExchangeRateSchema', () => {
  it('accepts a new rate', () => {
    expect(updateExchangeRateSchema.safeParse({ rate: 12800 }).success).toBe(
      true,
    );
  });

  it('refuses to move a rate to another date', () => {
    // A rate on a different day is a different fact, so it is a new row.
    const result = updateExchangeRateSchema.safeParse({ date: '2026-08-18' });

    expect(result.success).toBe(false);
    expect(issues(result).some((i) => i.code === 'unrecognized_keys')).toBe(
      true,
    );
  });
});
