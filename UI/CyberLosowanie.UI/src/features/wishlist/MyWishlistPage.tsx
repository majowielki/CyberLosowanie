import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { RootState } from '@/app/store';
import { Button } from '@/shared/ui/button';
import { Loading, PageHeader, StatusMessage } from '@/shared/components';
import { useTranslation } from '@/shared/i18n';
import ZoomableCyberekPortrait from '@/features/cyberki/ZoomableCyberekPortrait';
import { useGetCyberekByIdQuery } from '@/features/cyberki/cyberLosowanieApi';
import { extractApiErrorMessage, useGetMyWishlistQuery } from './wishlistApi';
import {
  createEmptyCanvasDocument,
  parseCanvasDocument,
} from './canvas/canvasDocument';
import WishlistEditor from './canvas/WishlistEditor';
import WishlistViewer from './canvas/WishlistViewer';
import { readWishlistDraft } from './canvas/wishlistDraft';
import SendLetterPanel from './SendLetterPanel';

const isConflictError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'status' in error &&
  (error as { status: unknown }).status === 409;

/**
 * /wishlist — my own wishlist. No saved wishlist opens the editor straight
 * away; a saved one shows a read-only preview with an "Edytuj" button (doc 5.1).
 * Without a cyberek there is no wishlist yet, so the user is sent to pick one.
 */
function MyWishlistPage() {
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const cyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const hasCyberek = cyberekId != null;
  // Skipping the request avoids a guaranteed 409 from the backend.
  const { data, isLoading, error } = useGetMyWishlistQuery(undefined, { skip: !hasCyberek });
  // Only for the caption of the enlarged child photo.
  const { data: myCyberekData } = useGetCyberekByIdQuery(cyberekId ?? 0, { skip: !hasCyberek });
  const myName = myCyberekData?.data?.name;
  const [isEditing, setIsEditing] = useState(false);
  // Set once the editor opened for a restored draft is left, so the page falls
  // back to the normal preview/edit flow.
  const [draftHandled, setDraftHandled] = useState(false);

  const saved = data?.data ?? null;
  const parsed = useMemo(
    () => (saved ? parseCanvasDocument(saved.canvasJson) : null),
    [saved],
  );
  // Unsaved changes left in this browser (see wishlistDraft) reopen the editor.
  const draft = useMemo(
    () => (isLoading || draftHandled ? null : readWishlistDraft(cyberekId, saved?.canvasJson ?? null)),
    [isLoading, draftHandled, cyberekId, saved],
  );

  if (!hasCyberek) {
    return <Navigate to="/select-your-cyberek" replace />;
  }

  if (isLoading) {
    return <Loading />;
  }

  if (error) {
    // 409 = no cyberek selected yet — the wishlist belongs to a cyberek. Only
    // reachable when the persisted session is stale (picked on another device).
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

  if (!saved || isEditing || draft) {
    const closeEditor = () => {
      setIsEditing(false);
      setDraftHandled(true);
    };
    return (
      <WishlistEditor
        initialDocument={draft ?? document}
        restoredDraft={draft !== null}
        onExit={saved ? closeEditor : undefined}
        onSaved={closeEditor}
      />
    );
  }

  return (
    <div className="flex w-full max-w-4xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-4">
          {/* The wishlist is a letter to Santa — written by the child version of its owner. */}
          <ZoomableCyberekPortrait
            cyberekId={cyberekId}
            kind="child"
            alt={t('wishlist.my.childAlt')}
            caption={myName ? t('wishlist.childCaption', { name: myName }) : t('wishlist.my.childAlt')}
            className="h-16 w-16 ring-2 ring-cream/80 sm:h-20 sm:w-20"
          />
          <PageHeader
            align="left"
            size="md"
            eyebrow={t('wishlist.letterEyebrow')}
            title={t('wishlist.my.title')}
            subtitle={t('wishlist.my.lastSaved', {
              date: new Date(saved.updatedAtUtc).toLocaleString(
                language === 'pl' ? 'pl-PL' : 'en-GB',
              ),
            })}
          />
        </div>
        <Button onClick={() => setIsEditing(true)}>
          <Pencil aria-hidden /> {t('common.action.edit')}
        </Button>
      </div>
      {parsed && parsed.errors.length > 0 && (
        <p role="alert" className="rounded-xl border border-primary/40 bg-primary/15 px-4 py-3 text-sm text-cream">
          {t('wishlist.my.corruptSaved')}
        </p>
      )}
      <SendLetterPanel wishlist={saved} />
      <WishlistViewer document={document} allowDownload ownerName={myName} ownerCyberekId={cyberekId} />
    </div>
  );
}

export default MyWishlistPage;
