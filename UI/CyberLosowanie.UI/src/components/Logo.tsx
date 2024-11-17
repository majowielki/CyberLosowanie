import { Link } from "react-router-dom";
import { TreePine } from "lucide-react";

function Logo() {
  return (
    <Link
      to="/"
      className="flex justify-center items-center bg-primary p-2 rounded-lg text-white"
    >
      <TreePine className="w-8 h-8" />
    </Link>
  );
}
export default Logo;
