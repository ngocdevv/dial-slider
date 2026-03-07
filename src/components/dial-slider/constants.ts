export const DIAL_CONFIG = {
    // ─── Tick spacing & dimensions ─────────────────
    // Apple iOS dial uses ~8dp between ticks with 20 ticks per side
    TICK_SPACING: 2,
    TICK_HEIGHT: 16,
    TICK_WIDTH: 2,

    // Center indicator
    CENTER_TICK_HEIGHT: 28,
    CENTER_TICK_WIDTH: 2.5,

    // ─── Value range (defaults, overridable via props) ─────
    MIN_VALUE: -100,
    MAX_VALUE: 100,

    // ─── Ring ──────────────────────────────────────
    // Compact circle matching Apple's ~44dp diameter
    RING_RADIUS: 22,
    RING_STROKE_WIDTH: 2,
    RING_BG_STROKE_WIDTH: 1.5,

    // ─── Value display ─────────────────────────────
    VALUE_FONT_SIZE: 14,

    // ─── Spacing ───────────────────────────────────
    GAP_RING_RULER: 8,
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
