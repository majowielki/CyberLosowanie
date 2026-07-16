import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import CyberLosowanieClosed from "@/assets/CyberLosowanieClosed.svg";
import CyberLosowanieOpen from "@/assets/CyberLosowanieOpen.svg";
import { useDispatch } from "react-redux";
import {
  useGetCyberkiQuery,
  useGetAvailableGiftTargetsQuery,
  useAssignGiftedCyberekMutation,
} from "@/features/cyberki/cyberLosowanieApi";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { setGiftedCyberekId } from "@/features/auth/userSlice";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function ChooseToBeGiftedCyberek() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [assignGiftedCyberek] = useAssignGiftedCyberekMutation();

  // Boxes = all cyberki (box k hides cyberek k); the count comes from the API, never
  // hardcoded. Available = boxes the server guarantees are safe to open for THIS user
  // (free, not banned, and nobody else ends up stranded).
  const { data: cyberkiData, isLoading: cyberkiLoading } = useGetCyberkiQuery();
  const {
    data: targetsData,
    isLoading: targetsLoading,
    refetch: refetchTargets,
  } = useGetAvailableGiftTargetsQuery();
  const [loading, setLoading] = useState(false);

  const boxIds = (cyberkiData?.data ?? []).map((c) => c.id).sort((a, b) => a - b);
  const availableIds = new Set(targetsData?.data ?? []);

  // The user's pick IS the draw: send the chosen box id; the server re-validates it
  // in a serialized transaction. 409 = somebody just took this box (or it became
  // unsafe) — refresh the list and let the user pick again.
  const handleSelect = async (giftedCyberekId: number) => {
    setLoading(true);

    try {
      const response = await assignGiftedCyberek({ giftedCyberekId }).unwrap();

      debugLog("assignGiftedCyberek response", response);

      if (response.data) {
        dispatch(setGiftedCyberekId(response.data));
      }

      navigate("/final-page");
    } catch (error) {
      debugLog("Failed to assign gifted cyberek:", error);

      const status = (error as { status?: number })?.status;
      if (status === 409) {
        toast({
          description: t('cyberki.choose.boxTaken'),
          variant: "destructive",
        });
        refetchTargets();
      } else {
        toast({
          description: t('cyberki.select.fail'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-white text-lg">{t('cyberki.choose.processing')}</div>
      </div>
    );
  }

  if (cyberkiLoading || targetsLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-white text-lg">{t('cyberki.choose.loading')}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-extrabold text-white mb-10 mt-10">{t('cyberki.choose.title')}</h1>
      <div className="grid grid-cols-1 mb-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {boxIds.map((boxId) => (
          <Card key={`gift-box-${boxId}`} className="bg-transparent border-2 border-white">
            <CardContent className="p-4 flex flex-col items-center">
              {availableIds.has(boxId) ? (
                <>
                  <img src={CyberLosowanieClosed} alt={t('cyberki.choose.closedBoxAlt', { boxId })} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" onClick={() => handleSelect(boxId)}>
                    {t('cyberki.choose.select')}
                  </Button>
                </>
              ) : (
                <>
                  <img src={CyberLosowanieOpen} alt={t('cyberki.choose.openBoxAlt', { boxId })} className="w-full h-64 md:h-48 rounded-md object-cover mb-4" />
                  <Button className="text-xl font-semibold capitalize" disabled>{t('cyberki.choose.selected')}</Button>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default ChooseToBeGiftedCyberek;
