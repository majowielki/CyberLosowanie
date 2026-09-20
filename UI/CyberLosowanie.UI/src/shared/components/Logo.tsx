import { Link } from "react-router-dom";
import { TreePine } from "lucide-react";

/** Brand mark + wordmark; links home. */
function Logo() {
  return (
    <Link
      to="/"
      aria-label="CyberLosowanie"
      className="group inline-flex items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform group-hover:-translate-y-0.5">
        <TreePine className="h-5 w-5" aria-hidden />
      </span>
      <span className="font-display hidden text-xl font-medium tracking-tight text-cream sm:block">
        Cyber<span className="text-gold">Losowanie</span>
      </span>
    </Link>
  );
}
export default Logo;
