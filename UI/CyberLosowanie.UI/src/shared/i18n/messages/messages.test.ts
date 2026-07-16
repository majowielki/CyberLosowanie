import { describe, expect, it } from 'vitest';
import { messages, TranslationKey } from './index';

// The types already force PL/EN parity per namespace; these tests guard
// refactors and fail with a readable message naming the offending key (doc §10).

const keys = Object.keys(messages.pl) as TranslationKey[];

const placeholdersOf = (template: string): string[] =>
  (template.match(/\{\w+\}/g) ?? []).sort();

describe('messages', () => {
  it('PL and EN define exactly the same keys', () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.pl).sort());
  });

  it('no message is empty in either language', () => {
    for (const key of keys) {
      expect({ key, pl: messages.pl[key].trim() === '' }).toEqual({ key, pl: false });
      expect({ key, en: messages.en[key].trim() === '' }).toEqual({ key, en: false });
    }
  });

  it('every key uses the same interpolation params in both languages', () => {
    for (const key of keys) {
      expect({ key, params: placeholdersOf(messages.en[key]) }).toEqual({
        key,
        params: placeholdersOf(messages.pl[key]),
      });
    }
  });
});
