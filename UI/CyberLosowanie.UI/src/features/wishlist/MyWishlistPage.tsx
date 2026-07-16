import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Loading } from '@/shared/components';
import { extractApiErrorMessage, useGetMyWishlistQuery } from './wishlistApi';
import {
  createEmptyCanvasDocument,
  parseCanvasDocument,
} from './canvas/canvasDocument';
import WishlistEditor from './canvas/WishlistEditor';
import WishlistViewer from './canvas/WishlistViewer';

const isConflictError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error &&
  (error as { status: unknown }).status === 409;

/**
 * /wishlist — my own wishlist. No saved wishlist opens the editor straight
 * away; a saved one shows a read-only preview with an "Edytuj" button (doc 5.1).
 */
function MyWishlistPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetMyWishlistQuery();
  const [isEditing, setIsEditing] = useState(false);

  const saved = data?.data ?? null;
  const parsed = useMemo(
    () => (saved ? parseCanvasDocument(saved.canvasJson) : null),
    [saved],
  );

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    // 409 = no cyberek selected yet — the wishlist belongs to a cyberek.
    if (isConflictError(error)) {
      return (
        <div className="mt-20 flex flex-col items-center gap-4">
          <p className="text-lg text-white">
            Najpierw wybierz swojego cyberka — wtedy założysz listę życzeń.
          </p>
          <Button onClick={() => navigate('/select-your-cyberek')}>Wybierz cyberka</Button>
        </div>
      );
    }
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <p className="text-lg text-white">
          {extractApiErrorMessage(error, 'Nie udało się wczytać listy życzeń. Spróbuj ponownie.')}
        </p>
        <Button onClick={() => navigate('/')}>Wróć na stronę główną</Button>
      </div>
    );
  }

  // Backend stores only validated documents, so a parse failure means corrupt
  // data — start from an empty canvas instead of blocking the feature.
  const document = parsed?.document ?? createEmptyCanvasDocument();

  if (!saved || isEditing) {
    return (
      <WishlistEditor
        initialDocument={document}
        onExit={saved ? () => setIsEditing(false) : undefined}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-3 py-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Moja lista życzeń</h1>
          <p className="text-sm text-white/80">
            Ostatni zapis: {new Date(saved.updatedAtUtc).toLocaleString('pl-PL')}
          </p>
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Pencil /> Edytuj
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 && (
        <p className="rounded-md bg-red-100 p-3 text-sm text-red-800">
          Nie udało się odczytać zapisanej listy — edycja rozpocznie się od pustego płótna.
        </p>
      )}
      <WishlistViewer document={document} />
    </div>
  );
}

export default MyWishlistPage;
