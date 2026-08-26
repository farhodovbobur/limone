import { computeMarkup } from './markup';

describe('computeMarkup', () => {
  it('describes the worked example from the design doc', () => {
    // 87 500 cost, price nudged to a round 114 000 by hand.
    expect(computeMarkup(114_000, 87_500)).toEqual({
      fixed: 26_500,
      percent: 30.29, // 30.2857…, rounded not truncated
    });
  });

  it('gives a clean 30 % when the price was not nudged', () => {
    expect(computeMarkup(113_750, 87_500)).toEqual({
      fixed: 26_250,
      percent: 30,
    });
  });

  it('reports both as unknown when the cost is unknown — not as zero', () => {
    expect(computeMarkup(114_000, null)).toEqual({
      fixed: null,
      percent: null,
    });
  });

  it('never divides by zero, whatever reaches it', () => {
    expect(computeMarkup(114_000, 0)).toEqual({ fixed: null, percent: null });
  });

  it('goes negative below cost rather than hiding it', () => {
    expect(computeMarkup(70_000, 87_500)).toEqual({
      fixed: -17_500,
      percent: -20,
    });
  });

  it('is not reversible, which is why price is the only authority', () => {
    const { percent } = computeMarkup(114_000, 87_500);
    // Rebuilding the price from a 2-dp percent loses so'm.
    expect(87_500 * (1 + percent! / 100)).not.toBe(114_000);
  });
});
