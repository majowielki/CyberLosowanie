import { jwtDecode } from 'jwt-decode';
import { tokenClaims, userModel } from '@/types';

export const tokenUtils = {
  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp <= currentTime : true;
    } catch {
      // An unparsable token is treated as expired
      return true;
    }
  },

  clearAuthData: (): void => {
    localStorage.removeItem('token');
  }
};

// Backend encodes "none" as 0 in the claims — map it to null client-side (E5).
export const userFromToken = (claims: tokenClaims): userModel => ({
  fullName: claims.fullName || '',
  id: claims.id || '',
  cyberekId: Number(claims.cyberekId) || null,
  giftedCyberekId: Number(claims.giftedCyberekId) || null,
});
