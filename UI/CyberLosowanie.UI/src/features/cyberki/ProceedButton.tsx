import { useNavigate } from "react-router-dom";
import { Gift, LogIn, LucideIcon, PartyPopper, UserRound } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { useSelector } from "react-redux";
import { RootState } from "@/app/store";
import { TranslationKey, useTranslation } from "@/shared/i18n";

interface DrawPhase {
  path: string;
  labelKey: TranslationKey;
  icon: LucideIcon;
  /** 1-based step of the landing "how it works" list; null once the draw is done. */
  step: number | null;
}

// Labels mirror the landing steps, so the button names the step the user is on.
const PICK_YOURSELF: DrawPhase = { path: "/select-your-cyberek", labelKey: 'cyberki.proceed.pickYourself', icon: UserRound, step: 1 };
const OPEN_BOX: DrawPhase = { path: "/choose-to-be-gifted-cyberek", labelKey: 'cyberki.proceed.openBox', icon: Gift, step: 2 };
const SEE_RESULT: DrawPhase = { path: "/final-page", labelKey: 'cyberki.proceed.seeResult', icon: PartyPopper, step: null };

/** Landing call-to-action: resumes the draw where the user left off, or sends to login. */
const ProceedButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useSelector((state: RootState) => state.userAuthStore.id);
  const userHasCyberekId = useSelector((state: RootState) => state.userAuthStore.cyberekId);
  const userHasGiftedCyberekId = useSelector((state: RootState) => state.userAuthStore.giftedCyberekId);

  if (!user) {
    return (
      <Button size="lg" onClick={() => navigate("/login")}>
        <LogIn aria-hidden />
        {t('cyberki.proceed.signIn')}
      </Button>
    );
  }

  const phase = userHasGiftedCyberekId != null
    ? SEE_RESULT
    : userHasCyberekId != null
      ? OPEN_BOX
      : PICK_YOURSELF;
  const Icon = phase.icon;

  return (
    <div className="flex flex-col items-center gap-2">
      <Button size="lg" onClick={() => navigate(phase.path)}>
        <Icon aria-hidden />
        {t(phase.labelKey)}
      </Button>
      <p className="text-sm text-cream-muted">
        {phase.step != null
          ? t('cyberki.proceed.step', { step: phase.step })
          : t('cyberki.proceed.done')}
      </p>
    </div>
  );
};

export default ProceedButton;
