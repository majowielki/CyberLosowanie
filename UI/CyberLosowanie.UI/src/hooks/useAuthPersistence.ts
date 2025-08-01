import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { setLoggedInUser } from '@/features/redux/userSlice';
import { userModel } from '@/interfaces';
import { userStateUtils } from '@/helpers/userStateHelper';

export const useAuthPersistence = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Check if token is expired
        const decodedToken = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        
        if (decodedToken.exp && decodedToken.exp > currentTime) {
          // Token is valid, restore user state
          const decoded = decodedToken as userModel & { exp: number };
          const tokenData: userModel = {
            fullName: decoded.fullName || '',
            id: decoded.id || '',
            cyberekId: decoded.cyberekId || '0',
            giftedCyberekId: decoded.giftedCyberekId || '0'
          };
          
          // Load saved local state and merge with token data
          const savedState = userStateUtils.loadUserState();
          const mergedData = userStateUtils.mergeUserState(tokenData, savedState);
          
          dispatch(setLoggedInUser(mergedData));
          console.log('User state restored from token:', mergedData);
        } else {
          // Token is expired, remove it
          localStorage.removeItem('token');
          userStateUtils.clearUserState();
          console.log('Token expired, removed from storage');
        }
      } catch (error) {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        userStateUtils.clearUserState();
        console.error('Invalid token, removed from storage:', error);
      }
    }
  }, [dispatch]);
};

// Token utility functions
export const tokenUtils = {
  isTokenExpired: (token: string): boolean => {
    try {
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      return decoded.exp ? decoded.exp <= currentTime : true;
    } catch {
      return true;
    }
  },

  getTokenExpirationTime: (token: string): Date | null => {
    try {
      const decoded = jwtDecode(token);
      return decoded.exp ? new Date(decoded.exp * 1000) : null;
    } catch {
      return null;
    }
  },

  clearAuthData: (): void => {
    localStorage.removeItem('token');
  }
};
