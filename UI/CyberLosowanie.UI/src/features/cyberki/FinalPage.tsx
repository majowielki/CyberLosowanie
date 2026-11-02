import { useGetMyGiftedCyberekQuery } from "@/features/cyberki/cyberLosowanieApi";
import { Button } from "@/shared/ui/button";
import { PageHeader, StatusMessage } from "@/shared/components";
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Gift, ScrollText } from "lucide-react";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { canPlayFilm } from "@/shared/motion/cinematic";
import CyberekPortrait from "./CyberekPortrait";
import GiftRevealFilm from "./GiftRevealFilm";
import { isJustDrawnState } from "./giftFilm";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function FinalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // FinalPage always asks backend for the final gifted cyberek; identity comes
  // from the JWT on the request. Backend is the single source of truth: every
  // visit refetches, and nothing is shown until that fresh answer is in — a
  // cached result (an older request) is never presented as the draw.
  const { data, isFetching, error } = useGetMyGiftedCyberekQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  // The gift film plays only right after a successful draw (router state from
  // the boxes page). The state is dropped at once, so a refresh, the menu or
  // any later visit shows the plain reveal.
  const location = useLocation();
  const [film, setFilm] = useState(() =>
    isJustDrawnState(location.state) && canPlayFilm('giftFilm')
      ? { boxRect: location.state.boxRect ?? null }
      : null,
  );
  // False while the film covers the page: the portrait waits for its reveal.
  const [revealReady, setRevealReady] = useState(film === null);
  const headingRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isJustDrawnState(location.state)) {
      navigate(location.pathname, { replace: true, state: null });
    }
    // Once, on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filmOverlay = film && (
    <GiftRevealFilm
      fromRect={film.boxRect}
      onReveal={() => setRevealReady(true)}
      onClose={() => {
        setFilm(null);
        headingRef.current?.focus({ preventScroll: true });
      }}
    />
  );

  // The film keeps one place in the tree whatever the page shows under it —
  // moving it between the loading and the result markup would remount it and
  // play it a second time when a slow answer arrives.
  return (
    <>
      {filmOverlay}
      {renderContent()}
    </>
  );

  function renderContent() {
    if (isFetching) {
      return <StatusMessage tone="loading" message={t('cyberki.final.loading')} />;
    }

    if (error) {
      return (
        <StatusMessage
          tone="error"
          message={t('cyberki.final.loadError')}
          action={<Button variant="glass" onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
        />
      );
    }

    // Use fresh API data; if unavailable, show an error state
    const currentCyberek = data?.data;

    if (!currentCyberek) {
      return (
        <StatusMessage
          tone="error"
          message={t('cyberki.final.missing')}
          action={<Button variant="glass" onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
        />
      );
    }

    const cyberekName = currentCyberek.name || t('cyberki.final.unknownName');

    return (
      <div className="flex w-full flex-col items-center gap-10">
        {/* Focus lands here when the film closes, so the result is read out next. */}
        <div ref={headingRef} tabIndex={-1} className="outline-none">
          <PageHeader
            eyebrow={t('cyberki.final.eyebrow')}
            title={t('cyberki.final.congrats')}
            subtitle={t('cyberki.final.santaFor', { cyberekName })}
          />
        </div>

        {/* The reveal: portrait in a gold halo, name underneath. */}
        <figure className={cn('flex flex-col items-center gap-5', revealReady ? 'animate-fade-up' : 'opacity-0')}>
          {/* The reveal moment: portrait comes into focus (static under reduced motion). */}
          <div className={cn('relative', revealReady && 'motion-safe:animate-reveal')}>
            <div aria-hidden className="halo absolute inset-0 -z-10 scale-125 blur-2xl sm:scale-150" />
            {/* The caricature: exaggerated features make the drawn person obvious at a glance. */}
            <CyberekPortrait
              cyberekId={currentCyberek.id}
              kind="caricature"
              alt={t('cyberki.final.imageAlt', { cyberekName })}
              className="h-72 w-72 rounded-full object-cover shadow-halo ring-4 ring-cream sm:h-80 sm:w-80"
              fallback={
                <span className="flex flex-col items-center gap-2 text-sm">
                  <Gift className="h-8 w-8" aria-hidden />
                  {t('cyberki.final.noImage')}
                </span>
              }
            />
          </div>
          <figcaption className="font-display text-3xl font-semibold text-cream sm:text-4xl">
            {cyberekName}
          </figcaption>
        </figure>

        <div className="flex flex-col items-center gap-3">
          <Button size="lg" onClick={() => navigate("/wishlist/gifted")}>
            <ScrollText aria-hidden />
            {t('cyberki.final.viewWishlist', { cyberekName })}
          </Button>
          <p className="text-sm text-cream-muted">{t('cyberki.final.secretHint')}</p>
        </div>
      </div>
    );
  }
}

export default FinalPage;
