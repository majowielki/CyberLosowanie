import { Sparkles } from 'lucide-react';
import { useTranslation } from '@/shared/i18n';

/** Minimal footer: brand · seasonal greeting. Keeps the page from ending abruptly. */
function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="align-element mt-auto flex flex-col items-center justify-between gap-2 py-8 text-xs text-cream-muted/80 sm:flex-row">
      <span className="font-display text-sm text-cream/80">CyberLosowanie</span>
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden />
        {t('common.footer.greeting')}
      </span>
    </footer>
  );
}

export default Footer;
