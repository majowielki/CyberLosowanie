import { useState } from "react";
import { useLoginUserMutation } from "@/features/auth/authApi";
import inputHelper from "@/shared/lib/inputHelper";
import { apiResponseBody, tokenClaims } from "@/types";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { useNavigate } from 'react-router-dom';
import AuthLayout from '@/features/auth/AuthLayout';
import { Label } from '@/shared/ui/label';
import { ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { setLoggedInUser } from "@/features/auth/userSlice";
import { userFromToken } from "@/features/auth/tokenUtils";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { debugLog } from '@/shared/config';
import { useTranslation } from '@/shared/i18n';
import React from "react";




function Login() {
  const [error, setError] = useState("");
  const [loginUser] = useLoginUserMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userInput, setUserInput] = useState({
    userName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const handleUserInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tempData = inputHelper(e, userInput);
    setUserInput(tempData);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(""); // Clear previous errors
    setLoading(true);
    try {
      const response = await loginUser({
        userName: userInput.userName,
        password: userInput.password,
      });

      // Handle successful response
      if (response.data && response.data.isSuccess && response.data.data) {
        const token = response.data.data.token;

        if (token) {
          // Store token first
          localStorage.setItem("token", token);

          // Then decode and update Redux state
          const decoded = jwtDecode<tokenClaims>(token);
          dispatch(setLoggedInUser(userFromToken(decoded)));
          navigate("/");
        } else {
          setError(t('auth.login.tokenMissing'));
        }
      } else if (response.data && response.data.isSuccess === false) {
        // Backend messages are shown untranslated until the error-code epic (doc §7).
        const errorMessage = response.data.errors?.[0] || response.data.message || t('auth.login.failed');
        setError(errorMessage);
      } else if (response.error) {
        // Handle network or other errors (HTTP errors, network issues, etc.)
        let errorMessage = t('auth.login.failed');

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
      debugLog("Login error:", error);
      setError(t('auth.login.unexpectedError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}
          <Button variant="link" className="h-auto p-0" onClick={() => navigate("/register")}>
            {t('auth.nav.register')}
          </Button>
        </>
      }
    >
      <form method="post" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="login-userName">{t('auth.field.username')}</Label>
          <Input
            id="login-userName"
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
          <Label htmlFor="login-password">{t('auth.field.password')}</Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
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
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : <LogIn aria-hidden />}
          {loading ? t('common.action.loading') : t('auth.login.submit')}
        </Button>
        <Button type="button" variant="link" className="h-auto p-0 text-muted-foreground" onClick={() => navigate("/")}>
          <ArrowLeft aria-hidden /> {t('auth.nav.home')}
        </Button>
      </form>
    </AuthLayout>
  );
}
export default Login;
