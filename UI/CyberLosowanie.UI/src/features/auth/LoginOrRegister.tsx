import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { useSelector, useDispatch } from "react-redux";
import { RootState, persistor } from "@/app/store";
import { resetUser } from "@/features/auth/userSlice";
import { tokenUtils } from "./tokenUtils";

const LoginOrRegister = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userAuthStore.id);

  const handleLogout = async () => {
    // Single-source logout (H3/S6): drop the token, reset runtime state and
    // purge its persisted copy — nothing else stores session data.
    tokenUtils.clearAuthData();
    dispatch(resetUser());
    await persistor.purge();

    navigate("/");
  };

  return (
    <header>
      <div className="align-element flex justify-center sm:justify-end py-2">
        {user ? (
          <div className="flex -mr-8">
            <Button onClick={handleLogout}>
              Logout
            </Button>
          </div>
        ) : (
          <div className="flex gap-x-6 justify-center items-center -mr-8">
            <Button onClick={() => navigate("/login")}>
              Sign in
            </Button>
            <Button onClick={() => navigate("/register")}>
              Register
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
export default LoginOrRegister;
