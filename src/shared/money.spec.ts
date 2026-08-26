import { Currency } from './enums/currency.enum';
import { round2, toUsd, toUzs } from './money';

const uzs = (amount: number, rate: number) => ({
  currency: Currency.UZS,
  amount,
  rate,
});
const usd = (amount: number, rate: number) => ({
  currency: Currency.USD,
  amount,
  rate,
});

describe('round2', () => {
  it.each([
    [30.2857142, 30.29],
    [30.284, 30.28],
    [113750, 113750],
    [-12.345, -12.35], // half away from zero, so a sign never changes the digits
  ])('%s → %s', (input, expected) => {
    expect(round2(input)).toBe(expected);
  });

  // `x * 100` lands just under the half for these, so a plain Math.round books
  // them a tiyin light. Every one of them is a price a person can type.
  it.each([
    [8750.005, 8750.01],
    [1.005, 1.01],
    [2.675, 2.68],
    [1.115, 1.12],
    [10.235, 10.24],
  ])('%s → %s despite binary floating point', (input, expected) => {
    expect(round2(input)).toBe(expected);
  });

  it('still rounds down what is genuinely below the half', () => {
    expect(round2(1.1149999)).toBe(1.11);
    expect(round2(1.0049999999)).toBe(1);
  });
});

describe('conversion direction', () => {
  it("multiplies going USD → UZS: one dollar buys `rate` so'm", () => {
    expect(toUzs(usd(10, 12_650))).toBe(126_500);
  });

  it('divides going UZS → USD, keeping four decimals', () => {
    expect(toUsd(uzs(132_000, 12_650))).toBe(10.4348);
  });

  it('can still see a garment that costs less than a cent of a dollar', () => {
    // At two decimals anything under ~125 so'm books as $0.00, and the USD
    // half of the two-currency design goes quietly missing.
    expect(toUsd(uzs(50, 12_500))).toBe(0.004);
  });

  it('leaves a value alone when it is already in the asked-for currency', () => {
    expect(toUzs(uzs(87_500, 12_650))).toBe(87_500);
    expect(toUsd(usd(10, 12_650))).toBe(10);
  });

  it('does not round-trip exactly, and that is why only one side is stored', () => {
    // 132 000 ÷ 12 650 = 10.4347826… — two hand-written copies of this could
    // disagree, which is exactly why §4.7 stores one amount, not both.
    expect(toUzs(usd(toUsd(uzs(132_000, 12_650)), 12_650))).not.toBe(132_000);
  });

  it('refuses a zero or negative rate instead of returning Infinity', () => {
    expect(() => toUsd(uzs(1000, 0))).toThrow(/greater than zero/);
    expect(() => toUzs(usd(10, -1))).toThrow(/greater than zero/);
  });

  it('ignores the rate entirely when no conversion is needed', () => {
    // A UZS row whose rate was never meaningful must still read back.
    expect(toUzs(uzs(1000, 0))).toBe(1000);
  });
});
