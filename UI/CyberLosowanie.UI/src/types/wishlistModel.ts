// Mirrors backend WishlistResponse. Data is null (not 404) when the wishlist
// has not been saved yet — an expected state, handled by the pages.
export default interface wishlistModel {
  canvasJson: string;
  updatedAtUtc: string;
}

// Mirrors backend UploadImageResponse — blob path "{cyberekId}/{guid}.{ext}"
// referenced by image items in the canvas document.
export interface uploadImageResponseModel {
  path: string;
}
