import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { Button } from "@/shared/ui/button";
import LoginOrRegister from "@/features/auth/LoginOrRegister";
import Logo from "./Logo";

function Navbar() {
  // Wishlist is per-participant, so the link only makes sense for a logged-in
  // user — same session source of truth as LoginOrRegister (userAuthStore).
  const isLoggedIn = useSelector((state: RootState) => Boolean(state.userAuthStore.id));

  return (
    <nav className="bg-green-800 py-4 border-b-4 border-green-600">
      <div className="flex align-element justify-between items-center">
        <Logo />
        <div className="flex items-center">
          {isLoggedIn && (
            <Button asChild variant="secondary">
              <Link to="/wishlist">Lista życzeń</Link>
            </Button>
          )}
          <LoginOrRegister />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
