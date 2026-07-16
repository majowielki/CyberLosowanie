import { useState } from "react";
import { useNavigate} from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import inputHelper from "@/shared/lib/inputHelper";
import { apiResponseBody } from "@/types";
import { useRegisterUserMutation } from "@/features/auth/authApi";
import { toast } from '@/shared/hooks/use-toast';
import { debugLog } from '@/shared/config';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';
import React from "react";



function Register() {
  const [error, setError] = useState("");
  const [registerUser] = useRegisterUserMutation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [userInput, setUserInput] = useState({
    userName: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

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
        password: userInput.password,
      });

      // Handle successful response
      if (response.data && response.data.isSuccess) {
        toast({description: t('auth.register.success')});
        navigate("/login");
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

  return (
    <section className="h-screen grid place-items-center bg-gradient-to-t from-green-900 via-green-700 to-green-500 min-h-screen w-full">
      <Card className="w-96 bg-muted flex flex-col items-center">
        <CardHeader>
          <CardTitle className="text-center">{t('auth.register.title')}</CardTitle>
        </CardHeader>
        <CardContent className="w-full flex flex-col items-center">
        <form method="post" onSubmit={handleSubmit} className="w-3/5 flex flex-col items-center">
        <div>
          <div className="w-full mt-4">
            <Input
              type="text"
              className="form-control w-full"
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
              className="form-control w-full"
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
              t('auth.register.submit')
            )}
          </Button>
        </div>
      </form>
          <div className="mt-4 w-full flex justify-between">
            <Button variant="link" className="w-5/12" onClick={() => navigate("/")}>
              {t('auth.nav.home')}
            </Button>
            <Button variant="link" className="w-5/12" onClick={() => navigate("/login")}>
              {t('auth.nav.login')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
export default Register;

