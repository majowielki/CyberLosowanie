export const LANGUAGES = ['pl', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

// Current users are mostly Polish speakers (doc §1).
export const DEFAULT_LANGUAGE: Language = 'pl';
