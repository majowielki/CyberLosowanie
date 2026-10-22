import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CircleCheck, Loader2, LogIn, TriangleAlert } from 'lucide-react';
import AuthLayout from '@/features/auth/AuthLayout';
import { useConfirmEmailMutation } from '@/features/auth/authApi';
import { Button } from '@/shared/ui/button';
import { useTranslation } from '@/shared/i18n';

type ConfirmState = 'pending' | 'success' | 'failed';

/**
 * /confirm-email?userId=…&token=… — target of the link in the confirmation
 * email. Confirms once on load; the backend treats a repeated confirmation as
 * success, so reopening the link is harmless.
 */
function ConfirmEmail() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [confirmEmail] = useConfirmEmailMutation();
  const [state, setState] = useState<ConfirmState>('pending');
  // StrictMode runs effects twice in development; one request is enough.
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const userId = searchParams.get('userId');
    const token = searchParams.get('token');
    if (!userId || !token) {
      setState('failed');
      return;
    }

    confirmEmail({ userId, token })
      .unwrap()
      .then(() => setState('success'))
      .catch(() => setState('failed'));
  }, [confirmEmail, searchParams]);

  const Icon = state === 'pending' ? Loader2 : state === 'success' ? CircleCheck : TriangleAlert;
  const message =
    state === 'pending'
      ? t('auth.confirm.inProgress')
      : state === 'success'
        ? t('auth.confirm.success')
        : t('auth.confirm.failed');

  return (
    <AuthLayout
      title={t('auth.confirm.title')}
      subtitle={t('auth.confirm.subtitle')}
      footer={
        <Button variant="link" className="h-auto p-0" onClick={() => navigate('/')}>
          {t('auth.nav.home')}
        </Button>
      }
    >
      <div className="flex flex-col items-center gap-4 text-center" role={state === 'pending' ? 'status' : undefined}>
        <span
          className={
            state === 'failed'
              ? 'grid h-14 w-14 place-items-center rounded-full bg-destructive/10 text-destructive'
              : 'grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold'
          }
        >
          <Icon className={state === 'pending' ? 'h-7 w-7 animate-spin' : 'h-7 w-7'} aria-hidden />
        </span>
        <p className="text-base">{message}</p>
        {state !== 'pending' && (
          <Button className="w-full" size="lg" onClick={() => navigate('/login')}>
            <LogIn aria-hidden /> {t('auth.login.submit')}
          </Button>
        )}
      </div>
    </AuthLayout>
  );
}

export default ConfirmEmail;
