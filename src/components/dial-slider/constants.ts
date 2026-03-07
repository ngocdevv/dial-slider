export const DIAL_CONFIG = {
    // Tick spacing & dimensions
    TICK_SPACING: 14,
    MINOR_TICK_HEIGHT: 20,
    MAJOR_TICK_HEIGHT: 32,
    CENTER_TICK_HEIGHT: 56,
    TICK_WIDTH: 2,
    CENTER_TICK_WIDTH: 3,

    // Value range
    MIN_VALUE: -100,
    MAX_VALUE: 100,

    // Ring
    RING_RADIUS: 56,
    RING_STROKE_WIDTH: 3,
    RING_BG_STROKE_WIDTH: 2,

    // Value display
    VALUE_FONT_SIZE: 48,

    // Visible tick count (how many ticks to render on each side of center)
    VISIBLE_TICKS_HALF: 25,
} as const;

export const COLORS = {
    POSITIVE: '#FFD700',
    NEGATIVE: '#FFFFFF',
    MINOR_TICK: '#444444',
    MAJOR_TICK: '#999999',
    RING_BG: '#333333',
    BACKGROUND: '#000000',
    ORIGIN_DOT: '#666666',
} as const;
