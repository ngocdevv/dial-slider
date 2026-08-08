import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    cancelAnimation,
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withDecay,
    withDelay,
    withSequence,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';
import { buildDialTickValues, getNearestDialTick } from './dial-math';

const {
    TICK_SPACING,
    TICK_HEIGHT,
    CENTER_TICK_HEIGHT,
    TICK_WIDTH,
    TICK_STEP,
    MAJOR_TICK_EVERY,
} = DIAL_CONFIG;
const MAX_RENDERED_TICKS = 201;

// ─── Types ────────────────────────────────────────────────────────────

interface DialRulerProps {
    value: SharedValue<number>;
    /** Plain number — avoid reading shared value during render */
    initialValue: number;
    minValue: number;
    maxValue: number;
    /** Edge fade color; should match the surface behind the ruler */
    fadeColor?: string;
    /** Called when the pan gesture begins */
    onInteractionStart?: () => void;
    /** Called when the pan gesture ends or is cancelled */
    onInteractionEnd?: () => void;
    /** Disable ruler gestures while preserving its visual state */
    enabled?: boolean;
    /** Invalidates decay/value callbacks when the owning preset changes */
    interactionRevision?: SharedValue<number>;
}

// Parse #RRGGBB once on JS thread for worklet color blends
function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

const MINOR_RGB = hexToRgb(COLORS.MINOR_TICK);
const MAJOR_RGB = hexToRgb(COLORS.MAJOR_TICK);

// ─── Tick (bottom-aligned, directional wave) ─────────────────────────
// Wave is one-sided: only ticks in the drag range are affected.

const Tick = React.memo(function Tick({
    tickValue,
    isMajor,
    translationX,
    dragStartX,
    isDragging,
    screenCenter,
    tickValues,
}: {
    tickValue: number;
    isMajor: boolean;
    translationX: SharedValue<number>;
    dragStartX: SharedValue<number>;
    isDragging: SharedValue<number>;
    screenCenter: number;
    tickValues: readonly number[];
}) {
    const tickX = tickValue * TICK_SPACING;
    const heightAnim = useSharedValue(TICK_HEIGHT as number);
    const colorAnim = useSharedValue(0); // 0=MINOR, 1=MAJOR

    // Smooth height transition when nearest tick changes
    useAnimatedReaction(
        () => {
            const currentValue = -translationX.value / TICK_SPACING;
            const nearestTickVal = getNearestDialTick(
                currentValue,
                tickValues
            );
            return tickValue === nearestTickVal;
        },
        (isNearest, wasNearest) => {
            if (isNearest !== wasNearest) {
                heightAnim.value = withTiming(
                    isNearest ? CENTER_TICK_HEIGHT : TICK_HEIGHT,
                    { duration: 150 }
                );
            }
        }
    );

    // Sequential color pulse: each tick lights up as value crosses it
    useAnimatedReaction(
        () => Math.round(-translationX.value / TICK_SPACING),
        (currentVal, prevVal) => {
            if (prevVal === null) return;
            const crossed =
                (prevVal < tickValue && currentVal >= tickValue) ||
                (prevVal > tickValue && currentVal <= tickValue);
            if (crossed) {
                cancelAnimation(colorAnim);
                colorAnim.value = withSequence(
                    withTiming(1, { duration: 0 }),
                    withTiming(0, { duration: 300 })
                );
            }
        }
    );

    const animStyle = useAnimatedStyle(() => {
        const x = tickX + translationX.value;
        const dist = Math.abs(x);
        const opacity = Math.max(0, 1 - dist / (screenCenter * 0.95));

        // Wave: spans from drag start position to current position
        const startVal = -dragStartX.value / TICK_SPACING;
        const currentVal = -translationX.value / TICK_SPACING;
        const lo = Math.min(startVal, currentVal);
        const hi = Math.max(startVal, currentVal);
        const rangeSize = hi - lo;

        const inRange = tickValue >= lo && tickValue <= hi && rangeSize > 0;

        // Cosine wave: tallest near current, drops off toward start
        const distFromCurrent = Math.abs(currentVal - tickValue);
        const rawDist =
            rangeSize > 0 ? Math.min(distFromCurrent / rangeSize, 1) : 1;
        const normalizedDist = Math.sqrt(rawDist);
        const waveFactor = inRange
            ? ((Math.cos(normalizedDist * Math.PI) + 1) / 2) * isDragging.value
            : 0;
        const waveHeight =
            TICK_HEIGHT + (CENTER_TICK_HEIGHT - TICK_HEIGHT) * waveFactor;

        const height = Math.max(heightAnim.value, waveHeight);

        const nearestTickVal = getNearestDialTick(currentVal, tickValues);
        const isNearest = tickValue === nearestTickVal;

        const t = isMajor ? 1 : colorAnim.value;
        const r = Math.round(MINOR_RGB.r + (MAJOR_RGB.r - MINOR_RGB.r) * t);
        const g = Math.round(MINOR_RGB.g + (MAJOR_RGB.g - MINOR_RGB.g) * t);
        const b = Math.round(MINOR_RGB.b + (MAJOR_RGB.b - MINOR_RGB.b) * t);
        const blendedColor = `rgb(${r},${g},${b})`;

        return {
            height,
            opacity,
            backgroundColor: isNearest ? COLORS.POSITIVE : blendedColor,
            transform: [{ translateX: x }],
        };
    });

    return (
        <Animated.View
            style={[styles.tick, { width: TICK_WIDTH }, animStyle]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        />
    );
});

// ─── Origin Dot (always at value 0) ───────────────────────────────────

function OriginDot({ translationX }: { translationX: SharedValue<number> }) {
    const animStyle = useAnimatedStyle(() => {
        const x = translationX.value;
        const isAtZero = Math.abs(x) < 2;
        const fadeOpacity = Math.max(0, 1 - Math.abs(x) / 160);
        const opacity = isAtZero ? 0 : fadeOpacity;
        return {
            opacity,
            transform: [{ translateX: x }],
        };
    });

    return (
        <Animated.View
            style={[styles.originDot, animStyle]}
            accessible={false}
            importantForAccessibility="no"
        />
    );
}

// ─── Main DialRuler ───────────────────────────────────────────────────

export function DialRuler({
    value,
    initialValue,
    minValue,
    maxValue,
    fadeColor = COLORS.BACKGROUND,
    onInteractionStart,
    onInteractionEnd,
    enabled = true,
    interactionRevision,
}: DialRulerProps) {
    const { width: screenWidth } = useWindowDimensions();
    const screenCenter = screenWidth / 2;

    const tickValues = useMemo(
        () =>
            buildDialTickValues(
                minValue,
                maxValue,
                TICK_STEP,
                MAX_RENDERED_TICKS
            ),
        [minValue, maxValue]
    );
    const ticks = useMemo(() => {
        return tickValues.map((val) => ({
            val,
            isMajor: val % MAJOR_TICK_EVERY === 0,
        }));
    }, [tickValues]);

    // value → translation: x = -value * spacing
    const minTranslation = -maxValue * TICK_SPACING;
    const maxTranslation = -minValue * TICK_SPACING;

    // Use plain initialValue prop — never read shared value.value during render
    const initialTranslation = Math.max(
        minTranslation,
        Math.min(maxTranslation, -initialValue * TICK_SPACING)
    );

    const translationX = useSharedValue(initialTranslation);
    const startX = useSharedValue(initialTranslation);
    const isDragging = useSharedValue(0);
    const isGestureActive = useSharedValue(0);
    const gestureRevision = useSharedValue(0);
    const isProgrammaticMove = useSharedValue(0);

    const interactionStartRef = useRef(onInteractionStart);
    const interactionEndRef = useRef(onInteractionEnd);
    interactionStartRef.current = onInteractionStart;
    interactionEndRef.current = onInteractionEnd;

    const notifyInteractionStart = useCallback(() => {
        interactionStartRef.current?.();
    }, []);
    const notifyInteractionEnd = useCallback(() => {
        interactionEndRef.current?.();
    }, []);

    const gesture = Gesture.Pan()
        .enabled(enabled)
        .onBegin(() => {
            cancelAnimation(translationX);
            isProgrammaticMove.value = 0;
            isGestureActive.value = 1;
            gestureRevision.value = interactionRevision
                ? interactionRevision.value
                : 0;
            startX.value = translationX.value;
            runOnJS(notifyInteractionStart)();
        })
        .onUpdate((e) => {
            const newX = startX.value + e.translationX;
            translationX.value = Math.max(
                minTranslation,
                Math.min(maxTranslation, newX)
            );
            // Wave: active while moving, auto-fade after 100ms idle
            cancelAnimation(isDragging);
            isDragging.value = withSequence(
                withTiming(1, { duration: 0 }),
                withDelay(100, withTiming(0, { duration: 200 }))
            );
        })
        .onEnd((e) => {
            isDragging.value = withTiming(0, { duration: 200 });
            translationX.value = withDecay(
                {
                    velocity: e.velocityX,
                    clamp: [minTranslation, maxTranslation],
                    deceleration: 0.997,
                },
                (finished) => {
                    if (finished) {
                        const snapped =
                            Math.round(translationX.value / TICK_SPACING) *
                            TICK_SPACING;
                        translationX.value = withTiming(snapped, {
                            duration: 120,
                        });
                    }
                }
            );
        })
        .onFinalize(() => {
            isGestureActive.value = 0;
            runOnJS(notifyInteractionEnd)();
        });

    // translationX → value (pan + decay)
    useAnimatedReaction(
        () => Math.round(-translationX.value / TICK_SPACING),
        (current, previous) => {
            if (isProgrammaticMove.value !== 0) return;
            if (
                interactionRevision &&
                gestureRevision.value !== interactionRevision.value
            ) {
                return;
            }
            if (current !== previous && current !== Math.round(value.value)) {
                value.value = current;
            }
        }
    );

    // value → translationX (a11y / external writes). Skip while dragging.
    useAnimatedReaction(
        () => ({
            value: Math.round(value.value),
            gestureActive: isGestureActive.value,
            revision: interactionRevision ? interactionRevision.value : 0,
        }),
        (current, previous) => {
            if (previous === null) return;
            if (current.gestureActive !== 0) return;

            const revisionChanged = current.revision !== previous.revision;
            if (revisionChanged) cancelAnimation(translationX);

            const fromX = Math.round(-translationX.value / TICK_SPACING);
            if (fromX === current.value) {
                if (revisionChanged) isProgrammaticMove.value = 0;
                return;
            }

            const target = Math.max(
                minTranslation,
                Math.min(maxTranslation, -current.value * TICK_SPACING)
            );
            cancelAnimation(translationX);
            isProgrammaticMove.value = 1;
            translationX.value = withTiming(
                target,
                { duration: 120 },
                () => {
                    isProgrammaticMove.value = 0;
                }
            );
        }
    );

    return (
        <View
            style={styles.container}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        >
            <GestureDetector gesture={gesture}>
                <Animated.View style={styles.rulerArea}>
                    <OriginDot translationX={translationX} />

                    <View style={styles.ticksContainer}>
                        {ticks.map((tick) => (
                            <Tick
                                key={tick.val}
                                tickValue={tick.val}
                                isMajor={tick.isMajor}
                                translationX={translationX}
                                dragStartX={startX}
                                isDragging={isDragging}
                                screenCenter={screenCenter}
                                tickValues={tickValues}
                            />
                        ))}
                    </View>
                </Animated.View>
            </GestureDetector>

            <LinearGradient
                colors={[fadeColor, 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.leftMask}
            />
            <LinearGradient
                colors={['transparent', fadeColor]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.rightMask}
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────

const RULER_HEIGHT = CENTER_TICK_HEIGHT + 24;
const MASK_WIDTH = 80;

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: RULER_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    rulerArea: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    ticksContainer: {
        position: 'absolute',
        bottom: 0,
        left: '50%',
        flexDirection: 'row',
        alignItems: 'flex-end',
    },
    tick: {
        position: 'absolute',
        bottom: 0,
        height: TICK_HEIGHT,
        borderRadius: 1,
    },
    originDot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.ORIGIN_DOT,
        bottom: TICK_HEIGHT + 6,
    },
    leftMask: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: MASK_WIDTH,
        pointerEvents: 'none',
    },
    rightMask: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: MASK_WIDTH,
        pointerEvents: 'none',
    },
});
