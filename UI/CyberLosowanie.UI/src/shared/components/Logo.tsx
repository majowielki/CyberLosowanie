import { useNavigate } from "react-router-dom";
import { TreePine } from "lucide-react";

function Logo() {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate("/")}
      className="flex justify-center items-center bg-primary p-2 rounded-lg text-white cursor-pointer"
    >
      <TreePine className="w-8 h-8" />
    </div>
  );
}
export default Logo;
