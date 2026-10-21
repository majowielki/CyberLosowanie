# Wishlist stickers

Ready-made decorations every user can drop on their wishlist canvas (the
"Naklejki" button in the editor toolbar). The files here are bundled with the
frontend; a saved wishlist stores only the sticker **id**, never the file.

The three SVGs shipped now (`drogi-mikolaju`, `choinka`, `prezent`) are
placeholders — replace their artwork whenever the real designs are ready.

## Adding a sticker

1. **Export from Canva** with a transparent background:
   *Share → Download → PNG* with *Transparent background* ticked (Canva Pro),
   or *SVG*. PNG, WebP and SVG all work. Keep the longer edge around
   600–1200 px for PNG/WebP — it is drawn at up to ~600 document units and
   the Santa may zoom in. An SVG must keep its `width`/`height` attributes
   (Firefox cannot draw an SVG without an intrinsic size). An SVG drawn as an
   image cannot load web fonts, so lettering must be shapes/paths, not
   `<text>` — if the lettering shows up in a fallback font, export PNG instead.
2. **Name the file** after its id: lowercase ASCII, words joined with `-`,
   no Polish letters — e.g. `swiateczna-skarpeta.png`. Put it in this folder.
3. **Pick the id** — the same kebab-case name. Add it to:
   - `STICKER_IDS` in `src/features/wishlist/canvas/canvasConstants.ts`,
   - `STICKER_IDS` in `API/src/CyberLosowanie/Constants/WishlistConstants.cs`
     (the server rejects ids it does not know).
4. **Register the file** in `src/features/wishlist/canvas/stickers.ts`: import
   it and add an entry with the default size (document units on the
   1080×1528 page, same aspect ratio as the artwork) and a label key. The
   compiler complains until every id has an entry.
5. **Add the label** `wishlist.sticker.<camelCaseName>` in both languages in
   `src/shared/i18n/messages/wishlist.ts`.

## Changing or removing a sticker

Replacing the artwork of an existing file is always safe (keep the aspect
ratio, or update the default size). **Never rename or remove an id** that has
shipped: wishlists that use it would fail validation and stop loading. To
retire a sticker, leave its id and file in place and hide it from the picker
(`hidden: true` in `stickers.ts`).
