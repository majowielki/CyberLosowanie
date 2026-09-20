import { Gift, ScrollText, Sparkles, UserRound } from "lucide-react";
import CyberLogo from "@/assets/cyber2.svg";
import ProceedButton from "@/features/cyberki/ProceedButton";
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

        {/* The SVG has generous transparent padding — negative margins pull the
            visible artwork closer to the eyebrow and the tagline. */}
        <div className="relative -my-10 sm:-my-14">
          {/* Light source behind the tree. */}
          <div aria-hidden className="halo absolute inset-0 -z-10 scale-125 blur-2xl" />
          {/* Square artwork capped by viewport height too, so the tagline and
              the call to action stay above the fold on short laptop screens. */}
          <img
            src={CyberLogo}
            alt={t('landing.heroAlt')}
            className="w-[min(88vw,34rem,55vh)] drop-shadow-[0_30px_40px_rgba(0,0,0,0.45)] motion-safe:animate-float"
          />
        </div>

        <h1 className="font-display max-w-2xl text-balance text-4xl font-medium leading-[1.05] tracking-tight text-cream sm:text-5xl lg:text-6xl">
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
                <h3 className="font-display text-xl font-medium text-cream">{t(titleKey)}</h3>
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
