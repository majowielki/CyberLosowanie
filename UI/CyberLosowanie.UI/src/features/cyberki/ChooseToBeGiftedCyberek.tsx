import { Button } from "@/shared/ui/button";
import { PageHeader, StatusMessage } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import { Gift, PackageOpen } from "lucide-react";
import CyberLosowanieClosed from "@/assets/CyberLosowanieClosed.svg";
import CyberLosowanieOpen from "@/assets/CyberLosowanieOpen.svg";
import { useDispatch } from "react-redux";
import {
  useGetCyberkiQuery,
  useGetAvailableGiftTargetsQuery,
  useAssignGiftedCyberekMutation,
} from "@/features/cyberki/cyberLosowanieApi";
import { useEffect, useState } from "react";
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

  // Routing onto this page relies on the client's persisted giftedCyberekId flag,
  // which can go stale (another device/tab completed the draw for this account).
  // The backend guarantees GetSafeTargets is never empty for someone who hasn't
  // drawn yet (Hall's-condition matching), so a successfully loaded, empty target
  // list here can only mean the flag was wrong and this user already has a gift
  // assigned. Self-heal by sending them to the real result — no extra request,
  // this reuses the data the page already fetched.
  useEffect(() => {
    if (!targetsLoading && targetsData && targetsData.data?.length === 0) {
      toast({ description: t('cyberki.choose.alreadyAssigned') });
      navigate("/final-page");
    }
  }, [targetsLoading, targetsData, navigate, t]);

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
    return <StatusMessage tone="loading" message={t('cyberki.choose.processing')} />;
  }

  if (cyberkiLoading || targetsLoading || targetsData?.data?.length === 0) {
    return <StatusMessage tone="loading" message={t('cyberki.choose.loading')} />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-10">
      <PageHeader
        eyebrow={t('common.step.indicator', { current: 2, total: 2 })}
        title={t('cyberki.choose.title')}
        subtitle={t('cyberki.choose.subtitle')}
      />
      <ul className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {boxIds.map((boxId) => {
          const available = availableIds.has(boxId);
          return (
            <li
              key={`gift-box-${boxId}`}
              className={cn(
                'glass group flex flex-col items-center gap-3 p-3 text-center transition-all duration-300 sm:p-4',
                available
                  ? 'hover:-translate-y-1 hover:border-gold/40'
                  : 'opacity-60 saturate-50',
              )}
            >
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cream-muted">
                {t('cyberki.choose.boxLabel', { boxId })}
              </span>
              {/* The box SVGs carry wide transparent padding — crop by scaling inside a square frame. */}
              <span className="block aspect-square w-full overflow-hidden">
                <img
                  src={available ? CyberLosowanieClosed : CyberLosowanieOpen}
                  alt={t(available ? 'cyberki.choose.closedBoxAlt' : 'cyberki.choose.openBoxAlt', { boxId })}
                  className={cn(
                    'h-full w-full scale-[1.6] object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)] transition-transform duration-300',
                    available && 'group-hover:scale-[1.7]',
                  )}
                />
              </span>
              {available ? (
                <Button className="w-full" onClick={() => handleSelect(boxId)}>
                  <Gift aria-hidden />
                  {t('cyberki.choose.select')}
                </Button>
              ) : (
                <span className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-semibold text-cream-muted">
                  <PackageOpen className="h-4 w-4" aria-hidden />
                  {t('cyberki.choose.selected')}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default ChooseToBeGiftedCyberek;
