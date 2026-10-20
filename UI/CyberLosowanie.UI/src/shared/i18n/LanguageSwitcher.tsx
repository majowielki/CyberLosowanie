import { ReactElement } from 'react';
import { useDispatch } from 'react-redux';
import { cn } from '@/shared/lib/utils';
import { Language } from './config';
import { setLanguage } from './localeSlice';
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

const OPTIONS: { language: Language; code: string; label: string; flag: ReactElement }[] = [
  { language: 'pl', code: 'PL', label: 'Polski', flag: <PolandFlag /> },
  { language: 'en', code: 'EN', label: 'English', flag: <UnitedKingdomFlag /> },
];

/**
 * Two-language segmented switch (doc §6.6): both languages are always visible
 * and the active one is highlighted, so there is no guessing whether a flag
 * means "current" or "switch to". Labels stay in their own language (not
 * translated) so the person who needs one can recognise it.
 */
export function LanguageSwitcher() {
  const dispatch = useDispatch();
  const { language } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Język / Language"
      className="inline-flex h-10 shrink-0 items-center gap-0.5 rounded-full border border-white/15 bg-white/10 p-1 backdrop-blur-md"
    >
      {OPTIONS.map((option) => {
        const isActive = option.language === language;
        return (
          <button
            key={option.language}
            type="button"
            lang={option.language}
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => dispatch(setLanguage(option.language))}
            className={cn(
              'flex h-full items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'bg-cream text-pine-950 shadow-sm'
                : 'text-cream-muted hover:bg-white/10 hover:text-cream',
            )}
          >
            {/* Flags are decoration; the code carries the meaning, so phones get codes only. */}
            <span className="hidden h-3 w-[18px] overflow-hidden rounded-[2px] ring-1 ring-black/20 sm:block">
              {option.flag}
            </span>
            {option.code}
          </button>
        );
      })}
    </div>
  );
}
