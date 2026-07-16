import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { useTranslation } from "@/shared/i18n";

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

  return (
    <div>
      {user ? (
        <Button size="lg" onClick={handleContinue}>
          {t('cyberki.proceed.continue')}
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate("/login")}>
          {t('cyberki.proceed.signIn')}
        </Button>
      )}
    </div>
  );
};

export default ProceedButton;