import { useState } from "react";
import { useNavigate} from 'react-router-dom';
import AuthLayout from '@/features/auth/AuthLayout';
import { Label } from '@/shared/ui/label';
import { ArrowLeft, Loader2, MailCheck, UserRoundPlus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import inputHelper from "@/shared/lib/inputHelper";
import { apiResponseBody } from "@/types";
import { useRegisterUserMutation } from "@/features/auth/authApi";
import ResendConfirmationButton from "@/features/auth/ResendConfirmationButton";
import PasswordInput from "@/features/auth/PasswordInput";
import { debugLog } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import React from "react";



function Register() {
  const [error, setError] = useState("");
  const [registerUser] = useRegisterUserMutation();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const [userInput, setUserInput] = useState({
    userName: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  // Set after a successful registration: the form gives way to "check your inbox".
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const handleUserInput = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const tempData = inputHelper(e, userInput);
    setUserInput(tempData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);
    try {
      const response = await registerUser({
        userName: userInput.userName,
        email: userInput.email.trim(),
        password: userInput.password,
        language,
      });

      // Handle successful response — the account needs email confirmation before login.
      if (response.data && response.data.isSuccess) {
        setRegisteredEmail(userInput.email.trim());
      } else if (response.data && response.data.isSuccess === false) {
        // Backend messages are shown untranslated until the error-code epic (doc §7).
        const errorMessage = response.data.errors?.[0] || response.data.message || t('auth.register.failed');
        setError(errorMessage);
      } else if (response.error) {
        // Handle network or other errors (HTTP errors, network issues, etc.)
        let errorMessage = t('auth.register.failed');

        // Handle FetchBaseQueryError (has status and data)
        if ('status' in response.error && response.error.data) {
          const errorData = response.error.data as Partial<apiResponseBody>;
          errorMessage = errorData?.errors?.[0] || errorData?.message || errorMessage;
        }
        // Handle SerializedError (has message)
        else if ('message' in response.error && response.error.message) {
          errorMessage = response.error.message;
        }

        // Show a friendly message if transient failure detected
        if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('transient failure')) {
          setError(t('auth.error.siteIdle'));
        } else {
          setError(errorMessage);
        }
      } else {
        setError(t('auth.error.unexpectedFormat'));
      }
    } catch (error) {
      debugLog("Registration error:", error);
      setError(t('auth.register.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  if (registeredEmail) {
    return (
      <AuthLayout
        title={t('auth.register.checkInboxTitle')}
        subtitle={t('auth.register.checkInbox', { email: registeredEmail })}
        footer={
          <Button variant="link" className="h-auto p-0" onClick={() => navigate("/login")}>
            {t('auth.nav.login')}
          </Button>
        }
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-gold/15 text-gold">
            <MailCheck className="h-7 w-7" aria-hidden />
          </span>
          <p className="text-sm text-muted-foreground">{t('auth.register.checkSpam')}</p>
          <ResendConfirmationButton login={userInput.userName} />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')}
          <Button variant="link" className="h-auto p-0" onClick={() => navigate("/login")}>
            {t('auth.nav.login')}
          </Button>
        </>
      }
    >
      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-userName">{t('auth.field.username')}</Label>
          <Input
            id="register-userName"
            type="text"
            autoComplete="username"
            placeholder={t('auth.field.usernamePlaceholder')}
            required
            name="userName"
            value={userInput.userName}
            onChange={handleUserInput}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-email">{t('auth.field.email')}</Label>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.field.emailPlaceholder')}
            required
            name="email"
            value={userInput.email}
            onChange={handleUserInput}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="register-password">{t('auth.field.password')}</Label>
          <PasswordInput
            id="register-password"
            autoComplete="new-password"
            placeholder={t('auth.field.passwordPlaceholder')}
            required
            name="password"
            value={userInput.password}
            onChange={handleUserInput}
          />
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="mt-2 w-full" size="lg" type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <UserRoundPlus aria-hidden />}
          {loading ? t('common.action.loading') : t('auth.register.submit')}
        </Button>
        <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => navigate("/")}>
          <ArrowLeft aria-hidden /> {t('auth.nav.home')}
        </Button>
      </form>
    </AuthLayout>
  );
}
export default Register;
