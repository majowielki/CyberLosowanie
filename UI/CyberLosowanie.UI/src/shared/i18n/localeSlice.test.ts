import { describe, expect, it } from 'vitest';
import { localeReducer, setLanguage, toggleLanguage } from './localeSlice';
import { DEFAULT_LANGUAGE } from './config';

const initial = localeReducer(undefined, { type: 'init' });

describe('localeSlice', () => {
  it('starts with the default language (pl)', () => {
    expect(initial.language).toBe(DEFAULT_LANGUAGE);
    expect(initial.language).toBe('pl');
  });

  it('setLanguage stores the requested language', () => {
    expect(localeReducer(initial, setLanguage('en')).language).toBe('en');
    expect(localeReducer(initial, setLanguage('pl')).language).toBe('pl');
  });

  it('toggleLanguage flips between pl and en', () => {
    const afterFirst = localeReducer(initial, toggleLanguage());
    expect(afterFirst.language).toBe('en');
    expect(localeReducer(afterFirst, toggleLanguage()).language).toBe('pl');
  });
});
