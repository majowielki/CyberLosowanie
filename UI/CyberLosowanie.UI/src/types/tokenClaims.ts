// Raw JWT payload — custom claims arrive as strings.
export default interface tokenClaims {
    fullName?: string;
    id?: string;
    cyberekId?: string;
    giftedCyberekId?: string;
    exp?: number;
  }
