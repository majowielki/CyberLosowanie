import { useRouteError } from "react-router-dom";
import { debugLog } from "@/shared/config";
import { useTranslation } from "@/shared/i18n";

function ErrorElement() {
  const error = useRouteError();
  const { t } = useTranslation();
  debugLog(error);

  return <h4 className="font-bold text-4xl">{t('common.error.generic')}</h4>;
}
export default ErrorElement;
