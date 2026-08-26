import { buildSku, slugify, uniqueSku } from './sku';

describe('slugify', () => {
  it.each([
    ['Qora', 'QORA'],
    ["To'q ko'k", 'TOQKOK'],
    ['Kök', 'KOK'],
    ['Ko’k', 'KOK'],
    ['3XL', '3XL'],
    ['Ko ylak-01', 'KOYLAK01'],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input, 20)).toBe(expected);
  });

  it('truncates to the limit it is given', () => {
    expect(slugify('Jigarrangroq', 10)).toBe('JIGARRANGR');
  });
});

describe('buildSku', () => {
  const base = {
    productCode: 'KOY01',
    productName: "Ko'ylak-01",
    sizeName: 'M',
    colorName: 'Qora',
  };

  it('joins product, size and colour', () => {
    expect(buildSku(base)).toBe('KOY01-M-QORA');
  });

  it('appends the second colour when there is one', () => {
    expect(buildSku({ ...base, color2Name: 'Oq' })).toBe('KOY01-M-QORA-OQ');
  });

  it('ignores an empty second colour', () => {
    expect(buildSku({ ...base, color2Name: null })).toBe('KOY01-M-QORA');
  });

  it('falls back to the product name when there is no code', () => {
    expect(buildSku({ ...base, productCode: null })).toBe('KOYLAK01-M-QORA');
  });

  it('is order-sensitive — (black, white) is not (white, black)', () => {
    const a = buildSku({ ...base, colorName: 'Qora', color2Name: 'Oq' });
    const b = buildSku({ ...base, colorName: 'Oq', color2Name: 'Qora' });

    expect(a).not.toBe(b);
  });

  it('stays inside the varchar(60) column at full length', () => {
    const long = buildSku({
      productCode: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      productName: 'x',
      sizeName: 'ABCDEFGHIJ',
      colorName: 'ABCDEFGHIJKLMNO',
      color2Name: 'ABCDEFGHIJKLMNO',
    });

    expect(long.length).toBeLessThanOrEqual(60);
  });
});

describe('uniqueSku', () => {
  it('returns the base when nothing holds it', () => {
    expect(uniqueSku('KOY01-M-QORA', () => false)).toBe('KOY01-M-QORA');
  });

  it('suffixes past the taken ones', () => {
    const taken = new Set(['KOY01-M-QORA', 'KOY01-M-QORA-2']);

    expect(uniqueSku('KOY01-M-QORA', (c) => taken.has(c))).toBe(
      'KOY01-M-QORA-3',
    );
  });
});
