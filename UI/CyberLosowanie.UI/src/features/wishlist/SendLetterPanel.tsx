import { useState } from 'react';
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
import { extractApiErrorMessage, useSendMyWishlistMutation } from './wishlistApi';

// Mirrors backend WishlistConstants.MAX_SANTA_NOTE_LENGTH.
const MAX_NOTE_LENGTH = 300;

/**
 * "Send letter to Santa" under my saved wishlist. Before the first send the list
 * is a private draft; afterwards every save is visible to Santa immediately and
 * the button turns into an optional "tell Santa about changes" (only after a
 * new save, and not more often than the backend cooldown allows).
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
  const cooldownUntil = wishlist.nextNotificationAtUtc ? new Date(wishlist.nextNotificationAtUtc) : null;
  const inCooldown = cooldownUntil !== null && cooldownUntil > new Date();
  const canSend = !isSent || (hasChanges && !inCooldown);

  const blockedHint = !isSent || canSend
    ? null
    : !hasChanges
      ? t('wishlist.letter.noChanges')
      : t('wishlist.letter.cooldown', { time: cooldownUntil!.toLocaleString(locale) });

  const handleConfirm = async () => {
    try {
      await sendMyWishlist({ note: note.trim() || undefined }).unwrap();
      toast({ description: isSent ? t('wishlist.letter.notified') : t('wishlist.letter.sent') });
      setDialogOpen(false);
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

      <Button
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
