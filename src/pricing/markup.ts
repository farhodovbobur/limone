import { round2 } from '../shared/money';

export interface Markup {
  fixed: number | null;
  percent: number | null;
}

export function computeMarkup(price: number, cost: number | null): Markup {
  if (cost == null || cost === 0) {
    return { fixed: null, percent: null };
  }
  return {
    fixed: round2(price - cost),
    percent: round2((price / cost - 1) * 100),
  };
}
