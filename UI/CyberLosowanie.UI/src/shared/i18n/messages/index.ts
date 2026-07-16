import { Language } from '../config';
import { auth } from './auth';
import { common } from './common';
import { cyberki } from './cyberki';
import { wishlist } from './wishlist';

const pl = { ...common.pl, ...auth.pl, ...cyberki.pl, ...wishlist.pl };
const en = { ...common.en, ...auth.en, ...cyberki.en, ...wishlist.en };

/** Union of every existing key — t('typo') fails at compile time (doc §6.3). */
export type TranslationKey = keyof typeof pl;

export const messages: Record<Language, Record<TranslationKey, string>> = { pl, en };
