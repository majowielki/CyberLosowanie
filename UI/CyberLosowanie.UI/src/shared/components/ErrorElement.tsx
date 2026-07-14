import { useRouteError } from "react-router-dom";
import { debugLog } from "@/shared/config";

function ErrorElement() {
  const error = useRouteError();
  debugLog(error);

  return <h4 className="font-bold text-4xl">there was an error... </h4>;
}
export default ErrorElement;
