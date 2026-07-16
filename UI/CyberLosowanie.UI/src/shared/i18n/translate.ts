import { DEFAULT_LANGUAGE, Language } from './config';
import { messages, TranslationKey } from './messages';

export type TranslationParams = Record<string, string | number>;

/**
 * Pure translation + `{param}` interpolation — usable outside React (doc §6.4).
 * Unknown params are left as `{name}` so a mistake is visible, not silent.
 */
export function translate(
  lang: Language,
  key: TranslationKey,
  params?: TranslationParams,
): string {
  // Types make a missing key impossible; the fallback keeps runtime safe anyway.
  const template = messages[lang][key] ?? messages[DEFAULT_LANGUAGE][key] ?? key;
  if (!params) {
    return template;
  }
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in params ? String(params[name]) : placeholder,
  );
}

/**
 * Error whose message is a translation key resolved at display time — lets
 * pure modules (e.g. image processing) throw user-facing, translatable errors
 * without knowing the current language.
 */
export class TranslatableError extends Error {
  constructor(
    public readonly key: TranslationKey,
    public readonly params?: TranslationParams,
  ) {
    super(key);
    this.name = 'TranslatableError';
  }
}
