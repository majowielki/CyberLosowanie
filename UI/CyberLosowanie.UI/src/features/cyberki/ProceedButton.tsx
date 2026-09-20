import { useNavigate } from "react-router-dom";
import { ArrowRight, LogIn } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useTranslation } from "@/shared/i18n";

/** Landing call-to-action: resumes the draw where the user left off, or sends to login. */
const ProceedButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.userAuthStore.id);
  const userHasCyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  const handleContinue = () => {
    const path = userHasGiftedCyberekId != null
      ? "/final-page"
      : userHasCyberekId != null
        ? "/choose-to-be-gifted-cyberek"
        : "/select-your-cyberek";
    navigate(path);
  };

  return user ? (
    <Button size="lg" onClick={handleContinue}>
      {t('cyberki.proceed.continue')}
      <ArrowRight aria-hidden />
    </Button>
  ) : (
    <Button size="lg" onClick={() => navigate("/login")}>
      <LogIn aria-hidden />
      {t('cyberki.proceed.signIn')}
    </Button>
  );
};

export default ProceedButton;
