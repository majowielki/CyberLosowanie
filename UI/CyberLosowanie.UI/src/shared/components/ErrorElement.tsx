import { useNavigate, useRouteError } from "react-router-dom";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import StatusMessage from "./StatusMessage";

/** Per-route error state rendered inside the layout (navbar stays visible). */
function ErrorElement() {
  const error = useRouteError();
  const navigate = useNavigate();
  const { t } = useTranslation();
  debugLog(error);

  return (
    <StatusMessage
      tone="error"
      message={t('common.error.generic')}
      hint={t('common.error.tryAgainShort')}
      action={<Button variant="glass" onClick={() => navigate("/")}>{t('common.action.goHome')}</Button>}
    />
  );
}
export default ErrorElement;
