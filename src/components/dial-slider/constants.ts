export const DIAL_CONFIG = {
    /**
     * Horizontal distance (dp) per value unit.
     * Dense packing so ±100 fits a phone width with tick marks every 5 units.
     * (Not the classic ~8dp Apple wheel spacing — that targets fewer marks.)
     */
    TICK_SPACING: 1.5,
    TICK_HEIGHT: 14,
    TICK_WIDTH: 2,

    /** Height of the tick nearest the center indicator */
    CENTER_TICK_HEIGHT: 28,

    /** Tick mark interval along the ruler */
    TICK_STEP: 5,
    /** Major (brighter) ticks every N value units */
    MAJOR_TICK_EVERY: 50,

    /** Default value range (overridable via props) */
    MIN_VALUE: -100,
    MAX_VALUE: 100,

    /** Compact ring ~44dp outer diameter */
    RING_RADIUS: 22,
    RING_STROKE_WIDTH: 2,
    RING_BG_STROKE_WIDTH: 1.5,

    VALUE_FONT_SIZE: 14,
} as const;

export const COLORS = {
    POSITIVE: '#FFD700',
    NEGATIVE: '#FFFFFF',
    MINOR_TICK: '#3D3D3D',
    MAJOR_TICK: '#CCCCCC',
    RING_BG: '#444444',
    BACKGROUND: '#000000',
    ORIGIN_DOT: '#666666',
} as const;
