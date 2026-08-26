import { priceQuerySchema } from './dto/product-price.dto';

describe('priceQuerySchema', () => {
  it('takes the date the list is read as of', () => {
    expect(priceQuerySchema.safeParse({ date: '2026-08-20' }).success).toBe(
      true,
    );
  });

  it.each([
    ['a month that does not exist', { date: '2026-13-01' }],
    ['a word', { date: 'yesterday' }],
    [
      'the same key twice, which Express hands over as an array',
      {
        date: ['2026-08-20', '2026-08-21'],
      },
    ],
    ['nothing at all — the list has no default date', {}],
  ])('refuses %s', (_label, query) => {
    expect(priceQuerySchema.safeParse(query).success).toBe(false);
  });

  it('coerces productId, because a query string has only strings', () => {
    const result = priceQuerySchema.safeParse({
      date: '2026-08-20',
      productId: '41',
    });

    expect(result.success && result.data.productId).toBe(41);
  });

  it('refuses a mistyped filter instead of ignoring it', () => {
    // `.strict()`: `?prodctId=41` silently listing every product is worse than
    // a 400, because the answer looks right.
    expect(
      priceQuerySchema.safeParse({ date: '2026-08-20', prodctId: 41 }).success,
    ).toBe(false);
  });
});
