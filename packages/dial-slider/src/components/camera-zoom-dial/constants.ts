export const CAMERA_ZOOM_DIAL_GEOMETRY = {
  /** Measured from the supplied 1180 px-wide iPhone recording. */
  DIAMETER_TO_WIDTH: 1.104,
  /** (2556 - 1551.6) / 1180: visible circle from its top to screen bottom. */
  VISIBLE_HEIGHT_TO_WIDTH: 0.852,
  DEGREES_PER_OCTAVE: 20,
  MINOR_TICK_LENGTH: 15,
  /** Major ticks use color and stroke width—not height—for emphasis. */
  MAJOR_TICK_LENGTH: 15,
  OUTER_TICK_INSET: 5,
  LABEL_INSET: 42,
  FOCAL_LABEL_INSET: 67,
  /** Measured at roughly 12×27 px in the 3× iPhone capture. */
  POINTER_HALF_WIDTH: 2,
  POINTER_HEIGHT: 9,
  /** Subtle rounding measured from the softened yellow marker in the capture. */
  POINTER_CORNER_RADIUS: 0.45,
  /** Extra clearance prevents anti-aliased tick edges bleeding through. */
  POINTER_OCCLUSION_PADDING: 1,
  /** The 90° cutout begins just below the yellow pointer's tip. */
  POINTER_OCCLUSION_APEX_OFFSET: 2,
  /** A narrow stem keeps the selected stroke hidden below the V-shaped cutout. */
  POINTER_OCCLUSION_TAIL_HALF_WIDTH: 1.5,
  /** The reference cutout is an isosceles triangle with a right-angle tip. */
  POINTER_OCCLUSION_APEX_ANGLE: 90,
  /** Softens all three mask corners without moving its conceptual anchor. */
  POINTER_OCCLUSION_CORNER_RADIUS: 1.25,
  /** Compact controls begin about 207 physical px below the circle top at 3x. */
  COMPACT_ROW_TOP: 69,
  LONG_PRESS_MS: 220,
  COLLAPSE_DELAY_MS: 1_200,
} as const;

export const CAMERA_ZOOM_DIAL_COLORS = {
  ACCENT: '#FFD60A',
  SURFACE: 'rgba(0, 0, 0, 0.5)',
  LABEL: '#FFFFFF',
  SECONDARY_LABEL: 'rgba(255, 255, 255, 0.32)',
  MINOR_TICK: 'rgba(255, 255, 255, 0.25)',
  MAJOR_TICK: 'rgba(255, 255, 255, 0.82)',
  COMPACT_SURFACE: 'rgba(28, 28, 30, 0.68)',
} as const;
