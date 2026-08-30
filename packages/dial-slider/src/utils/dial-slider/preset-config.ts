import { DIAL_CONFIG } from '../../components/dial-slider/constants';
import type { DialPreset } from '../../components/dial-slider/types';
import { clampDialValue, normalizeDialRange } from './dial-math';

export function getPresetRange(preset: DialPreset) {
  return normalizeDialRange(
    preset.minValue ?? DIAL_CONFIG.MIN_VALUE,
    preset.maxValue ?? DIAL_CONFIG.MAX_VALUE,
    DIAL_CONFIG.MIN_VALUE,
    DIAL_CONFIG.MAX_VALUE
  );
}

export function getPresetInitialValue(preset: DialPreset) {
  const { min, max } = getPresetRange(preset);
  const requestedInitial = Number.isFinite(preset.initialValue)
    ? (preset.initialValue as number)
    : 0;
  return clampDialValue(requestedInitial, min, max);
}

export function createInitialPresetValues(presets: readonly DialPreset[]) {
  return Object.fromEntries(
    presets.map((preset) => [preset.id, getPresetInitialValue(preset)])
  );
}

/**
 * Creates a complete, clamped map from a partial controlled/default map.
 * Missing and non-finite entries fall back to each preset's initial value.
 */
export function resolvePresetValues(
  presets: readonly DialPreset[],
  requestedValues?: Readonly<Record<string, number>>
) {
  return Object.fromEntries(
    presets.map((preset) => {
      const { min, max } = getPresetRange(preset);
      const requested = requestedValues?.[preset.id];
      const value = Number.isFinite(requested)
        ? clampDialValue(requested as number, min, max)
        : getPresetInitialValue(preset);
      return [preset.id, value];
    })
  );
}
