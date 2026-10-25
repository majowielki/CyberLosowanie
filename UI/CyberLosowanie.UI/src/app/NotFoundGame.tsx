import { useEffect, useRef, useState } from "react";
import prezent from "@/assets/stickers/thumbs/prezent.webp";
import bombka from "@/assets/stickers/thumbs/bombka.webp";
import gwiazdka from "@/assets/stickers/thumbs/gwiazdka.webp";
import pierniki from "@/assets/stickers/thumbs/pierniki.webp";
import skarpeta from "@/assets/stickers/thumbs/skarpeta.webp";
import laska from "@/assets/stickers/thumbs/laska-cukrowa.webp";
import { useTranslation } from "@/shared/i18n";

const ART = [prezent, bombka, gwiazdka, pierniki, skarpeta, laska];
const SPAWN_MS = 850;
const MAX_FALLING = 9;
const WIN_AT = 10;

interface Falling {
  id: number;
  art: string;
  left: number;
  size: number;
  duration: number;
  spin: number;
  caught: boolean;
}

/**
 * The playable 404: the elves dropped the presents — tap them before they
 * land. Stickers fall in the background (CSS animation per item); the page's
 * text and "home" button stay on top and work as usual. Decorative for
 * assistive tech except the score, which is announced politely.
 */
function NotFoundGame() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Falling[]>([]);
  const [score, setScore] = useState(0);
  const nextId = useRef(0);

  useEffect(() => {
    const spawn = () => {
      if (document.hidden) {
        return;
      }
      setItems((current) =>
        current.length >= MAX_FALLING
          ? current
          : [
              ...current,
              {
                id: nextId.current++,
                art: ART[Math.floor(Math.random() * ART.length)],
                left: 4 + Math.random() * 86,
                size: 52 + Math.random() * 36,
                duration: 4.2 + Math.random() * 3,
                spin: (Math.random() - 0.5) * 120,
                caught: false,
              },
            ],
      );
    };
    spawn();
    const id = window.setInterval(spawn, SPAWN_MS);
    return () => window.clearInterval(id);
  }, []);

  const remove = (id: number) => setItems((current) => current.filter((item) => item.id !== id));

  const catchItem = (id: number) => {
    setItems((current) => current.map((item) => (item.id === id && !item.caught ? { ...item, caught: true } : item)));
    setScore((value) => value + 1);
  };

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {items.map((item) => (
          // The wrapper falls; the image inside pops when caught, so a catch
          // happens where the present is instead of restarting its fall.
          <span
            key={item.id}
            className="nf-fall absolute top-0"
            onAnimationEnd={(event) => event.target === event.currentTarget && remove(item.id)}
            style={{
              left: `${item.left}%`,
              width: item.size,
              ['--nf-duration' as string]: `${item.duration}s`,
              ['--nf-spin' as string]: `${item.spin}deg`,
            }}
          >
            <img
              src={item.art}
              alt=""
              draggable={false}
              onPointerDown={() => !item.caught && catchItem(item.id)}
              onAnimationEnd={() => item.caught && remove(item.id)}
              className={
                item.caught
                  ? 'nf-caught block w-full'
                  : 'pointer-events-auto block w-full cursor-pointer touch-none select-none drop-shadow-[0_8px_10px_rgba(0,0,0,0.4)]'
              }
            />
          </span>
        ))}
      </div>
      <p aria-live="polite" className="relative z-10 text-sm font-semibold text-gold">
        {score >= WIN_AT
          ? t('common.notFound.won')
          : score > 0
            ? t('common.notFound.score', { count: score })
            : t('common.notFound.gameHint')}
      </p>
    </>
  );
}

export default NotFoundGame;
