import { DIAL_CONFIG } from '@/components/dial-slider/constants';
import type { DialPreset } from '@/components/dial-slider/types';
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
