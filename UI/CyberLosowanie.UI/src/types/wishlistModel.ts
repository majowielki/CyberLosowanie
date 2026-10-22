// Mirrors backend WishlistResponse. Data is null (not 404) when the wishlist
// has not been saved yet — an expected state, handled by the pages. The letter
// fields are filled only for the owner (null in the Santa's view).
export default interface wishlistModel {
  canvasJson: string;
  updatedAtUtc: string;
  /** When the letter was first sent to Santa; null = still a private draft. */
  sentAtUtc?: string | null;
  /** Last send / "notify about changes". */
  lastNotificationAtUtc?: string | null;
}

// Mirrors backend GiftedWishlistStatusResponse (navigation badge).
export interface giftedWishlistStatusModel {
  isSent: boolean;
  hasUnseenChanges: boolean;
}

// Mirrors backend UploadImageResponse — blob path "{cyberekId}/{guid}.{ext}"
// referenced by image items in the canvas document.
export interface uploadImageResponseModel {
  path: string;
}
