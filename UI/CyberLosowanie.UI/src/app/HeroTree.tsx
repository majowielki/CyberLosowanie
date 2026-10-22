import treeImage from "@/assets/landing-tree.webp";
import CyberekPortrait from "@/features/cyberki/CyberekPortrait";
import { cn } from "@/shared/lib/utils";

// The 12 empty bauble frames in landing-tree.webp (rows of 2, 4 and 6 from the
// top), measured at full resolution, and the cyberek hung in each. Centre in % of
// the artwork (left of its width, top of its height); size is the cream interior's
// diameter plus 2 px, in % of the width, so the photo covers its anti-aliased edge
// but not the gold ring.
const BAUBLES: Array<{ cyberekId: number; left: number; top: number; size: number }> = [
  { cyberekId: 1, left: 44.52, top: 29.71, size: 6.96 }, // Michał M.
  { cyberekId: 2, left: 55.07, top: 29.73, size: 6.95 }, // Kornelia
  { cyberekId: 11, left: 34.87, top: 49.28, size: 6.87 }, // Paweł
  { cyberekId: 4, left: 44.65, top: 49.29, size: 6.86 }, // Daria
  { cyberekId: 9, left: 55.03, top: 49.28, size: 6.87 }, // Karol
  { cyberekId: 3, left: 64.88, top: 49.28, size: 6.86 }, // Ola
  { cyberekId: 8, left: 26.1, top: 68.12, size: 6.77 }, // Michał K.
  { cyberekId: 5, left: 35.75, top: 68.8, size: 6.83 }, // Asia
  { cyberekId: 7, left: 45.2, top: 69.52, size: 6.77 }, // Marek
  { cyberekId: 10, left: 54.63, top: 69.55, size: 6.8 }, // Natalia
  { cyberekId: 6, left: 64.08, top: 68.98, size: 6.83 }, // Filip
  { cyberekId: 12, left: 73.58, top: 68.21, size: 6.77 }, // Wiktoria
];

interface HeroTreeProps {
  alt: string;
  className?: string;
}

/**
 * The landing artwork: a raster tree with empty bauble frames and the cyberki
 * caricatures (public, served by the API) laid over them. Keeping the photos out
 * of the artwork keeps it light and keeps portraits out of the repository.
 */
function HeroTree({ alt, className }: HeroTreeProps) {
  return (
    <div className={cn("relative", className)}>
      <img src={treeImage} alt={alt} width={2048} height={1360} className="block h-auto w-full" />
      {/* Decorative: the artwork's alt already describes the tree. */}
      <div aria-hidden>
        {BAUBLES.map(({ cyberekId, left, top, size }) => (
          <div
            key={cyberekId}
            className="absolute aspect-square -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full"
            style={{ left: `${left}%`, top: `${top}%`, width: `${size}%` }}
          >
            {/* The caricatures are full-figure — zoom in towards the face. */}
            <CyberekPortrait
              cyberekId={cyberekId}
              kind="caricature"
              alt=""
              className="h-full w-full origin-[50%_30%] scale-[1.35] object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HeroTree;
