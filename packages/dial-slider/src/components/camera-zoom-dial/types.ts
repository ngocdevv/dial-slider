import type { StyleProp, ViewStyle } from 'react-native';

export interface CameraZoomStop {
  /** Positive zoom factor; normalized to the nearest configured step. */
  value: number;
  /** Circular wheel label. Defaults to the numeric zoom factor without `x`. */
  label?: string;
  /** Compact inactive label. Defaults to `label`, or camera-style numeric text. */
  compactLabel?: string;
  /** Optional equivalent focal length, for example `13MM` or `26MM`. */
  focalLength?: string;
}

export interface CameraZoomDialProps {
  /** Smallest supported zoom factor. Must be positive. Defaults to `0.5`. */
  minZoom?: number;
  /** Largest supported zoom factor. Must exceed minZoom. Defaults to `10`. */
  maxZoom?: number;
  /** Display/callback precision. Defaults to `0.1`. */
  step?: number;
  /** Controlled zoom factor. */
  value?: number;
  /** Initial uncontrolled zoom factor. Defaults to `1` when it is in range. */
  defaultValue?: number;
  /**
   * Optical or quick-zoom stops shown in the compact control and on the wheel.
   * Empty or entirely invalid input falls back to the default in-range stops.
   */
  zoomStops?: readonly CameraZoomStop[];
  /** Controlled expanded state. */
  expanded?: boolean;
  /** Initial expanded state for uncontrolled use. Defaults to `false`. */
  defaultExpanded?: boolean;
  /** Reports compact/wheel state requests. */
  onExpandedChange?: (expanded: boolean) => void;
  /** Reports each crossed zoom step while dragging or animating. */
  onZoomChange?: (zoom: number) => void;
  onInteractionStart?: () => void;
  /** Reports the final snapped zoom factor after a drag. */
  onInteractionEnd?: (zoom: number) => void;
  formatValue?: (zoom: number) => string;
  accentColor?: string;
  surfaceColor?: string;
  labelColor?: string;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}
