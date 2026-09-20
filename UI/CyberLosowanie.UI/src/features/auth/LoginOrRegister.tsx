import { useNavigate } from "react-router-dom";
import { LogIn, LogOut, UserRoundPlus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useTranslation } from "@/shared/i18n";

/** Session controls for the navbar: sign in / register, or log out. */
const LoginOrRegister = () => {
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.userAuthStore.id);
  const { t } = useTranslation();

  if (user) {
    return (
      // Logging out is a navigation (see features/auth/Logout) so an editor
      // with unsaved changes can intercept it. Icon-only on phones; aria-label
      // keeps the accessible name either way.
      <Button
        variant="glass"
        onClick={() => navigate("/logout")}
        aria-label={t('auth.logout')}
        title={t('auth.logout')}
      >
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
