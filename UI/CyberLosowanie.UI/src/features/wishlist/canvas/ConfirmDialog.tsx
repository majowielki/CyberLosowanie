import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { useTranslation } from '@/shared/i18n';

/** A pending destructive action: what to ask and what to run on confirm. */
export interface PendingConfirmation {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
}

interface ConfirmDialogProps {
  pending: PendingConfirmation | null;
  onClose: () => void;
}

/**
 * In-app confirmation for destructive editor actions (clear page, delete
 * page). Replaces window.confirm, which embedded browsers may suppress —
 * the action then silently never ran.
 */
function ConfirmDialog({ pending, onClose }: ConfirmDialogProps) {
  const { t } = useTranslation();

  return (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && onClose()}>
      {pending && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pending.title}</AlertDialogTitle>
            <AlertDialogDescription>{pending.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('wishlist.confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pending.onConfirm();
                onClose();
              }}
            >
              {pending.confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

export default ConfirmDialog;
