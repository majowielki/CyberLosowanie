import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CircleCheck, KeyRound, Loader2, LogIn, TriangleAlert } from 'lucide-react';
import AuthLayout from '@/features/auth/AuthLayout';
import PasswordInput from '@/features/auth/PasswordInput';
import { useResetPasswordMutation } from '@/features/auth/authApi';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { useTranslation } from '@/shared/i18n';
import type { apiResponseBody } from '@/types';

// Backend message for a missing, expired or already used link (EmailConstants.INVALID_RESET_LINK).
const INVALID_LINK_MESSAGE = 'The password reset link is invalid or has expired';

type ResetState = 'form' | 'success' | 'invalidLink';

/**
 * /reset-password?userId=…&token=… — target of the link in the reset email. One
 * password field with the eye toggle, like registration; a password rejected by
 * the server's rules can be corrected and resent with the same link, an expired
 * or used link cannot.
 */
function ResetPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const token = searchParams.get('token');
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [state, setState] = useState<ResetState>(userId && token ? 'form' : 'invalidLink');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const footer = (
    <Button variant="link" className="h-auto p-0" onClick={() => navigate('/login')}>
      <ArrowLeft aria-hidden /> {t('auth.forgot.backToLogin')}
    </Button>
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await resetPassword({ userId: userId!, token: token!, newPassword: password }).unwrap();
      setState('success');
    } catch (failure) {
      const body = (failure as { data?: Partial<apiResponseBody> }).data;
      const messages = body?.errors?.length ? body.errors : body?.message ? [body.message] : [];
      if (messages.includes(INVALID_LINK_MESSAGE)) {
        setState('invalidLink');
      } else {
        // Password rules (length, digits…) — backend messages are shown untranslated (doc §7).
        setError(messages[0] ?? t('auth.reset.failed'));
      }
    }
  };

  if (state !== 'form') {
    const success = state === 'success';
    const Icon = success ? CircleCheck : TriangleAlert;
    return (
      <AuthLayout title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} footer={footer}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className={
              success
                ? 'grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold'
                : 'grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive'
            }
          >
            <Icon className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-base" role={success ? 'status' : 'alert'}>
            {success ? t('auth.reset.success') : t('auth.reset.invalidLink')}
          </p>
          {success ? (
            <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
              <LogIn aria-hidden /> {t('auth.login.submit')}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={() => navigate('/forgot-password')}>
              <KeyRound aria-hidden /> {t('auth.reset.requestNew')}
            </Button>
          )}
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')} footer={footer}>
      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reset-password">{t('auth.reset.newPassword')}</Label>
          <PasswordInput
            id="reset-password"
            autoComplete="new-password"
            placeholder={t('auth.field.passwordPlaceholder')}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="mt-2 w-full" size="lg" type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
          {t('auth.reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
