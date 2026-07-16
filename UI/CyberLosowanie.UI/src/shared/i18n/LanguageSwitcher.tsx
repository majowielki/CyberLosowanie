import { useDispatch } from 'react-redux';
import { Button } from '@/shared/ui/button';
import { toggleLanguage } from './localeSlice';
import { useTranslation } from './useTranslation';

// Inline SVG flags — flag emoji do not render on Windows (doc §6.6), and
// bundling them here means zero new dependencies. Both use the same 60x40
// viewBox so the icons line up regardless of the flags' official ratios.

function PolandFlag() {
  return (
    <svg viewBox="0 0 60 40" className="h-full w-full" aria-hidden focusable="false">
      <rect width="60" height="20" fill="#ffffff" />
      <rect y="20" width="60" height="20" fill="#dc143c" />
    </svg>
  );
}

function UnitedKingdomFlag() {
  return (
    <svg viewBox="0 0 60 40" className="h-full w-full" aria-hidden focusable="false">
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#ffffff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#c8102e" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#ffffff" strokeWidth="13" />
      <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="8" />
    </svg>
  );
}

/**
 * Two-language toggle (doc §6.6): the flag shows the language a click switches
 * TO. Its label is deliberately in that target language (not translated) so the
 * person who needs it can recognise it.
 */
export function LanguageSwitcher() {
  const dispatch = useDispatch();
  const { language } = useTranslation();
  const next =
    language === 'pl'
      ? { label: 'English', ariaLabel: 'Switch language to English', flag: <UnitedKingdomFlag /> }
      : { label: 'Polski', ariaLabel: 'Zmień język na polski', flag: <PolandFlag /> };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => dispatch(toggleLanguage())}
      title={next.label}
      aria-label={next.ariaLabel}
    >
      <span className="block h-4 w-6 overflow-hidden rounded-sm ring-1 ring-black/20">
        {next.flag}
      </span>
    </Button>
  );
}
