import * as Dialog from '@radix-ui/react-dialog';
import { X, ZoomIn } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useTranslation } from '@/shared/i18n';
import { cyberekImageKind } from '@/types';
import CyberekPortrait from './CyberekPortrait';

interface ZoomableCyberekPortraitProps {
  cyberekId: number | null | undefined;
  kind: cyberekImageKind;
  alt: string;
  /** Caption under the enlarged photo. */
  caption: string;
  /** Classes of the thumbnail (size, shape). */
  className?: string;
}

/**
 * A portrait thumbnail that opens the photo enlarged in a dialog (Esc, the X or
 * a click outside closes it). Both use the same cached image, so the enlarged
 * one shows instantly.
 */
function ZoomableCyberekPortrait({ cyberekId, kind, alt, caption, className }: ZoomableCyberekPortraitProps) {
  const { t } = useTranslation();

  return (
    <Dialog.Root>
      <Dialog.Trigger
        aria-label={t('cyberki.portrait.enlarge', { caption })}
        className={cn(
          'group relative shrink-0 overflow-hidden rounded-full transition-transform duration-200 hover:scale-105',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-pine-950',
          className,
        )}
      >
        <CyberekPortrait cyberekId={cyberekId} kind={kind} alt={alt} className="h-full w-full object-cover" />
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center bg-black/40 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <ZoomIn className="h-6 w-6" />
        </span>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(92vw,78vh,640px)] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-4 duration-200 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <CyberekPortrait
            cyberekId={cyberekId}
            kind={kind}
            alt={alt}
            className="aspect-square w-full rounded-3xl object-cover shadow-halo ring-4 ring-cream"
          />
          <Dialog.Title className="font-display text-2xl font-semibold text-cream sm:text-3xl">
            {caption}
          </Dialog.Title>
          <Dialog.Close
            aria-label={t('common.action.close')}
            className="absolute -right-2 -top-2 grid h-10 w-10 place-items-center rounded-full bg-cream text-pine-950 shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:-right-4 sm:-top-4"
          >
            <X className="h-5 w-5" aria-hidden />
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default ZoomableCyberekPortrait;
