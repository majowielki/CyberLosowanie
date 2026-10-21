import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';
import { cyberekImageKind } from '@/types';
import { useCyberekImage } from './useCyberekImage';

interface CyberekPortraitProps {
  cyberekId: number | null | undefined;
  kind: cyberekImageKind;
  alt: string;
  /** Classes of the <img>; the placeholder gets the same box. */
  className?: string;
  /** Shown when the image cannot be loaded (e.g. not uploaded yet). */
  fallback?: ReactNode;
}

/**
 * One of a cyberek's three portraits (see cyberekImageKind). While loading it
 * keeps the final size as a soft pulsing placeholder, so layouts do not jump.
 */
function CyberekPortrait({ cyberekId, kind, alt, className, fallback }: CyberekPortraitProps) {
  const image = useCyberekImage(cyberekId, kind);

  if (image.status === 'loaded') {
    return <img src={image.src} alt={alt} className={className} />;
  }

  return (
    <span
      role="img"
      aria-label={alt}
      aria-busy={image.status === 'loading'}
      className={cn(
        className,
        'grid place-items-center bg-white/10 text-cream-muted',
        image.status === 'loading' && 'motion-safe:animate-pulse',
      )}
    >
      {image.status === 'error' && fallback}
    </span>
  );
}

export default CyberekPortrait;
