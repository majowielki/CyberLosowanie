import { FormEvent, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, KeyRound, Loader2, MailCheck } from 'lucide-react';
import AuthLayout from '@/features/auth/AuthLayout';
import { useForgotPasswordMutation } from '@/features/auth/authApi';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useTranslation } from '@/shared/i18n';

/**
 * /forgot-password — asks for the username or email and has the backend email a
 * reset link. The answer is the same whether the account exists or not, so the
 * confirmation text is deliberately neutral.
 */
function ForgotPassword() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  // Prefilled from the login form, so the user does not type it twice.
  const [login, setLogin] = useState(searchParams.get('login') ?? '');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    try {
      await forgotPassword({ login: login.trim() }).unwrap();
      setSent(true);
    } catch (failure) {
      const status = (failure as { status?: unknown }).status;
      setError(status === 429 ? t('auth.forgot.tooMany') : t('auth.forgot.failed'));
    }
  };

  return (
    <AuthLayout
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <Button variant="link" className="h-auto p-0" onClick={() => navigate('/login')}>
          <ArrowLeft aria-hidden /> {t('auth.forgot.backToLogin')}
        </Button>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-4 text-center" role="status">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-base">{t('auth.forgot.sent')}</p>
          <p className="text-sm text-muted-foreground">{t('auth.register.checkSpam')}</p>
        </div>
      ) : (
        <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="forgot-login">{t('auth.field.login')}</Label>
            <Input
              id="forgot-login"
              type="text"
              autoComplete="username"
              placeholder={t('auth.field.loginPlaceholder')}
              required
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button className="mt-2 w-full" size="lg" type="submit" disabled={isLoading || !login.trim()}>
            {isLoading ? <Loader2 className="animate-spin" aria-hidden /> : <KeyRound aria-hidden />}
            {t('auth.forgot.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

export default ForgotPassword;
