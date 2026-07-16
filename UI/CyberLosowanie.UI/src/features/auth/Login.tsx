import { useState } from "react";
import { useLoginUserMutation } from "@/features/auth/authApi";
import inputHelper from "@/shared/lib/inputHelper";
import { apiResponseBody, tokenClaims } from "@/types";
import { jwtDecode } from "jwt-decode";
import { useDispatch } from "react-redux";
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/ui/card';
import { setLoggedInUser } from "@/features/auth/userSlice";
import { userFromToken } from "@/features/auth/tokenUtils";
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { debugLog } from '@/shared/config';
import { cn } from '@/shared/lib/utils';
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
    <section className="h-screen grid place-items-center bg-gradient-to-t from-green-900 via-green-700 to-green-500 min-h-screen w-full">
      <Card className="w-96 bg-muted flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-center">{t('auth.login.title')}</CardTitle>
        </CardHeader>
        <CardContent className="w-full flex flex-col items-center">
          <form method="post" onSubmit={handleSubmit} className="w-3/5 flex flex-col items-center">
            <div>
              <div className="w-full mt-4">
                <Input
                  type="text"
                  className="w-full"
                  placeholder={t('auth.field.usernamePlaceholder')}
                  required
                  name="userName"
                  value={userInput.userName}
                  onChange={handleUserInput}
                />
              </div>
              <div className="w-full mt-4">
                <Input
                  type="password"
                  className="w-full"
                  placeholder={t('auth.field.passwordPlaceholder')}
                  required
                  name="password"
                  value={userInput.password}
                  onChange={handleUserInput}
                />
              </div>
            </div>
            <div className="mt-2 w-full flex flex-col items-center">
              {error && <p className="text-danger">{error}</p>}
              <Button
                className={cn("mt-5 w-48", loading && "bg-red-800")}
                type="submit"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                    </svg>
                    {t('common.action.loading')}
                  </span>
                ) : (
                  t('auth.login.submit')
                )}
              </Button>
            </div>
          </form>
          <div className="mt-4 w-full flex justify-between">
            <Button variant="link" className="w-5/12" onClick={() => navigate("/")}>
              {t('auth.nav.home')}
            </Button>
            <Button variant="link" className="w-5/12" onClick={() => navigate("/register")}>
              {t('auth.nav.register')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Login;