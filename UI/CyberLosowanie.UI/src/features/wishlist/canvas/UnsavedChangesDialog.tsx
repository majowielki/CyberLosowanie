import { Loader2, Save } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/i18n';

interface UnsavedChangesDialogProps {
  open: boolean;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/**
 * Confirmation shown when the user tries to leave the editor with unsaved
 * changes (Back button or in-app navigation, via useBlocker). Offers save,
 * discard, or stay — unlike the native beforeunload prompt, which the browser
 * renders itself and does not allow custom buttons.
 */
function UnsavedChangesDialog({
  open,
  isSaving,
  onSave,
  onDiscard,
  onCancel,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="unsaved-changes-title"
    >
      <div className="w-[min(92vw,480px)] rounded-2xl bg-white p-5 text-card-foreground shadow-xl">
        <h2 id="unsaved-changes-title" className="text-lg font-bold text-gray-900">
          {t('wishlist.unsaved.title')}
        </h2>
        <p className="mt-2 text-sm text-gray-600">{t('wishlist.unsaved.body')}</p>
        {/* Stacked on narrow screens, one row from sm up — never a ragged wrap. */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isSaving}>
            {t('wishlist.unsaved.cancel')}
          </Button>
          <Button type="button" variant="destructive" onClick={onDiscard} disabled={isSaving}>
            {t('wishlist.unsaved.discard')}
          </Button>
          {/* While the request is in flight every button is disabled (it cannot be
              aborted), so the label has to say what is happening. */}
          <Button type="button" onClick={onSave} disabled={isSaving} className="sm:min-w-44">
            {isSaving ? <Loader2 className="animate-spin" /> : <Save />}
            {isSaving ? t('wishlist.unsaved.saving') : t('wishlist.unsaved.saveAndLeave')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default UnsavedChangesDialog;
