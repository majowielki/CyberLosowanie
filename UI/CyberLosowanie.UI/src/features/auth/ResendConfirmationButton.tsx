import { useState } from 'react';
import { Loader2, MailCheck } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/hooks/use-toast';
import { useTranslation } from '@/shared/i18n';
import { useResendConfirmationMutation } from '@/features/auth/authApi';

interface ResendConfirmationButtonProps {
  /** Username or email of the account waiting for confirmation. */
  login: string;
}

/**
 * "Send the link again" for an unconfirmed account (after registration and on
 * the login 403). The backend answers the same way for every account, so the
 * toast is deliberately neutral.
 */
function ResendConfirmationButton({ login }: ResendConfirmationButtonProps) {
  const { t } = useTranslation();
  const [resendConfirmation, { isLoading }] = useResendConfirmationMutation();
  const [sent, setSent] = useState(false);

  const handleClick = async () => {
    try {
      await resendConfirmation({ login }).unwrap();
      setSent(true);
      toast({ description: t('auth.confirm.resent') });
    } catch {
      toast({ variant: 'destructive', description: t('auth.confirm.resendFailed') });
    }
  };

  return (
    <Button type="button" variant="outline" className="w-full" onClick={handleClick} disabled={isLoading || sent || !login}>
      {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : <MailCheck aria-hidden />}
      {t('auth.confirm.resend')}
    </Button>
  );
}

export default ResendConfirmationButton;
