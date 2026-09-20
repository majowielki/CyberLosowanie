import { ReactNode } from 'react';
import { Loader2, Snowflake, TriangleAlert } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

interface StatusMessageProps {
  message: ReactNode;
  hint?: ReactNode;
  /** Optional call to action rendered under the text (a Button, typically). */
  action?: ReactNode;
  tone?: 'neutral' | 'loading' | 'error';
  className?: string;
}

/**
 * Centered status panel for loading / empty / error states on flow pages.
 * Replaces the repeated "text-white text-lg mt-20" blocks so every state
 * reads the same way (icon · message · hint · action).
 */
function StatusMessage({ message, hint, action, tone = 'neutral', className }: StatusMessageProps) {
  const Icon = tone === 'loading' ? Loader2 : tone === 'error' ? TriangleAlert : Snowflake;

  return (
    <div
      role={tone === 'loading' ? 'status' : undefined}
      className={cn(
        'glass mx-auto flex w-full max-w-md flex-col items-center gap-3 px-6 py-10 text-center animate-fade-up',
        className,
      )}
    >
      <span
        className={cn(
          'grid h-12 w-12 place-items-center rounded-full',
          tone === 'error' ? 'bg-primary/20 text-primary' : 'bg-gold/15 text-gold',
        )}
      >
        <Icon className={cn('h-6 w-6', tone === 'loading' && 'animate-spin')} />
      </span>
      <p className="text-lg font-medium text-cream">{message}</p>
      {hint && <p className="text-sm text-cream-muted">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export default StatusMessage;
