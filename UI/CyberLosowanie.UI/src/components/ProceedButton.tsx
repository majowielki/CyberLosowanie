import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/features/redux/store";

const ProceedButton = () => {
  const user = useSelector((state: RootState) => state.userAuthStore.id);
  const userHasCyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  return (
    <div>
      {user ? (
        <Button asChild size="lg">
          <Link to={
            userHasGiftedCyberekId !== "0" 
              ? "/final-page" 
              : userHasCyberekId !== "0" 
                ? "/choose-to-be-gifted-cyberek" 
                : "/select-your-cyberek"
          }>
            Press to continue
          </Link>
        </Button>
      ) : (
        <Button asChild size="lg">
          <Link to="/login">Please sign in</Link>
        </Button>
      )}
    </div>
  );
};

export default ProceedButton;