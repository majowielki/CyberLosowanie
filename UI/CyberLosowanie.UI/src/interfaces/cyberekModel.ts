// Mirrors backend CyberekResponse — the API deliberately never returns
// giftedCyberekId/bannedCyberki (draw secrecy, S5).
export default interface cyberekModel {
    id: number;
    name: string;
    surname: string;
    imageUrl: string;
  }
