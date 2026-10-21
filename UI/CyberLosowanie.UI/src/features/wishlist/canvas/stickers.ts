// Built-in sticker library: the artwork, default size and label of every
// sticker id (canvasConstants STICKER_IDS). The files are the project owner's
// own designs bundled with the app; how to add one is described in
// src/assets/stickers/README.md.

import type { TranslationKey } from '@/shared/i18n';
import { STICKER_IDS } from './canvasConstants';
import choinkaUrl from '@/assets/stickers/choinka.svg';
import drogiMikolajuUrl from '@/assets/stickers/drogi-mikolaju.svg';
import prezentUrl from '@/assets/stickers/prezent.svg';

export type StickerId = (typeof STICKER_IDS)[number];

export interface StickerDefinition {
  /** Bundled asset URL (SVG, PNG or WebP with a transparent background). */
  src: string;
  /** Size on insertion, in document units — the artwork's aspect ratio. */
  width: number;
  height: number;
  labelKey: TranslationKey;
  /** Retired: still rendered on saved wishlists, no longer offered in the picker. */
  hidden?: boolean;
}

// A Record, so the compiler demands an entry for every id in STICKER_IDS.
export const STICKERS: Record<StickerId, StickerDefinition> = {
  'drogi-mikolaju': { src: drogiMikolajuUrl, width: 600, height: 180, labelKey: 'wishlist.sticker.dearSanta' },
  choinka: { src: choinkaUrl, width: 300, height: 360, labelKey: 'wishlist.sticker.tree' },
  prezent: { src: prezentUrl, width: 280, height: 280, labelKey: 'wishlist.sticker.gift' },
};

/** Stickers offered in the picker, in STICKER_IDS order. */
export const PICKER_STICKERS = STICKER_IDS.filter((id) => !STICKERS[id].hidden).map((id) => ({
  id,
  ...STICKERS[id],
}));

export const isStickerId = (value: unknown): value is StickerId =>
  typeof value === 'string' && (STICKER_IDS as readonly string[]).includes(value);
