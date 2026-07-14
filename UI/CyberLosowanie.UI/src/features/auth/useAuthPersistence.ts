import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { jwtDecode } from 'jwt-decode';
import { setLoggedInUser, resetUser } from '@/features/auth/userSlice';
import { RootState } from '@/app/store';
import { tokenClaims } from '@/types';
import { debugLog } from '@/shared/config';
import { tokenUtils, userFromToken } from './tokenUtils';

export const useAuthPersistence = () => {
  const dispatch = useDispatch();
  const userId = useSelector((state: RootState) => state.userAuthStore.id);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // The token is the single source of truth for authentication (H3):
    // without a valid one, any rehydrated session state is stale.
    if (!token || tokenUtils.isTokenExpired(token)) {
      if (token) {
        tokenUtils.clearAuthData();
        debugLog('Token expired or invalid, session cleared');
      }
      if (userId) {
        dispatch(resetUser());
      }
      return;
    }

    // Redux-persist already restored the runtime state (e.g. cyberekId chosen
    // after login) — populate from the token only when the store is empty.
    if (!userId) {
      const decoded = jwtDecode<tokenClaims>(token);
      dispatch(setLoggedInUser(userFromToken(decoded)));
      debugLog('User state restored from token');
    }
  }, [dispatch, userId]);
};
