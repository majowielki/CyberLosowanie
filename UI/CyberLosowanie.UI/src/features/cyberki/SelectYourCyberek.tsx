import { useGetAvailableToPickQuery, useAssignCyberekMutation } from "@/features/cyberki/cyberLosowanieApi";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/shared/ui/carousel";
import { RootState } from "@/app/store";
import { setCyberekId } from "@/features/auth/userSlice";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function SelectYourCyberek() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  const { data, isLoading, error } = useGetAvailableToPickQuery();

  const [assignCyberek] = useAssignCyberekMutation();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (cyberekId: number) => {
    setLoading(true);

    try {
      // Identity comes from the JWT on the request — no userName in the payload.
      await assignCyberek({ cyberekId }).unwrap();

      dispatch(setCyberekId(cyberekId));
      toast({ description: t('cyberki.select.success') });
    } catch (error) {
      debugLog("Failed to assign cyberek:", error);
      toast({
        description: t('cyberki.select.fail'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.select.selecting')}</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.select.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.select.loadError')}</div>
        <Button onClick={() => window.location.reload()} className="mt-4">
          {t('common.action.retry')}
        </Button>
      </div>
    );
  }

  if (!data?.data?.length) {
    return (
      <div className="flex flex-col items-center justify-center mt-20">
        <div className="text-white text-lg">{t('cyberki.select.empty')}</div>
        <div className="text-white text-sm mt-2">{t('cyberki.select.emptyHint')}</div>
        <Button onClick={() => navigate("/")} className="mt-4">
          {t('common.action.goHome')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center mt-20">
      <h1 className="text-4xl font-extrabold text-white mb-10">{t('cyberki.select.title')}</h1>
      <p className="text-white text-center mb-6">{t('cyberki.select.subtitle')}</p>
      <Carousel className="w-full max-w-xs">
        <CarouselContent>
          {(data.data || []).map((cyberek, index) => (
            <CarouselItem key={index}>
                <Card>
                <CardContent className="p-2 flex flex-col items-center">
                  <span className="text-black text-lg font-semibold mb-2">{cyberek.name}</span>
                  <img src={cyberek.imageUrl} alt={t('cyberki.select.imageAlt', { name: cyberek.name })} className="w-full h-[24rem] rounded-md object-cover mb-4" />
                  <Button
                    className="px-4 py-2 mb-2"
                    onClick={async () => {
                      await handleSelect(cyberek.id);
                      navigate(userHasGiftedCyberekId != null ? "/final-page" : "/choose-to-be-gifted-cyberek");
                    }}
                  >
                    {t('cyberki.select.confirm')}
                  </Button>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  )
}
  export default SelectYourCyberek;
