import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Loading, PageHeader, StatusMessage } from '@/shared/components';
import { useTranslation } from '@/shared/i18n';
import { useGetMyGiftedCyberekQuery } from '@/features/cyberki/cyberLosowanieApi';
import ZoomableCyberekPortrait from '@/features/cyberki/ZoomableCyberekPortrait';
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
  const { t } = useTranslation();
  const { data, isLoading, error } = useGetGiftedWishlistQuery();
  // Name and photo of the drawn person come from the existing draw endpoint.
  const { data: giftedCyberekData } = useGetMyGiftedCyberekQuery();
  const giftedName = giftedCyberekData?.data?.name;
  const childAlt = t('wishlist.gifted.childAlt', { name: giftedName ?? t('wishlist.gifted.fallbackPerson') });

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
        <StatusMessage
          message={t('wishlist.gifted.finishDrawFirst')}
          action={<Button onClick={() => navigate('/')}>{t('common.action.goHome')}</Button>}
        />
      );
    }
    return (
      <StatusMessage
        tone="error"
        message={extractApiErrorMessage(error, t('wishlist.loadFailed'))}
        action={<Button variant="glass" onClick={() => navigate('/final-page')}>{t('common.action.back')}</Button>}
      />
    );
  }

  if (!saved) {
    return (
      <StatusMessage
        message={t('wishlist.gifted.notSentYet', {
          name: giftedName ?? t('wishlist.gifted.fallbackPerson'),
        })}
        hint={t('wishlist.gifted.notSentHint')}
        action={
          <Button variant="glass" onClick={() => navigate('/final-page')}>
            <ArrowLeft aria-hidden /> {t('common.action.back')}
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* The wishlist is a letter to Santa — written by the child version of its owner. */}
          <ZoomableCyberekPortrait
            cyberekId={giftedCyberekData?.data?.id}
            kind="child"
            alt={childAlt}
            caption={giftedName ? t('wishlist.childCaption', { name: giftedName }) : childAlt}
            className="h-16 w-16 ring-2 ring-cream/80 sm:h-20 sm:w-20"
          />
          <PageHeader
            align="left"
            size="md"
            eyebrow={t('wishlist.letterEyebrow')}
            title={
              giftedName
                ? t('wishlist.gifted.titleNamed', { name: giftedName })
                : t('wishlist.gifted.titleFallback')
            }
          />
        </div>
        <Button variant="glass" onClick={() => navigate('/final-page')}>
          <ArrowLeft aria-hidden /> {t('common.action.back')}
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 ? (
        <p role="alert" className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-3 text-sm text-cream">
          {t('wishlist.gifted.corrupt')}
        </p>
      ) : (
        parsed?.document && <WishlistViewer document={parsed.document} allowDownload ownerName={giftedName} />
      )}
    </div>
  );
}

export default GiftedWishlistPage;
