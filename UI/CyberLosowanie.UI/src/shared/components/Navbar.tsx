import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { ScrollText } from "lucide-react";
import { RootState } from "@/app/store";
import { Button } from "@/shared/ui/button";
import LoginOrRegister from "@/features/auth/LoginOrRegister";
import { LanguageSwitcher, useTranslation } from "@/shared/i18n";
import Logo from "./Logo";

/** Sticky translucent top bar: brand · language · wishlist (when logged in) · session. */
function Navbar() {
  // Wishlist is per-participant, so the link only makes sense for a logged-in
  // user — same session source of truth as LoginOrRegister (userAuthStore).
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.userAuthStore.id));
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-40 border-b border-white/10 bg-pine-950/60 backdrop-blur-md">
      <div className="align-element flex h-16 items-center justify-between gap-4">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          {isLoggedIn && (
            <Button asChild variant="glass">
              {/* Icon-only on phones; aria-label keeps the accessible name either way. */}
              <Link to="/wishlist" aria-label={t('common.nav.wishlist')} title={t('common.nav.wishlist')}>
                <ScrollText aria-hidden />
                <span className="hidden sm:inline">{t('common.nav.wishlist')}</span>
              </Link>
            </Button>
          )}
          <LoginOrRegister />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
