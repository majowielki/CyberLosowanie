import { Gift, ScrollText, Sparkles, UserRound } from "lucide-react";
import ProceedButton from "@/features/cyberki/ProceedButton";
import HeroTree from "./HeroTree";
import { TranslationKey, useTranslation } from "@/shared/i18n";

const STEPS: Array<{ titleKey: TranslationKey; bodyKey: TranslationKey; icon: typeof Gift }> = [
  { titleKey: 'landing.step1.title', bodyKey: 'landing.step1.body', icon: UserRound },
  { titleKey: 'landing.step2.title', bodyKey: 'landing.step2.body', icon: Gift },
  { titleKey: 'landing.step3.title', bodyKey: 'landing.step3.body', icon: ScrollText },
];

/** Landing: hero artwork + tagline + call to action, then the three-step explainer. */
function Landing() {
  const { t } = useTranslation();

  return (
    <div className="flex w-full flex-col items-center gap-16 sm:gap-24">
      {/* Hero */}
      <section className="flex flex-col items-center text-center animate-fade-up">
        <span className="eyebrow">
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
          {t('landing.eyebrow')}
          <Sparkles className="h-3.5 w-3.5" aria-hidden />
        </span>

        <div className="relative mt-4">
          {/* Light source behind the tree. */}
          <div aria-hidden className="halo absolute inset-0 -z-10 scale-110 blur-2xl" />
          {/* Wide 3:2 artwork capped by viewport height too, so the tagline and
              the call to action stay close to the fold on short laptop screens. */}
          <HeroTree
            alt={t('landing.heroAlt')}
            className="w-[min(94vw,60rem,75vh)] drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] motion-safe:animate-float"
          />
        </div>

        {/* Same wordmark as the navbar logo, sized as the sign under the tree. */}
        <p className="font-display mt-2 text-5xl tracking-tight text-cream sm:text-6xl lg:text-7xl">
          Cyber<span className="text-gold">Losowanie</span>
        </p>

        {/* Ornament between the wordmark and the tagline; the tagline is set in
            the text face, so the wordmark stays the only display lettering. */}
        <div aria-hidden className="mt-5 flex items-center gap-3 text-gold/80">
          <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold/60 sm:w-24" />
          <Sparkles className="h-4 w-4" />
          <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold/60 sm:w-24" />
        </div>

        <h1 className="mt-5 max-w-2xl text-balance text-2xl font-semibold leading-snug tracking-tight text-cream sm:text-3xl lg:text-4xl">
          {t('landing.tagline')}
        </h1>
        <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-cream-muted sm:text-lg">
          {t('landing.subtitle')}
        </p>
        <div className="mt-8">
          <ProceedButton />
        </div>
      </section>

      {/* How it works */}
      <section aria-labelledby="how-it-works" className="w-full max-w-5xl">
        <h2 id="how-it-works" className="eyebrow mb-6 w-full justify-center">
          {t('landing.steps.title')}
        </h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map(({ titleKey, bodyKey, icon: Icon }, index) => (
            <li
              key={titleKey}
              className="glass flex flex-col gap-4 p-6 transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gold/15 text-gold">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-display text-3xl text-cream/25">0{index + 1}</span>
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold text-cream">{t(titleKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-cream-muted">{t(bodyKey)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

export default Landing;
