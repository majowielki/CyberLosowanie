import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/features/redux/store";
import { useDispatch } from "react-redux";
import { resetUser } from "@/features/redux/userSlice";
import { resetCyberek } from "@/features/redux/cyberekSlice";

const LoginOrRegister = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.userAuthStore.id);

  const handleLogout = () => {
    dispatch(resetUser());
    dispatch(resetCyberek());
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
            <Button asChild >
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild >
              <Link to="/register">Register</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  );
};
export default LoginOrRegister;