# Wishlist stickers

Ready-made decorations every user can drop on their wishlist canvas (the
"Naklejki" button in the editor toolbar). The files here are bundled with the
frontend; a saved wishlist stores only the sticker **id**, never the file.

Each sticker is two files named after its id:

- `<id>.webp` — the artwork drawn on the canvas: WebP with alpha, longer edge
  1024 px, ideally ≤ 150 KB,
- `thumbs/<id>.webp` — a 160 px thumbnail for the picker, which shows one
  category tab at a time and loads thumbnails lazily.

`stickers.ts` finds both files by name (`import.meta.glob`), so no import line
is needed; `stickers.test.ts` fails if either file is missing.

## Generating a sticker in Higgsfield

The library was generated with the `higgsfield-generate` skill; the full plan
(style blocks, prompts, quality checklist) is in `Docs/naklejki-higgsfield.md`.
In short:

- **Style:** Nano Banana 2 (`nano_banana_flash`) with STYLE A and the style
  anchor as an image reference; lettering on GPT Image 2.5 (`gpt_image_2_5`,
  best at Polish letters); the `cyber` pack in STYLE C on GPT Image 2.5.
- **Background:** GPT Image 2.5 gives real transparency
  (`--background transparent`); Nano Banana 2 does not, so it paints on a flat
  magenta backdrop that the prepare script keys out.
- **Work folder:** raw output, prompts and the cost log go to
  `UI/CyberLosowanie.UI/stickers-work/` (git-ignored).
- **Prepare** (from `UI/CyberLosowanie.UI`):
  `node scripts/stickers/prepare-sticker.mjs <raw.png> <id> --size <longer edge in document units>`
  — removes the background, trims, writes `<id>.webp` and `thumbs/<id>.webp`
  here and prints the size for `stickers.ts`.
- **Check:** `node scripts/stickers/contact-sheet.mjs` renders every sticker on
  white, pine and red, so halos and leftover background are easy to spot.
  Lettering must be checked letter by letter (ł, ż, ń, ś, ą, ę).

## Portrait stickers ("Moja karykatura", "Ja jako dziecko")

Two ids in the `cyber` tab have no file here: they show the **wishlist owner's**
caricature or child portrait (the owner sees themselves, their Santa sees the
owner). `stickers.ts` marks them with `portraitKind`; the canvas loads the
image from the API (`caricature-sticker` / `child-sticker` kinds, sign-in only)
for the cyberek given by `WishlistOwnerContext` (`canvas/wishlistOwner.ts`).

They show real people, so they never live in the repository:

1. Cut the person out of each original portrait with Higgsfield's
   `image_background_remover` (1 credit each) — originals in
   `src/assets/karykatury` and `src/assets/dzieci` (git-ignored).
2. `node scripts/stickers/prepare-portrait-stickers.mjs <cut-outs dir>` adds the
   white die-cut border (a distance transform around the silhouette) and frames
   every sticker 4:5 into the git-ignored `src/assets/naklejki-portrety/`.
3. `API/scripts/Upload-CyberkiImages.ps1` uploads them with the other portraits
   as `{cyberekId}/caricature-sticker.webp` and `child-sticker.webp`.

## Adding a sticker

1. **Name the files** after the id: lowercase ASCII, words joined with `-`,
   no Polish letters — e.g. `swiateczna-skarpeta.webp` (+ the thumbnail).
2. **Add the id** to:
   - `STICKER_IDS` in `src/features/wishlist/canvas/canvasConstants.ts`,
   - `STICKER_IDS` in `API/src/CyberLosowanie/Constants/WishlistConstants.cs`
     (the server rejects ids it does not know; a test checks both lists match).
3. **Register it** in `src/features/wishlist/canvas/stickers.ts`: the default
   size (document units on the 1080×1528 page, same aspect ratio as the
   artwork — printed by the prepare script), a label key and a picker
   `category`. The compiler complains until every id has an entry.
4. **Add the label** `wishlist.sticker.<camelCaseName>` in both languages in
   `src/shared/i18n/messages/wishlist.ts` (a new category also needs
   `wishlist.sticker.category.<name>`).

## Changing or removing a sticker

Replacing the artwork of an existing file is always safe (keep the aspect
ratio, or update the default size). **Never rename or remove an id** that has
shipped: wishlists that use it would fail validation and stop loading. To
retire a sticker, leave its id and files in place and hide it from the picker
(`hidden: true` in `stickers.ts`).
