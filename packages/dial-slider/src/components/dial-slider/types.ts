import type { ReactNode } from 'react';

export interface DialPresetIconState {
  selected: boolean;
  adjusted: boolean;
  value: number;
}

export interface DialPreset {
  /** Stable, non-empty identifier used as the key in the values map. */
  id: string;
  /** VoiceOver and TalkBack label. */
  label: string;
  /** Static node or renderer for selected and adjusted visual states. */
  icon: ReactNode | ((state: DialPresetIconState) => ReactNode);
  minValue?: number;
  maxValue?: number;
  initialValue?: number;
  /** Accessibility increment/decrement amount (default: 1). */
  step?: number;
  formatValue?: (value: number) => string;
  disabled?: boolean;
}

export type DialSliderValues = Readonly<Record<string, number>>;

export interface DialSliderProps {
  /**
   * Adjustment tools to render. One item renders a centered tool; multiple
   * items render the horizontally scrollable preset strip.
   */
  presets: readonly DialPreset[];
  /** Initial selection for uncontrolled use. Ignored when selectedPresetId is set. */
  initialPresetId?: string;
  /** Controlled selected preset identifier. */
  selectedPresetId?: string;
  /** Controlled values map. Missing or invalid entries use preset defaults. */
  values?: DialSliderValues;
  /** Initial values for uncontrolled use. Later changes are intentionally ignored. */
  defaultValues?: DialSliderValues;
  /** Called after a user request or an uncontrolled fallback changes selection. */
  onPresetChange?: (presetId: string, value: number) => void;
  /** Called for each committed integer dial value. */
  onValueChange?: (
    presetId: string,
    value: number,
    values: DialSliderValues
  ) => void;
  /** Called with the complete proposed values map whenever a value changes. */
  onValuesChange?: (values: DialSliderValues) => void;
  accentColor?: string;
  adjustedColor?: string;
  backgroundColor?: string;
  /** Overrides the active preset label on the adjustable ruler. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}
