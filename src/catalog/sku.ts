/** Longest each part may contribute, so the whole stays inside varchar(60). */
const LIMITS = { product: 20, size: 6, color: 10 } as const;

/**
 * Uppercase A–Z and digits only: apostrophes, spaces and hyphens go, and
 * diacritics are folded first so "Ko'k" and "Kök" both land on KOK.
 * Cyrillic never reaches this function — the DTOs reject it at the boundary,
 * because a Cyrillic character here would strip to nothing and silently drop
 * a whole token from the SKU.
 */
export function slugify(value: string, max: number): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, max);
}

export interface SkuParts {
  /** `products.code` when set — otherwise the product's name is slugified. */
  productCode: string | null;
  productName: string;
  sizeName: string;
  colorName: string;
  color2Name?: string | null;
}

export function buildSku(parts: SkuParts): string {
  const product = slugify(
    parts.productCode ?? parts.productName,
    LIMITS.product,
  );
  const tokens = [
    product,
    slugify(parts.sizeName, LIMITS.size),
    slugify(parts.colorName, LIMITS.color),
  ];
  if (parts.color2Name) {
    tokens.push(slugify(parts.color2Name, LIMITS.color));
  }
  return tokens.filter(Boolean).join('-');
}

/**
 * Truncation can make two different variants collide, so the caller supplies a
 * "is this taken?" probe and the base gets `-2`, `-3`… until it is free.
 */
export async function uniqueSku(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  if (!(await isTaken(base))) {
    return base;
  }
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not find a free SKU based on ${base}`);
}
