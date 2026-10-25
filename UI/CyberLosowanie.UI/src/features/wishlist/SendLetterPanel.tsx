import { useRef, useState } from 'react';
import { BellRing, Loader2, MailCheck, Send } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { toast } from '@/shared/hooks/use-toast';
import { useTranslation } from '@/shared/i18n';
import { wishlistModel } from '@/types';
import { isEffectEnabled } from '@/shared/motion/cinematic';
import { extractApiErrorMessage, useSendMyWishlistMutation } from './wishlistApi';
import LetterFlight, { NotifyFlight } from './LetterFlight';
import { captureLetterThumbnail } from './letterThumbnail';

// Mirrors backend WishlistConstants.MAX_SANTA_NOTE_LENGTH.
const MAX_NOTE_LENGTH = 300;

/**
 * "Send letter to Santa" under my saved wishlist. Before the first send the list
 * is a private draft; afterwards every save is visible to Santa immediately and
 * the button turns into an optional "tell Santa about changes" (available
 * after every new save).
 */
function SendLetterPanel({ wishlist }: { wishlist: wishlistModel }) {
  const { t, language } = useTranslation();
  const [sendMyWishlist, { isLoading }] = useSendMyWishlistMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [note, setNote] = useState('');

  const locale = language === 'pl' ? 'pl-PL' : 'en-GB';
  const isSent = Boolean(wishlist.sentAtUtc);
  const lastNotification = wishlist.lastNotificationAtUtc ? new Date(wishlist.lastNotificationAtUtc) : null;
  const hasChanges = !lastNotification || new Date(wishlist.updatedAtUtc) > lastNotification;
  const canSend = !isSent || hasChanges;
  const blockedHint = canSend ? null : t('wishlist.letter.noChanges');

  // After a successful send: the full letter flight (first send) or the small
  // envelope off the button (notify). The toast follows the animation.
  const [flight, setFlight] = useState<{ thumbnail: string | null } | null>(null);
  const pendingToast = useRef<string | null>(null);
  const [notifyFrom, setNotifyFrom] = useState<DOMRect | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleConfirm = async () => {
    try {
      await sendMyWishlist({ note: note.trim() || undefined }).unwrap();
      const message = isSent ? t('wishlist.letter.notified') : t('wishlist.letter.sent');
      if (!isSent && isEffectEnabled('letterFlight')) {
        // Read the page before anything re-renders; the dialog closes first so
        // the overlay (and its focus) are not under Radix's modal layer.
        const thumbnail = captureLetterThumbnail();
        setDialogOpen(false);
        window.requestAnimationFrame(() => setFlight({ thumbnail }));
        pendingToast.current = message;
      } else {
        if (isSent && isEffectEnabled('letterNotifyFlight') && triggerRef.current) {
          setNotifyFrom(triggerRef.current.getBoundingClientRect());
        }
        toast({ description: message });
        setDialogOpen(false);
      }
      setNote('');
    } catch (error) {
      toast({ variant: 'destructive', description: extractApiErrorMessage(error, t('wishlist.letter.sendFailed')) });
    }
  };

  return (
    <div className="glass flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
          {isSent ? <MailCheck className="h-5 w-5" aria-hidden /> : <Send className="h-5 w-5" aria-hidden />}
        </span>
        <div className="min-w-0 text-sm">
          {isSent ? (
            <>
              <p className="font-medium text-cream">
                {t('wishlist.letter.sentOn', { date: new Date(wishlist.sentAtUtc!).toLocaleString(locale) })}
              </p>
              <p className="text-cream-muted">{blockedHint ?? t('wishlist.letter.liveHint')}</p>
            </>
          ) : (
            <p className="text-cream-muted">{t('wishlist.letter.draftHint')}</p>
          )}
        </div>
      </div>

      {flight && (
        <LetterFlight
          thumbnail={flight.thumbnail}
          onClose={() => {
            setFlight(null);
            if (pendingToast.current) {
              toast({ description: pendingToast.current });
              pendingToast.current = null;
            }
            triggerRef.current?.focus({ preventScroll: true });
          }}
        />
      )}
      {notifyFrom && <NotifyFlight from={notifyFrom} onDone={() => setNotifyFrom(null)} />}

      <Button
        ref={triggerRef}
        variant={isSent ? 'glass' : 'default'}
        onClick={() => setDialogOpen(true)}
        disabled={!canSend || isLoading}
      >
        {isSent ? <BellRing aria-hidden /> : <Send aria-hidden />}
        {isSent ? t('wishlist.letter.notifyChanges') : t('wishlist.letter.send')}
      </Button>

      <AlertDialog open={dialogOpen} onOpenChange={(open) => !isLoading && setDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSent ? t('wishlist.letter.notifyTitle') : t('wishlist.letter.sendTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSent ? t('wishlist.letter.notifyDescription') : t('wishlist.letter.sendDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="santa-note" className="text-gray-900">{t('wishlist.letter.noteLabel')}</Label>
            <textarea
              id="santa-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={MAX_NOTE_LENGTH}
              rows={3}
              placeholder={t('wishlist.letter.notePlaceholder')}
              className="w-full resize-none rounded-xl border border-input bg-transparent px-3.5 py-2 text-sm text-gray-900 shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <span className="self-end text-xs text-gray-500">{note.length}/{MAX_NOTE_LENGTH}</span>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t('wishlist.confirm.cancel')}</AlertDialogCancel>
            <Button onClick={handleConfirm} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
              {t('wishlist.letter.confirm')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default SendLetterPanel;
