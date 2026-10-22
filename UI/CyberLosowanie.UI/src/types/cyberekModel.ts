// Mirrors backend CyberekResponse — the API deliberately never returns
// giftedCyberekId/bannedCyberki (draw secrecy, S5). Portraits are not part of
// the model: they are fetched by id from the image endpoint (CyberekPortrait).
export default interface cyberekModel {
    id: number;
    name: string;
    surname: string;
  }

// Mirrors backend CyberekImageConstants.KINDS: santa = picking yourself,
// caricature = the draw reveal, child = the wishlist (a letter to Santa); the
// *-sticker kinds are those two cut out with a white border (wishlist stickers).
export type cyberekImageKind = 'santa' | 'caricature' | 'child' | 'caricature-sticker' | 'child-sticker';
