import { Currency } from './enums/currency.enum';

export interface Money {
  currency: Currency;
  amount: number;
  rate: number;
}

export const roundTo = (value: number, decimals: number): number => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export const round2 = (value: number): number => roundTo(value, 2);

export const round4 = (value: number): number => roundTo(value, 4);

export function toUzs(money: Money): number {
  if (money.currency === Currency.UZS) {
    return round2(money.amount);
  }
  requirePositiveRate(money.rate);
  return round2(money.amount * money.rate);
}

export function toUsd(money: Money): number {
  if (money.currency === Currency.USD) {
    return round4(money.amount);
  }
  requirePositiveRate(money.rate);
  return round4(money.amount / money.rate);
}

function requirePositiveRate(rate: number): void {
  if (!(rate > 0)) {
    throw new Error(`A rate must be greater than zero, got ${rate}`);
  }
}
