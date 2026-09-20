import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { persistor } from '@/app/store';
import { StatusMessage } from '@/shared/components';
import { useTranslation } from '@/shared/i18n';
import { resetUser } from './userSlice';
import { tokenUtils } from './tokenUtils';

/**
 * /logout — signs the user out and returns home. Logging out is a route (not
 * a click handler) so that it goes through the router first: an editor with
 * unsaved changes can block the navigation and offer save / discard / cancel
 * before the session is cleared. Clearing the session inline would unmount
 * the editor (and its blocker) before it could ask.
 */
function Logout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    let cancelled = false;
    const signOut = async () => {
      // Single-source logout (H3/S6): drop the token, reset runtime state and
      // purge its persisted copy — nothing else stores session data.
      tokenUtils.clearAuthData();
      dispatch(resetUser());
      await persistor.purge();
      if (!cancelled) {
        navigate('/', { replace: true });
      }
    };
    void signOut();
    return () => {
      cancelled = true;
    };
  }, [dispatch, navigate]);

  return <StatusMessage tone="loading" message={t('auth.loggingOut')} className="mt-16" />;
}

export default Logout;
