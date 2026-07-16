import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { translate, TranslationParams } from './translate';
import { TranslationKey } from './messages';

/**
 * Reads the language from the Redux store (single source of truth, doc §6.5)
 * and returns a stable `t` — a language change re-renders consumers on its own.
 */
export function useTranslation() {
  const language = useSelector((state: RootState) => state.localeStore.language);
  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) => translate(language, key, params),
    [language],
  );
  return { t, language };
}
