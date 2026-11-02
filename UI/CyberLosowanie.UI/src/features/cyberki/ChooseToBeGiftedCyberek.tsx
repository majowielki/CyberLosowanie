import { Button } from "@/shared/ui/button";
import { PageHeader, StatusMessage } from "@/shared/components";
import { cn } from "@/shared/lib/utils";
import { Gift, PackageOpen } from "lucide-react";
import boxClosed from "@/assets/gift-box-closed.webp";
import boxOpen from "@/assets/gift-box-open.webp";
import { useDispatch } from "react-redux";
import {
  useGetCyberkiQuery,
  useGetAvailableGiftTargetsQuery,
  useAssignGiftedCyberekMutation,
  useLazyGetMyGiftedCyberekQuery,
} from "@/features/cyberki/cyberLosowanieApi";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setGiftedCyberekId } from "@/features/auth/userSlice";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";
import { canPlayFilm, isEffectEnabled, prefetchWhenIdle } from "@/shared/motion/cinematic";
import { primeSound } from "@/shared/motion/sound";
import { GIFT_FILM, JustDrawnState, giftFilmSrc } from "./giftFilm";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function ChooseToBeGiftedCyberek() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const [assignGiftedCyberek] = useAssignGiftedCyberekMutation();
  const [fetchMyGiftedCyberek] = useLazyGetMyGiftedCyberekQuery();

  // Boxes = all cyberki (box k hides cyberek k); the count comes from the API, never
  // hardcoded. Available = boxes the server guarantees are safe to open for THIS user
  // (free, not banned, and nobody else ends up stranded).
  const { data: cyberkiData, isLoading: cyberkiLoading } = useGetCyberkiQuery();
  // Always a fresh list on arrival: the boxes reflect the server's state now,
  // not what this browser saw earlier.
  const {
    data: targetsData,
    isFetching: targetsLoading,
    refetch: refetchTargets,
  } = useGetAvailableGiftTargetsQuery(undefined, { refetchOnMountOrArgChange: true });
  // The box being drawn right now (null = idle); it shakes while the request runs.
  const [openingBoxId, setOpeningBoxId] = useState<number | null>(null);
  const loading = openingBoxId !== null;
  const boxRefs = useRef(new Map<number, HTMLElement>());
  const shake = isEffectEnabled("giftShake");

  // Warm the cache with the gift film while the user looks at the boxes, so it
  // starts at once after a successful draw.
  useEffect(() => {
    if (!canPlayFilm("giftFilm")) {
      return;
    }
    const urls = [giftFilmSrc(), GIFT_FILM.poster];
    if (isEffectEnabled("giftSound")) {
      urls.push(GIFT_FILM.sound);
    }
    return prefetchWhenIdle(urls);
  }, []);

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

  // Any other failure leaves the outcome open: the draw may have been committed
  // even though the answer never arrived (dropped connection, a retried request),
  // or this account already drew in another tab. Ask the server, never guess —
  // if it holds a result, show that one.
  const showDrawIfAlreadyMade = async (): Promise<boolean> => {
    const mine = await fetchMyGiftedCyberek().unwrap().catch(() => null);
    const drawn = mine?.data;
    if (!drawn) {
      return false;
    }
    dispatch(setGiftedCyberekId(drawn.id));
    navigate("/final-page");
    return true;
  };

  // The user's pick IS the draw: send the chosen box id; the server re-validates it
  // in a serialized transaction. 409 = somebody just took this box (or it became
  // unsafe) — refresh the list and let the user pick again.
  const handleSelect = async (giftedCyberekId: number) => {
    setOpeningBoxId(giftedCyberekId);
    const playFilm = canPlayFilm("giftFilm");
    // Inside the tap: unlock the sound for later (mobile browsers need a gesture).
    if (playFilm && isEffectEnabled("giftSound")) {
      primeSound(GIFT_FILM.sound);
    }

    try {
      const response = await assignGiftedCyberek({ giftedCyberekId }).unwrap();

      debugLog("assignGiftedCyberek response", response);

      if (response.data) {
        dispatch(setGiftedCyberekId(response.data));
      }

      // Only a successful draw plays the film; the final page reads this state once.
      const rect = boxRefs.current.get(giftedCyberekId)?.getBoundingClientRect();
      const state: JustDrawnState | undefined = playFilm
        ? {
            justDrawn: true,
            boxRect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
          }
        : undefined;
      navigate("/final-page", state ? { state } : undefined);
    } catch (error) {
      debugLog("Failed to assign gifted cyberek:", error);

      const status = (error as { status?: number })?.status;
      if (status === 409) {
        toast({
          description: t('cyberki.choose.boxTaken'),
          variant: "destructive",
        });
        refetchTargets();
      } else if (!(await showDrawIfAlreadyMade())) {
        toast({
          description: t('cyberki.select.fail'),
          variant: "destructive",
        });
        refetchTargets();
      }
    } finally {
      setOpeningBoxId(null);
    }
  };

  // Without the shake effect the old full-page loading panel stays.
  if (loading && !shake) {
    return <StatusMessage tone="loading" message={t('cyberki.choose.processing')} />;
  }

  if (cyberkiLoading || targetsLoading || targetsData?.data?.length === 0) {
    return <StatusMessage tone="loading" message={t('cyberki.choose.loading')} />;
  }

  return (
    <div className="flex w-full flex-col items-center gap-10" aria-busy={loading || undefined}>
      {loading && (
        <p className="sr-only" role="status">
          {t('cyberki.choose.opening', { boxId: openingBoxId })}
        </p>
      )}
      <PageHeader
        eyebrow={t('common.step.indicator', { current: 2, total: 2 })}
        title={t('cyberki.choose.title')}
        subtitle={t('cyberki.choose.subtitle')}
      />
      <ul className="grid w-full max-w-5xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {boxIds.map((boxId) => {
          const available = availableIds.has(boxId);
          const opening = openingBoxId === boxId;
          return (
            <li
              key={`gift-box-${boxId}`}
              className={cn(
                'glass group flex flex-col items-center gap-3 p-3 text-center transition-all duration-300 sm:p-4',
                available
                  ? 'hover:-translate-y-1 hover:border-gold/40'
                  : 'opacity-60 saturate-50',
                opening && 'border-gold/60',
                loading && !opening && 'opacity-50',
              )}
            >
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-cream-muted">
                {t('cyberki.choose.boxLabel', { boxId })}
              </span>
              {/* 640 px WebP crops of the original box art (the old SVGs were 2.6 MB each). */}
              <span
                ref={(element) => {
                  if (element) boxRefs.current.set(boxId, element);
                  else boxRefs.current.delete(boxId);
                }}
                className="block aspect-square w-full overflow-hidden"
              >
                <img
                  src={available ? boxClosed : boxOpen}
                  width={640}
                  height={640}
                  decoding="async"
                  alt={t(available ? 'cyberki.choose.closedBoxAlt' : 'cyberki.choose.openBoxAlt', { boxId })}
                  className={cn(
                    'h-full w-full object-contain drop-shadow-[0_16px_24px_rgba(0,0,0,0.45)] transition-transform duration-300',
                    available && !loading && 'group-hover:scale-[1.06]',
                    opening && 'animate-gift-shake',
                  )}
                />
              </span>
              {available ? (
                <Button className="w-full" disabled={loading} onClick={() => handleSelect(boxId)}>
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
