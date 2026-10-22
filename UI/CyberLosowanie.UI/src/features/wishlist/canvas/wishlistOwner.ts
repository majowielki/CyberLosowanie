import { createContext, useContext } from 'react';

/**
 * Cyberek whose wishlist is on screen. Portrait stickers ("my caricature", "me
 * as a child") store only their id, never a face: they show this person, so the
 * owner sees themselves and their Santa sees the owner. Provided by the editor
 * (the signed-in user) and the viewer (whoever's list it is).
 */
export const WishlistOwnerContext = createContext<number | null>(null);

export const useWishlistOwnerCyberekId = (): number | null => useContext(WishlistOwnerContext);
