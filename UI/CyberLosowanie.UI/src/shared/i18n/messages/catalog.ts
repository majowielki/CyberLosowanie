import { Language } from '../config';

/**
 * One namespace of translations. PL is the source of truth for the key set;
 * assigning an EN object literal to `Record<K, string>` makes the compiler
 * reject both missing and extra keys (excess property check), so the two
 * languages cannot drift apart (doc §6.3).
 */
export type MessageCatalog<K extends string> = Record<Language, Record<K, string>>;
