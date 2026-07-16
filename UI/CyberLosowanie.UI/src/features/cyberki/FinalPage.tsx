import { useGetMyGiftedCyberekQuery } from "@/features/cyberki/cyberLosowanieApi";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { useNavigate } from "react-router-dom";
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
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.final.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.final.loadError')}</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          {t('common.action.goHome')}
        </Button>
      </div>
    );
  }

  // Use fresh API data; if unavailable, show an error state
  const currentCyberek = data?.data;

  if (!currentCyberek) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.final.missing')}</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          {t('common.action.goHome')}
        </Button>
      </div>
    );
  }

  const cyberekName = currentCyberek.name || t('cyberki.final.unknownName');
  const cyberekImg = currentCyberek.imageUrl || '';

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">{t('cyberki.final.congrats')}</h1>
      <h2 className="text-2xl font-extrabold text-white mb-10">{t('cyberki.final.santaFor', { cyberekName })}</h2>
          <Card>
            <CardContent className="p-4 flex flex-col items-center">
              {cyberekImg ? (
                <img src={cyberekImg} alt={t('cyberki.final.imageAlt', { cyberekName })} className="w-full h-80 rounded-md object-cover" />
              ) : (
                <div className="w-full h-80 bg-gray-200 rounded-md flex items-center justify-center">
                  <span className="text-gray-500">{t('cyberki.final.noImage')}</span>
                </div>
              )}
            </CardContent>
          </Card>
          <Button className="mt-6" onClick={() => navigate("/wishlist/gifted")}>
            {t('cyberki.final.viewWishlist', { cyberekName })}
          </Button>
    </div>
  );
}

export default FinalPage;
