import { describe, expect, it } from 'vitest';
import { translate, TranslatableError } from './translate';

describe('translate', () => {
  it('returns the message in the requested language', () => {
    expect(translate('pl', 'common.action.back')).toBe('Wróć');
    expect(translate('en', 'common.action.back')).toBe('Back');
  });

  it('interpolates named params', () => {
    expect(translate('en', 'cyberki.final.santaFor', { cyberekName: 'Ala' })).toBe(
      'This year you are Santa for Ala',
    );
    expect(translate('pl', 'cyberki.final.santaFor', { cyberekName: 'Ala' })).toBe(
      'W tym roku będziesz mikołajem dla Ala',
    );
  });

  it('interpolates numeric params', () => {
    expect(translate('en', 'wishlist.validation.tooManyItems', { limit: 5 })).toBe(
      'Too many items (limit 5).',
    );
  });

  it('leaves the placeholder visible when a param is missing', () => {
    expect(translate('en', 'cyberki.final.santaFor', {})).toContain('{cyberekName}');
  });

  it('ignores extra params', () => {
    expect(translate('en', 'common.action.back', { unused: 'x' })).toBe('Back');
  });
});

describe('TranslatableError', () => {
  it('carries the key and params for display-time translation', () => {
    const error = new TranslatableError('wishlist.image.tooLarge', { limit: 5 });
    expect(error).toBeInstanceOf(Error);
    expect(error.key).toBe('wishlist.image.tooLarge');
    expect(error.params).toEqual({ limit: 5 });
  });
});
