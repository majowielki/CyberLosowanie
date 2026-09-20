import { useGetMyGiftedCyberekQuery } from "@/features/cyberki/cyberLosowanieApi";
import { Button } from "@/shared/ui/button";
import { PageHeader, StatusMessage } from "@/shared/components";
import { useNavigate } from "react-router-dom";
import { Gift, ScrollText } from "lucide-react";
import { useTranslation } from "@/shared/i18n";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function FinalPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  // FinalPage always asks backend for the final gifted cyberek; identity comes
  // from the JWT on the request. Backend is the single source of truth.
  const { data, isLoading, error } = useGetMyGiftedCyberekQuery();

  // If we are still loading results from backend, show a loading state
  if (isLoading) {
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
  const cyberekImg = currentCyberek.imageUrl || '';

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <PageHeader
        eyebrow={t('cyberki.final.eyebrow')}
        title={t('cyberki.final.congrats')}
        subtitle={t('cyberki.final.santaFor', { cyberekName })}
      />

      {/* The reveal: portrait in a gold halo, name underneath. */}
      <figure className="flex flex-col items-center gap-5 animate-fade-up">
        {/* The reveal moment: portrait comes into focus (static under reduced motion). */}
        <div className="relative motion-safe:animate-reveal">
          <div aria-hidden className="halo absolute inset-0 -z-10 scale-150 blur-2xl" />
          {cyberekImg ? (
            <img
              src={cyberekImg}
              alt={t('cyberki.final.imageAlt', { cyberekName })}
              className="h-72 w-72 rounded-full object-cover shadow-halo ring-4 ring-cream sm:h-80 sm:w-80"
            />
          ) : (
            <div className="grid h-72 w-72 place-items-center rounded-full bg-white/10 text-cream-muted shadow-halo ring-4 ring-cream sm:h-80 sm:w-80">
              <span className="flex flex-col items-center gap-2 text-sm">
                <Gift className="h-8 w-8" aria-hidden />
                {t('cyberki.final.noImage')}
              </span>
            </div>
          )}
        </div>
        <figcaption className="font-display text-3xl font-medium text-cream sm:text-4xl">
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

export default FinalPage;
