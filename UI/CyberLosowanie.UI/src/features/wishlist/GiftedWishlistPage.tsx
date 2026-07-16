import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Loading } from '@/shared/components';
import { useGetMyGiftedCyberekQuery } from '@/features/cyberki/cyberLosowanieApi';
import { extractApiErrorMessage, useGetGiftedWishlistQuery } from './wishlistApi';
import { parseCanvasDocument } from './canvas/canvasDocument';
import WishlistViewer from './canvas/WishlistViewer';

const isConflictError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error &&
  (error as { status: unknown }).status === 409;

/**
 * /wishlist/gifted — read-only wishlist of the person I drew (decision D3:
 * visible only to the owner and their Santa). Reached from the final page.
 */
function GiftedWishlistPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetGiftedWishlistQuery();
  // Name and photo of the drawn person come from the existing draw endpoint.
  const { data: giftedCyberekData } = useGetMyGiftedCyberekQuery();
  const giftedName = giftedCyberekData?.data?.name;

  const saved = data?.data ?? null;
  const parsed = useMemo(
    () => (saved ? parseCanvasDocument(saved.canvasJson) : null),
    [saved],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    // 409 = the caller has not completed the draw yet.
    if (isConflictError(error)) {
      return (
        <div className="mt-20 flex flex-col items-center gap-4">
          <p className="text-lg text-white">
            Najpierw dokończ losowanie — potem zobaczysz listę życzeń wylosowanej osoby.
          </p>
          <Button onClick={() => navigate('/')}>Wróć na stronę główną</Button>
        </div>
      );
    }
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <p className="text-lg text-white">
          {extractApiErrorMessage(error, 'Nie udało się wczytać listy życzeń. Spróbuj ponownie.')}
        </p>
        <Button onClick={() => navigate('/final-page')}>Wróć</Button>
      </div>
    );
  }

  if (!saved) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <p className="text-lg text-white">
          {giftedName ?? 'Ta osoba'} nie zapisał(a) jeszcze swojej listy życzeń.
        </p>
        <Button onClick={() => navigate('/final-page')}>
          <ArrowLeft /> Wróć
        </Button>
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-white">
          Lista życzeń {giftedName ?? 'wylosowanej osoby'}
        </h1>
        <Button variant="secondary" onClick={() => navigate('/final-page')}>
          <ArrowLeft /> Wróć
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 ? (
        <p className="rounded-md bg-red-100 p-3 text-sm text-red-800">
          Nie udało się odczytać tej listy życzeń.
        </p>
      ) : (
        parsed?.document && <WishlistViewer document={parsed.document} />
      )}
    </div>
  );
}

export default GiftedWishlistPage;
