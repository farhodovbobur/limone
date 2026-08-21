export const INTERNAL_DATA_LENGTH = 7;

export function checkDigit(data: string): number {
  let sum = 0;
  for (let i = 0; i < data.length; i += 1) {
    const digit = data.charCodeAt(data.length - 1 - i) - 48;
    sum += digit * (i % 2 === 0 ? 3 : 1);
  }
  return (10 - (sum % 10)) % 10;
}

export function internalCode(variantId: number): string {
  const data = String(variantId).padStart(INTERNAL_DATA_LENGTH, '0');
  if (data.length > INTERNAL_DATA_LENGTH) {
    throw new Error(`Variant id ${variantId} does not fit an internal barcode`);
  }
  return data + String(checkDigit(data));
}

/** Eight digits — the shape of our internal codes. */
export const isInternalShape = (code: string): boolean => /^\d{8}$/.test(code);

/** For any all-digit code whose last digit is its check digit. */
export const hasValidCheckDigit = (code: string): boolean =>
  checkDigit(code.slice(0, -1)) === Number(code.at(-1));

export const isValidEan13 = (code: string): boolean =>
  /^\d{13}$/.test(code) && hasValidCheckDigit(code);
