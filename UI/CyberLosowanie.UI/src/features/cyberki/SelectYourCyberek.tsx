import {
  useGetAvailableToPickQuery,
  useGetCyberkiQuery,
  useAssignCyberekMutation,
} from "@/features/cyberki/cyberLosowanieApi";
import { Button } from "@/shared/ui/button";
import { PageHeader, StatusMessage } from "@/shared/components";
import { RootState } from "@/app/store";
import { setCyberekId } from "@/features/auth/userSlice";
import { useState } from "react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { toast } from "@/shared/hooks/use-toast";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";

// Auth is guaranteed by ProtectedRoute in the router — no auth checks here.
function SelectYourCyberek() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  // The full list keeps the grid stable (everyone always in the same place);
  // the "available" list only decides which portraits can still be picked.
  const { data: allData, isLoading: allLoading, error: allError } = useGetCyberkiQuery();
  const { data, isLoading, error } = useGetAvailableToPickQuery();

  const [assignCyberek] = useAssignCyberekMutation();
  const [loading, setLoading] = useState(false);
  // Two-step pick: tap a portrait to highlight it, then confirm once. Keeps a
  // mis-tap on the grid from committing the (irreversible) choice.
  const [selectedId, setSelectedId] = useState<number | null>(null);

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
    return <StatusMessage tone="loading" message={t('cyberki.select.selecting')} />;
  }

  if (isLoading || allLoading) {
    return <StatusMessage tone="loading" message={t('cyberki.select.loading')} />;
  }

  if (error || allError) {
    return (
      <StatusMessage
        tone="error"
        message={t('cyberki.select.loadError')}
        action={<Button onClick={() => window.location.reload()}>{t('common.action.retry')}</Button>}
      />
    );
  }

  if (!data?.data?.length) {
    return (
      <StatusMessage
        message={t('cyberki.select.empty')}
        hint={t('cyberki.select.emptyHint')}
        action={<Button variant="glass" onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
      />
    );
  }

  const availableIds = new Set(data.data.map((cyberek) => cyberek.id));
  // Fall back to the available list if the full list is missing for any reason.
  const cyberki = allData?.data?.length ? allData.data : data.data;
  const selected = cyberki.find((cyberek) => cyberek.id === selectedId && availableIds.has(cyberek.id)) ?? null;

  return (
    <div className="flex w-full flex-col items-center gap-8">
      <PageHeader
        eyebrow={t('common.step.indicator', { current: 1, total: 2 })}
        title={t('cyberki.select.title')}
        subtitle={t('cyberki.select.subtitle')}
      />

      {/* Portrait grid — everyone visible at once, one tap to highlight. */}
      <ul
        role="radiogroup"
        aria-label={t('cyberki.select.title')}
        className="grid w-full max-w-5xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-5"
      >
        {cyberki.map((cyberek) => {
          const isTaken = !availableIds.has(cyberek.id);
          const isSelected = !isTaken && cyberek.id === selectedId;
          return (
            <li key={cyberek.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-disabled={isTaken}
                disabled={isTaken}
                title={isTaken ? t('cyberki.select.taken') : undefined}
                onClick={() => setSelectedId(cyberek.id)}
                className={cn(
                  'group flex w-full flex-col items-center gap-2 rounded-2xl p-2 text-center transition-all duration-200',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isSelected && 'glass border-gold/60 bg-white/10',
                  !isSelected && !isTaken && 'hover:bg-white/[0.06]',
                  isTaken && 'cursor-not-allowed opacity-45 saturate-50',
                )}
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-xl bg-secondary">
                  <img
                    src={cyberek.imageUrl}
                    alt={t('cyberki.select.imageAlt', { name: cyberek.name })}
                    className={cn(
                      'h-full w-full object-cover transition-transform duration-300',
                      isSelected && 'scale-105',
                      !isSelected && !isTaken && 'group-hover:scale-105',
                    )}
                  />
                  {isTaken && (
                    <span className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                      <Lock className="h-3 w-3" aria-hidden />
                      {t('cyberki.select.taken')}
                    </span>
                  )}
                  {isSelected && (
                    <>
                      <span className="absolute inset-0 rounded-xl ring-4 ring-inset ring-gold" aria-hidden />
                      <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-gold text-pine-950 shadow" aria-hidden>
                        <Check className="h-4 w-4" />
                      </span>
                    </>
                  )}
                </span>
                <span
                  className={cn(
                    'font-display text-base font-medium leading-tight sm:text-lg',
                    isSelected ? 'text-gold' : isTaken ? 'text-cream-muted' : 'text-cream',
                  )}
                >
                  {cyberek.name}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Sticky confirm bar: always reachable, names the current pick. */}
      <div className="sticky bottom-4 z-10 flex w-full max-w-md items-center justify-center">
        <Button
          size="lg"
          className="w-full"
          disabled={!selected}
          onClick={async () => {
            if (!selected) {
              return;
            }
            await handleSelect(selected.id);
            navigate(userHasGiftedCyberekId != null ? "/final-page" : "/choose-to-be-gifted-cyberek");
          }}
        >
          <Check aria-hidden />
          {selected
            ? t('cyberki.select.confirmNamed', { name: selected.name })
            : t('cyberki.select.confirm')}
        </Button>
      </div>
    </div>
  )
}
  export default SelectYourCyberek;
