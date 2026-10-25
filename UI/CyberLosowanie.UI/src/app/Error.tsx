import { useRouteError, useNavigate, isRouteErrorResponse } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Logo, StatusMessage } from "@/shared/components";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";
import { isEffectEnabled } from "@/shared/motion/cinematic";
import { useState } from "react";
import NotFoundGame from "./NotFoundGame";

/** Root error page (outside the layout): 404 or a generic failure. */
function Error() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();
  debugLog(error);

  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const [game] = useState(() => isEffectEnabled("notFoundGame"));

  return (
    <main className="flex min-h-screen flex-col items-center px-5 py-6">
      <div className="relative z-10">
        <Logo />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        {isNotFound ? (
          <>
            <p className="relative z-10 font-display text-[8rem] font-semibold leading-none text-gold/90 sm:text-[11rem]">404</p>
            {game && <NotFoundGame />}
            <StatusMessage
              className="relative z-10"
              message={t('common.notFound.title')}
              hint={t('common.notFound.body')}
              action={<Button onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
            />
          </>
        ) : (
          <StatusMessage
            tone="error"
            message={t('common.error.generic')}
            hint={t('common.error.tryAgainShort')}
            action={<Button onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
          />
        )}
      </div>
    </main>
  );
}
export default Error;
