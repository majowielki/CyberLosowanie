import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";

function Error() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();
  debugLog(error);
  if (isRouteErrorResponse(error) && error.status === 404) {
    return (
      <main className="grid min-h-[100vh] place-items-center px-8 bg-gradient-to-t from-green-900 via-green-700 to-green-500 w-full">
        <div className="text-center">
          <p className="text-9xl font-semibold text-primary">404</p>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
            {t('common.notFound.title')}
          </h1>
          <p className="mt-6 text-lg leading-7">
            {t('common.notFound.body')}
          </p>
          <div className="mt-10">
            <Button size="lg" variant="secondary" onClick={() => navigate("/")}>
              {t('common.action.goHome')}
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-[100vh] place-items-center px-8 bg-gradient-to-t from-green-900 via-green-700 to-green-500 w-full">
      <h4 className="text-center font-bold text-4xl">{t('common.error.generic')}</h4>
    </main>
  );
}
export default Error;
