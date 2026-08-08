import type { ReactNode } from 'react';

export interface DialPresetIconState {
    selected: boolean;
    adjusted: boolean;
    value: number;
}

export interface DialPreset {
    /** Stable identifier used as the key in the values map */
    id: string;
    /** VoiceOver/TalkBack label */
    label: string;
    /** Static node or renderer for selected/adjusted visual states */
    icon: ReactNode | ((state: DialPresetIconState) => ReactNode);
    minValue?: number;
    maxValue?: number;
    initialValue?: number;
    /** Accessibility increment/decrement amount (default: 1) */
    step?: number;
    formatValue?: (value: number) => string;
    disabled?: boolean;
}

export interface DialSliderProps {
    /**
     * Adjustment tools to render. Length is controlled by the caller
     * (e.g. `PHOTO_PRESETS`): one item = single tool, many = strip.
     */
    presets: readonly DialPreset[];
    initialPresetId?: string;
    onPresetChange?: (presetId: string, value: number) => void;
    onValueChange?: (
        presetId: string,
        value: number,
        values: Readonly<Record<string, number>>
    ) => void;
    onValuesChange?: (values: Readonly<Record<string, number>>) => void;
    accentColor?: string;
    adjustedColor?: string;
    backgroundColor?: string;
    testID?: string;
}
