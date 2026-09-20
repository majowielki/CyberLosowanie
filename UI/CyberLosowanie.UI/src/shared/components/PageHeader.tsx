import { ReactNode } from 'react';
import { cn } from '@/shared/lib/utils';

interface PageHeaderProps {
  /** Small gold label above the title (e.g. a step indicator). */
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  /** `lg` for the draw flow's hero-like headings, `md` for tool pages (wishlist). */
  size?: 'lg' | 'md';
  className?: string;
}

/**
 * Consistent page heading on the pine background: eyebrow · display title ·
 * muted subtitle. Every flow page (select / choose / final / wishlist) uses it
 * so the typography scale is defined in one place.
 */
function PageHeader({ eyebrow, title, subtitle, align = 'center', size = 'lg', className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex max-w-2xl flex-col animate-fade-up',
        size === 'lg' ? 'gap-3' : 'gap-1.5',
        align === 'center' ? 'items-center text-center' : 'items-start text-left',
        className,
      )}
    >
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1
        className={cn(
          'font-display text-balance font-medium leading-[1.05] tracking-tight text-cream',
          size === 'lg' ? 'text-4xl sm:text-5xl' : 'text-2xl sm:text-3xl',
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            'text-pretty leading-relaxed text-cream-muted',
            size === 'lg' ? 'text-base sm:text-lg' : 'text-sm',
          )}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}

export default PageHeader;
