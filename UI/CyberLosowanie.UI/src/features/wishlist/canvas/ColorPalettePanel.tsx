import { useState } from 'react';
import { Pipette } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { TranslationKey, useTranslation } from '@/shared/i18n';
import { EYEDROPPER_SHORTCUT, PEN_COLORS } from './canvasConstants';
import { HsvColor, hexToHsv, hsvToHex } from './strokeStyles';

const RAINBOW = 'conic-gradient(#f43f5e, #f59e0b, #84cc16, #06b6d4, #6366f1, #d946ef, #f43f5e)';
const HUE_GRADIENT =
  'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';

interface ColorPalettePanelProps {
  color: string;
  onColorChange: (color: string) => void;
  /** A preset was picked — the flyout closes. */
  onPicked: () => void;
  /** Eyedropper: take the colour from the page with the next press on it. */
  onPickFromPage: () => void;
  isPickingColor: boolean;
}

/**
 * Body of the toolbar's colour flyout: the preset swatches plus "any colour"
 * as hue / saturation / value sliders. An in-app picker rather than
 * <input type="color">: Chrome on Android opens its sliders at zero whatever
 * the input's value, so the hue slider showed only black.
 */
function ColorPalettePanel({
  color,
  onColorChange,
  onPicked,
  onPickFromPage,
  isPickingColor,
}: ColorPalettePanelProps) {
  const { t } = useTranslation();
  const isCustomColor = !(PEN_COLORS as readonly string[]).includes(color);
  // The sliders own the HSV state (hex alone loses the hue of greys); they
  // start from the custom colour, or from the current hue at full saturation
  // and brightness so moving the hue visibly changes the colour.
  const [hsv, setHsv] = useState<HsvColor | null>(() => (isCustomColor ? hexToHsv(color) : null));

  const applyHsv = (next: HsvColor) => {
    setHsv(next);
    onColorChange(hsvToHex(next));
  };

  return (
    <div className="flex w-60 flex-col gap-3">
      <div className="grid grid-cols-6 gap-2" role="group" aria-label={t('wishlist.toolbar.colorGroup')}>
        {PEN_COLORS.map((penColor) => (
          <button
            key={penColor}
            type="button"
            title={t('wishlist.toolbar.colorOption', { color: penColor })}
            aria-label={t('wishlist.toolbar.colorOption', { color: penColor })}
            aria-pressed={color === penColor}
            onClick={() => {
              onColorChange(penColor);
              onPicked();
            }}
            className={cn(
              'h-8 w-8 rounded-full border border-gray-300 transition-transform hover:scale-110',
              color === penColor && 'ring-2 ring-sky-500 ring-offset-1',
            )}
            style={{ backgroundColor: penColor }}
          />
        ))}
        {/* Any colour: shows the custom colour once there is one. */}
        <button
          type="button"
          title={t('wishlist.toolbar.customColor')}
          aria-label={t('wishlist.toolbar.customColor')}
          aria-expanded={hsv !== null}
          onClick={() => applyHsv(hsv ?? { h: hexToHsv(color).h, s: 1, v: 1 })}
          className={cn(
            'h-8 w-8 rounded-full border border-gray-300 transition-transform hover:scale-110',
            isCustomColor && 'ring-2 ring-sky-500 ring-offset-1',
          )}
          style={isCustomColor ? { backgroundColor: color } : { background: RAINBOW }}
        />
      </div>

      <button
        type="button"
        title={`${t('wishlist.toolbar.eyedropper')} (${EYEDROPPER_SHORTCUT})`}
        aria-keyshortcuts={EYEDROPPER_SHORTCUT}
        aria-pressed={isPickingColor}
        onClick={onPickFromPage}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg px-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100',
          isPickingColor && 'bg-gray-200 ring-1 ring-sky-500',
        )}
      >
        <Pipette className="h-4 w-4" aria-hidden />
        {t('wishlist.toolbar.eyedropper')}
      </button>

      {hsv && (
        <div className="flex flex-col gap-2.5 border-t border-gray-200 pt-3">
          <ColorSlider
            labelKey="wishlist.toolbar.customHue"
            value={hsv.h}
            max={360}
            background={HUE_GRADIENT}
            thumbColor={hsvToHex({ h: hsv.h, s: 1, v: 1 })}
            onChange={(h) => applyHsv({ ...hsv, h })}
          />
          <ColorSlider
            labelKey="wishlist.toolbar.customSaturation"
            value={Math.round(hsv.s * 100)}
            max={100}
            background={`linear-gradient(to right, ${hsvToHex({ ...hsv, s: 0 })}, ${hsvToHex({ ...hsv, s: 1 })})`}
            thumbColor={hsvToHex(hsv)}
            onChange={(s) => applyHsv({ ...hsv, s: s / 100 })}
          />
          <ColorSlider
            labelKey="wishlist.toolbar.customValue"
            value={Math.round(hsv.v * 100)}
            max={100}
            background={`linear-gradient(to right, #000000, ${hsvToHex({ ...hsv, v: 1 })})`}
            thumbColor={hsvToHex(hsv)}
            onChange={(v) => applyHsv({ ...hsv, v: v / 100 })}
          />
        </div>
      )}
    </div>
  );
}

interface ColorSliderProps {
  labelKey: TranslationKey;
  value: number;
  max: number;
  /** Track gradient: what moving this slider does to the colour. */
  background: string;
  thumbColor: string;
  onChange: (value: number) => void;
}

function ColorSlider({ labelKey, value, max, background, thumbColor, onChange }: ColorSliderProps) {
  const { t } = useTranslation();
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-gray-600">
      {t(labelKey)}
      <input
        type="range"
        min={0}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="color-slider"
        style={{ background, ['--thumb-color' as string]: thumbColor }}
      />
    </label>
  );
}

export default ColorPalettePanel;
