import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { toast } from '@/shared/hooks/use-toast';
import { DEFAULT_LANGUAGE, Language, translate } from '@/shared/i18n';
import { tokenUtils } from './tokenUtils';
import { resetUser } from './userSlice';

type AuthedBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError>;

/**
 * Wraps the base query of the signed-in APIs (cyberki, wishlist). A 401 while a
 * token is stored means the server no longer accepts the session — the password
 * was reset (here or on another device) or the token is from an older build. The
 * session is cleared like a logout, so the protected routes send the user to the
 * sign-in page, and a toast says why.
 */
export const withSessionGuard =
  (baseQuery: AuthedBaseQuery): AuthedBaseQuery =>
  async (args, api, extraOptions) => {
    const result = await baseQuery(args, api, extraOptions);
    if (result.error?.status === 401 && localStorage.getItem('token')) {
      tokenUtils.clearAuthData();
      api.dispatch(resetUser());
      const state = api.getState() as { localeStore?: { language?: Language } };
      toast({ description: translate(state.localeStore?.language ?? DEFAULT_LANGUAGE, 'auth.sessionEnded') });
    }
    return result;
  };
