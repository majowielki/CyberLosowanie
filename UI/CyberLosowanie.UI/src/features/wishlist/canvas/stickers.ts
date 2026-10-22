// Built-in sticker library: the artwork, default size, label and picker
// category of every sticker id (canvasConstants STICKER_IDS). The files are the
// project owner's own designs bundled with the app; how to add one is described
// in src/assets/stickers/README.md.

import type { TranslationKey } from '@/shared/i18n';
import type { cyberekImageKind } from '@/types';
import { STICKER_IDS } from './canvasConstants';

export type StickerId = (typeof STICKER_IDS)[number];

/** Picker tabs, in display order. */
export const STICKER_CATEGORIES = [
  'lettering',
  'priority',
  'notes',
  'christmas',
  'characters',
  'frames',
  'cyber',
] as const;
export type StickerCategory = (typeof STICKER_CATEGORIES)[number];

export interface StickerDefinition {
  /** Bundled asset URL (WebP with a transparent background), drawn on the canvas. */
  src?: string;
  /** Small version of the artwork for the picker. */
  thumbSrc?: string;
  /**
   * Portrait sticker: no bundled file — the wishlist owner's portrait of this
   * kind is loaded from the API instead (see wishlistOwner.ts).
   */
  portraitKind?: Extract<cyberekImageKind, 'caricature-sticker' | 'child-sticker'>;
  /** Size on insertion, in document units — the artwork's aspect ratio. */
  width: number;
  height: number;
  labelKey: TranslationKey;
  category: StickerCategory;
  /** Retired: still rendered on saved wishlists, no longer offered in the picker. */
  hidden?: boolean;
}

type StickerMeta = Omit<StickerDefinition, 'src' | 'thumbSrc'>;

// A Record, so the compiler demands an entry for every id in STICKER_IDS.
const META: Record<StickerId, StickerMeta> = {
  'drogi-mikolaju': { width: 600, height: 379, labelKey: 'wishlist.sticker.dearSanta', category: 'lettering' },
  choinka: { width: 232, height: 340, labelKey: 'wishlist.sticker.tree', category: 'christmas' },
  prezent: { width: 277, height: 280, labelKey: 'wishlist.sticker.gift', category: 'christmas' },
  'moja-lista-zyczen': { width: 600, height: 440, labelKey: 'wishlist.sticker.myWishList', category: 'lettering' },
  'bylem-grzeczny': { width: 480, height: 358, labelKey: 'wishlist.sticker.iWasGoodBoy', category: 'lettering' },
  'bylam-grzeczna': { width: 480, height: 334, labelKey: 'wishlist.sticker.iWasGoodGirl', category: 'lettering' },
  'ho-ho-ho': { width: 420, height: 187, labelKey: 'wishlist.sticker.hoHoHo', category: 'lettering' },
  'top-1': { width: 158, height: 220, labelKey: 'wishlist.sticker.top1', category: 'priority' },
  'top-2': { width: 151, height: 220, labelKey: 'wishlist.sticker.top2', category: 'priority' },
  'top-3': { width: 155, height: 220, labelKey: 'wishlist.sticker.top3', category: 'priority' },
  hit: { width: 240, height: 229, labelKey: 'wishlist.sticker.hit', category: 'priority' },
  strzalka: { width: 300, height: 210, labelKey: 'wishlist.sticker.arrow', category: 'priority' },
  metka: { width: 320, height: 289, labelKey: 'wishlist.sticker.giftTag', category: 'notes' },
  wstega: { width: 560, height: 337, labelKey: 'wishlist.sticker.ribbonBanner', category: 'notes' },
  karteczka: { width: 290, height: 300, labelKey: 'wishlist.sticker.stickyNote', category: 'notes' },
  lista: { width: 302, height: 440, labelKey: 'wishlist.sticker.checklist', category: 'notes' },
  zwoj: { width: 303, height: 440, labelKey: 'wishlist.sticker.scroll', category: 'notes' },
  'tasma-czerwona': { width: 360, height: 198, labelKey: 'wishlist.sticker.washiStriped', category: 'notes' },
  'tasma-zielona': { width: 360, height: 188, labelKey: 'wishlist.sticker.washiSnowflake', category: 'notes' },
  mikolaj: { width: 272, height: 320, labelKey: 'wishlist.sticker.santa', category: 'characters' },
  renifer: { width: 229, height: 320, labelKey: 'wishlist.sticker.reindeer', category: 'characters' },
  balwan: { width: 215, height: 300, labelKey: 'wishlist.sticker.snowman', category: 'characters' },
  'piernikowy-ludzik': { width: 280, height: 252, labelKey: 'wishlist.sticker.gingerbreadMan', category: 'characters' },
  skarpeta: { width: 196, height: 300, labelKey: 'wishlist.sticker.stocking', category: 'christmas' },
  bombka: { width: 211, height: 240, labelKey: 'wishlist.sticker.bauble', category: 'christmas' },
  'laska-cukrowa': { width: 180, height: 280, labelKey: 'wishlist.sticker.candyCane', category: 'christmas' },
  elf: { width: 178, height: 300, labelKey: 'wishlist.sticker.elf', category: 'characters' },
  pingwin: { width: 280, height: 249, labelKey: 'wishlist.sticker.penguin', category: 'characters' },
  'kot-w-czapce': { width: 280, height: 269, labelKey: 'wishlist.sticker.catInHat', category: 'characters' },
  mis: { width: 261, height: 280, labelKey: 'wishlist.sticker.teddyBear', category: 'characters' },
  dzwonek: { width: 239, height: 240, labelKey: 'wishlist.sticker.bell', category: 'christmas' },
  jemiola: { width: 218, height: 260, labelKey: 'wishlist.sticker.mistletoe', category: 'christmas' },
  'gwiazda-betlejemska': { width: 257, height: 260, labelKey: 'wishlist.sticker.poinsettia', category: 'christmas' },
  swieca: { width: 195, height: 260, labelKey: 'wishlist.sticker.candle', category: 'christmas' },
  sniezynka: { width: 217, height: 220, labelKey: 'wishlist.sticker.snowflake', category: 'christmas' },
  gwiazdka: { width: 220, height: 219, labelKey: 'wishlist.sticker.goldStar', category: 'christmas' },
  lampki: { width: 600, height: 335, labelKey: 'wishlist.sticker.stringLights', category: 'christmas' },
  sanie: { width: 340, height: 245, labelKey: 'wishlist.sticker.sleigh', category: 'christmas' },
  kakao: { width: 243, height: 260, labelKey: 'wishlist.sticker.hotCocoa', category: 'christmas' },
  koperta: { width: 320, height: 225, labelKey: 'wishlist.sticker.envelope', category: 'notes' },
  znaczek: { width: 159, height: 220, labelKey: 'wishlist.sticker.stamp', category: 'notes' },
  'ramka-polaroid': { width: 325, height: 420, labelKey: 'wishlist.sticker.photoFrame', category: 'frames' },
  wianek: { width: 408, height: 420, labelKey: 'wishlist.sticker.wreath', category: 'frames' },
  'ramka-okno': { width: 303, height: 420, labelKey: 'wishlist.sticker.windowFrame', category: 'frames' },
  'ramka-zlota': { width: 460, height: 363, labelKey: 'wishlist.sticker.goldFrame', category: 'frames' },
  'ramka-lampki': { width: 420, height: 379, labelKey: 'wishlist.sticker.lightsFrame', category: 'frames' },
  'ramka-bombka': { width: 315, height: 380, labelKey: 'wishlist.sticker.baubleFrame', category: 'frames' },
  pierniki: { width: 280, height: 235, labelKey: 'wishlist.sticker.gingerbreadHearts', category: 'christmas' },
  'wesolych-swiat': { width: 600, height: 289, labelKey: 'wishlist.sticker.merryChristmas', category: 'lettering' },
  dziekuje: { width: 420, height: 194, labelKey: 'wishlist.sticker.thankYou', category: 'lettering' },
  'zaskocz-mnie': { width: 431, height: 480, labelKey: 'wishlist.sticker.surpriseMe', category: 'lettering' },
  'bardzo-prosze': { width: 480, height: 155, labelKey: 'wishlist.sticker.prettyPlease', category: 'lettering' },
  'pixel-prezent': { width: 209, height: 240, labelKey: 'wishlist.sticker.pixelGift', category: 'christmas' },
  'pixel-choinka': { width: 174, height: 300, labelKey: 'wishlist.sticker.pixelTree', category: 'christmas' },
  'robot-elf': { width: 208, height: 280, labelKey: 'wishlist.sticker.robotElf', category: 'christmas' },
  'mikolaj-vr': { width: 227, height: 300, labelKey: 'wishlist.sticker.santaVr', category: 'christmas' },
  'asti-czapka': { width: 300, height: 272, labelKey: 'wishlist.sticker.astiSantaHat', category: 'cyber' },
  'asti-piernik': { width: 360, height: 263, labelKey: 'wishlist.sticker.astiGingerbread', category: 'cyber' },
  'luna-rogi': { width: 261, height: 300, labelKey: 'wishlist.sticker.lunaAntlers', category: 'cyber' },
  'luna-prezent': { width: 300, height: 261, labelKey: 'wishlist.sticker.lunaGift', category: 'cyber' },
  'masza-czapka': { width: 187, height: 300, labelKey: 'wishlist.sticker.maszaSantaHat', category: 'cyber' },
  'masza-sweter': { width: 283, height: 300, labelKey: 'wishlist.sticker.maszaSweater', category: 'cyber' },
  // 4:5 like every prepared portrait sticker (scripts/stickers/prepare-portrait-stickers.mjs).
  'moja-karykatura': {
    width: 280,
    height: 350,
    labelKey: 'wishlist.sticker.myCaricature',
    category: 'cyber',
    portraitKind: 'caricature-sticker',
  },
  'ja-dziecko': {
    width: 280,
    height: 350,
    labelKey: 'wishlist.sticker.meAsChild',
    category: 'cyber',
    portraitKind: 'child-sticker',
  },
};

// Artwork and thumbnails are found by file name (<id>.webp), so adding a sticker
// needs no import line. Vite turns each match into a hashed asset URL.
const byFileName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([file, url]) => [file.slice(file.lastIndexOf('/') + 1, -'.webp'.length), url]));
const ARTWORK = byFileName(
  import.meta.glob<string>('../../../assets/stickers/*.webp', { eager: true, import: 'default', query: '?url' })
);
const THUMBNAILS = byFileName(
  import.meta.glob<string>('../../../assets/stickers/thumbs/*.webp', { eager: true, import: 'default', query: '?url' })
);

export const STICKERS = Object.fromEntries(
  STICKER_IDS.map((id) => [id, { ...META[id], src: ARTWORK[id], thumbSrc: THUMBNAILS[id] }])
) as Record<StickerId, StickerDefinition>;

/** Stickers offered in the picker, in STICKER_IDS order. */
export const PICKER_STICKERS = STICKER_IDS.filter((id) => !STICKERS[id].hidden).map((id) => ({
  id,
  ...STICKERS[id],
}));

export const isStickerId = (value: unknown): value is StickerId =>
  typeof value === 'string' && (STICKER_IDS as readonly string[]).includes(value);
