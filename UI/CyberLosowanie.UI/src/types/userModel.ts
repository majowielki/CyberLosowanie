export default interface userModel {
    fullName: string;
    id: string;
    // null = not assigned yet. Backend encodes "none" as 0 in JWT claims;
    // it is mapped to null at the client boundary (E5).
    cyberekId: number | null;
    giftedCyberekId: number | null;
  }
