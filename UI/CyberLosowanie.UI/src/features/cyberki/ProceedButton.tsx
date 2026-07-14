import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";

const ProceedButton = () => {
  const navigate = useNavigate();
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
          Press to continue
        </Button>
      ) : (
        <Button size="lg" onClick={() => navigate("/login")}>
          Please sign in
        </Button>
      )}
    </div>
  );
};

export default ProceedButton;