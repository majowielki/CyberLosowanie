import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserRoundPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { RootState, persistor } from "@/app/store";
import { resetUser } from "@/features/auth/userSlice";
import { useTranslation } from "@/shared/i18n";
import { tokenUtils } from "./tokenUtils";

/** Session controls for the navbar: sign in / register, or log out. */
const LoginOrRegister = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userAuthStore.id);
  const { t } = useTranslation();

  const handleLogout = async () => {
    // Single-source logout (H3/S6): drop the token, reset runtime state and
    // purge its persisted copy — nothing else stores session data.
    tokenUtils.clearAuthData();
    dispatch(resetUser());
    await persistor.purge();

    navigate("/");
  };

  if (user) {
    return (
      // Icon-only on phones; aria-label keeps the accessible name either way.
      <Button variant="glass" onClick={handleLogout} aria-label={t('auth.logout')} title={t('auth.logout')}>
        <LogOut aria-hidden />
        <span className="hidden sm:inline">{t('auth.logout')}</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="glass"
        onClick={() => navigate("/register")}
        aria-label={t('auth.register.submit')}
        title={t('auth.register.submit')}
      >
        <UserRoundPlus aria-hidden />
        <span className="hidden sm:inline">{t('auth.register.submit')}</span>
      </Button>
      <Button onClick={() => navigate("/login")}>
        <LogIn aria-hidden />
        {t('auth.signIn')}
      </Button>
    </div>
  );
};
export default LoginOrRegister;
