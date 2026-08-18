export const LOCALES = ['uz', 'ru', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/** Uzbek is the workshop's working language and the fallback for everything. */
export const DEFAULT_LOCALE: Locale = 'uz';

export type Translations = Partial<Record<Locale, string>> & {
  [DEFAULT_LOCALE]: string;
};

export interface Translatable {
  name: string;
  translations: Translations | null;
}

/** The display name for one locale: requested → Uzbek → the `name` key. */
export const displayName = (row: Translatable, locale: Locale): string =>
  row.translations?.[locale] ?? row.translations?.[DEFAULT_LOCALE] ?? row.name;
