import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { Gift, ScrollText } from "lucide-react";
import { RootState } from "@/app/store";
import { Button } from "@/shared/ui/button";
import LoginOrRegister from "@/features/auth/LoginOrRegister";
import { useGetGiftedWishlistStatusQuery } from "@/features/wishlist/wishlistApi";
import { LanguageSwitcher, useTranslation } from "@/shared/i18n";
import Logo from "./Logo";

// The giftee may update their letter at any time; a light poll keeps the badge
// honest without the Santa having to reload.
const GIFTED_STATUS_POLL_MS = 5 * 60 * 1000;

/** Sticky translucent top bar: brand · language · wishlist · giftee's letter (when logged in) · session. */
function Navbar() {
  // Wishlist is per-participant, so the link only makes sense for a logged-in
  // user — same session source of truth as LoginOrRegister (userAuthStore).
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.userAuthStore.id));
  const hasDrawn = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId != null);
  const { t } = useTranslation();
  // Before the draw there is no giftee, so there is nothing to ask about.
  const { data: giftedStatus } = useGetGiftedWishlistStatusQuery(undefined, {
    skip: !isLoggedIn || !hasDrawn,
    pollingInterval: GIFTED_STATUS_POLL_MS,
    refetchOnMountOrArgChange: true,
  });
  const letterSent = giftedStatus?.data?.isSent === true;
  const hasUnseenChanges = giftedStatus?.data?.hasUnseenChanges === true;
  const giftedLabel = hasUnseenChanges ? t('common.nav.giftedLetterNew') : t('common.nav.giftedLetter');

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
          {isLoggedIn && letterSent && (
            <Button asChild variant="glass" className="relative">
              <Link to="/wishlist/gifted" aria-label={giftedLabel} title={giftedLabel}>
                <Gift aria-hidden />
                <span className="hidden md:inline">{t('common.nav.giftedLetter')}</span>
                {hasUnseenChanges && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-gold ring-2 ring-pine-950"
                  />
                )}
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
