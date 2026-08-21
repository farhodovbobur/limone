import {
  checkDigit,
  hasValidCheckDigit,
  internalCode,
  isInternalShape,
  isValidEan13,
} from './barcode';

describe('checkDigit', () => {
  it('generates the spec example: variant 41 → 00000413', () => {
    expect(internalCode(41)).toBe('00000413');
  });

  it('is right-anchored — the assertion that kills a left-anchored rewrite', () => {
    // For the published EAN-13 4006381333931, right-anchored sums to 89
    // (check 1); left-anchored sums to 83 (check 7). Odd-length internal
    // codes cannot tell the two apart, so only this case can.
    expect(checkDigit('400638133393')).toBe(1);
  });

  it.each([
    ['4006381333931', true],
    ['5901234123457', true],
    ['4006381333930', false],
    ['4006381333941', false],
  ])('validates the published EAN-13 %s → %s', (code, ok) => {
    expect(isValidEan13(code)).toBe(ok);
  });

  it('rejects an EAN-13 of the wrong length outright', () => {
    expect(isValidEan13('40063813339')).toBe(false);
    expect(isValidEan13('00000413')).toBe(false);
  });
});

describe('internalCode', () => {
  it.each([
    [1, '00000017'],
    [41, '00000413'],
    [9_999_999, '99999995'],
  ])('variant %i → %s', (id, code) => {
    expect(internalCode(id)).toBe(code);
    expect(isInternalShape(code)).toBe(true);
    expect(hasValidCheckDigit(code)).toBe(true);
  });

  it('refuses an id that no longer fits seven digits', () => {
    expect(() => internalCode(10_000_000)).toThrow(/does not fit/);
  });
});

describe('manual-entry protection', () => {
  it('a single mistyped digit fails the check', () => {
    expect(hasValidCheckDigit('00000413')).toBe(true);
    expect(hasValidCheckDigit('00000414')).toBe(false);
    expect(hasValidCheckDigit('00000423')).toBe(false);
  });

  it('two swapped digits fail the check', () => {
    expect(hasValidCheckDigit('00000431')).toBe(false);
  });
});
