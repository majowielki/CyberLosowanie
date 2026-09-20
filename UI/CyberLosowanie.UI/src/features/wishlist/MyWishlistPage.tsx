import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Loading, PageHeader, StatusMessage } from '@/shared/components';
import { useTranslation } from '@/shared/i18n';
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
  const { t, language } = useTranslation();
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
        <StatusMessage
          message={t('wishlist.my.needCyberekFirst')}
          action={<Button onClick={() => navigate('/select-your-cyberek')}>{t('wishlist.my.pickCyberek')}</Button>}
        />
      );
    }
    return (
      <StatusMessage
        tone="error"
        message={extractApiErrorMessage(error, t('wishlist.loadFailed'))}
        action={<Button variant="glass" onClick={() => navigate('/')}>{t('common.action.goHome')}</Button>}
      />
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
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          align="left"
          size="md"
          title={t('wishlist.my.title')}
          subtitle={t('wishlist.my.lastSaved', {
            date: new Date(saved.updatedAtUtc).toLocaleString(
              language === 'pl' ? 'pl-PL' : 'en-GB',
            ),
          })}
        />
        <Button onClick={() => setIsEditing(true)}>
          <Pencil aria-hidden /> {t('common.action.edit')}
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 && (
        <p role="alert" className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-3 text-sm text-cream">
          {t('wishlist.my.corruptSaved')}
        </p>
      )}
      <WishlistViewer document={document} />
    </div>
  );
}

export default MyWishlistPage;
