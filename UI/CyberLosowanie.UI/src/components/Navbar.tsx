import LoginOrRegister from "./LoginOrRegister";
import Logo from "./Logo";

function Navbar() {
  return (
    <nav className="bg-green-800 py-4 border-b-4 border-green-600">
      <div className="flex align-element justify-between">
        <Logo />
        <LoginOrRegister />
      </div>
    </nav>
  );
}

export default Navbar;