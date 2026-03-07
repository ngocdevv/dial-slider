import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    cancelAnimation,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withDecay,
    withDelay,
    withSequence,
    withTiming,
    type SharedValue
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';

const {
    TICK_SPACING,
    TICK_HEIGHT,
    CENTER_TICK_HEIGHT,
    TICK_WIDTH
} = DIAL_CONFIG;

// ─── Types ────────────────────────────────────────────────────────────

interface DialRulerProps {
    value: SharedValue<number>;
    minValue: number;
    maxValue: number;
}

// ─── Tick (bottom-aligned, directional wave) ─────────────────────────
// Wave is one-sided: only ticks ahead of the sweep direction are affected.
// WAVE_RADIUS scales with drag velocity: faster = wider ripple.

const Tick = React.memo(function Tick({
    tickValue,
    isMajor,
    translationX,
    dragStartX,
    isDragging,
    screenCenter,
}: {
    tickValue: number;
    isMajor: boolean;
    translationX: SharedValue<number>;
    dragStartX: SharedValue<number>;
    isDragging: SharedValue<number>;
    screenCenter: number;
}) {
    const tickX = tickValue * TICK_SPACING;
    const TICK_STEP = 5;
    const heightAnim = useSharedValue(TICK_HEIGHT as number);
    const colorAnim = useSharedValue(0); // 0=MINOR, 1=MAJOR

    // Smooth height transition when nearest tick changes
    useAnimatedReaction(
        () => {
            const currentValue = -translationX.value / TICK_SPACING;
            const nearestTickVal = Math.round(currentValue / TICK_STEP) * TICK_STEP;
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
            // Did the value just cross this tick?
            const crossed =
                (prevVal < tickValue && currentVal >= tickValue) ||
                (prevVal > tickValue && currentVal <= tickValue);
            if (crossed) {
                // Pulse: bright → fade back
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

        // Cosine wave: tallest near current, drops off sharply toward start
        const distFromCurrent = Math.abs(currentVal - tickValue);
        const rawDist = rangeSize > 0 ? Math.min(distFromCurrent / rangeSize, 1) : 1;
        const normalizedDist = Math.sqrt(rawDist);
        const waveFactor = inRange
            ? ((Math.cos(normalizedDist * Math.PI) + 1) / 2) * isDragging.value
            : 0;
        const waveHeight = TICK_HEIGHT + (CENTER_TICK_HEIGHT - TICK_HEIGHT) * waveFactor;

        // Use animated height (smooth transition), but allow wave to override if taller
        const height = Math.max(heightAnim.value, waveHeight);

        // Color: yellow for nearest, smooth fade for wave
        const nearestTickVal = Math.round(currentVal / TICK_STEP) * TICK_STEP;
        const isNearest = tickValue === nearestTickVal;

        // Blend MINOR→MAJOR using animated colorAnim
        const r1 = 0x3D, g1 = 0x3D, b1 = 0x3D; // MINOR_TICK #3D3D3D
        const r2 = 0xCC, g2 = 0xCC, b2 = 0xCC; // MAJOR_TICK #CCCCCC
        const t = isMajor ? 1 : colorAnim.value;
        const r = Math.round(r1 + (r2 - r1) * t);
        const g = Math.round(g1 + (g2 - g1) * t);
        const b = Math.round(b1 + (b2 - b1) * t);
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
            style={[
                styles.tick,
                { width: TICK_WIDTH },
                animStyle,
            ]}
        />
    );
});

// ─── Origin Dot (always at value 0) ───────────────────────────────────

function OriginDot({
    translationX,
}: {
    translationX: SharedValue<number>;
}) {
    // Value 0 → position 0 * TICK_SPACING = 0
    const animStyle = useAnimatedStyle(() => {
        const x = translationX.value; // 0 + translationX
        // Hide when value is at 0 (origin dot overlaps current tick)
        const isAtZero = Math.abs(x) < 2;
        const fadeOpacity = Math.max(0, 1 - Math.abs(x) / 160);
        const opacity = isAtZero ? 0 : fadeOpacity;
        return {
            opacity,
            transform: [{ translateX: x }],
        };
    });

    return <Animated.View style={[styles.originDot, animStyle]} />;
}

// ─── Main DialRuler ───────────────────────────────────────────────────

export function DialRuler({
    value,
    minValue,
    maxValue
}: DialRulerProps) {
    const { width: screenWidth } = useWindowDimensions();
    const screenCenter = screenWidth / 2;

    // 20 ticks per side (step = 5), major = multiples of 10 (white)
    const ticks = useMemo(() => {
        const result: { val: number; isMajor: boolean }[] = [];
        for (let val = minValue; val <= maxValue; val += 5) {
            result.push({ val, isMajor: val % 50 === 0 });
        }
        return result;
    }, [minValue, maxValue]);

    const translationX = useSharedValue(-value.value * TICK_SPACING);
    const startX = useSharedValue(0);
    const isDragging = useSharedValue(0);
    const dragVelocity = useSharedValue(0);

    // Clamp: value range [minValue, maxValue] → translationX range
    const minTranslation = -maxValue * TICK_SPACING;
    const maxTranslation = -minValue * TICK_SPACING;


    const gesture = Gesture.Pan()
        .onBegin(() => {
            startX.value = translationX.value;
        })
        .onUpdate((e) => {
            const newX = startX.value + e.translationX;
            translationX.value = Math.max(
                minTranslation,
                Math.min(maxTranslation, newX)
            );
            // Track velocity for directional wave
            dragVelocity.value = e.velocityX;
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
                            Math.round(translationX.value / TICK_SPACING) * TICK_SPACING;
                        translationX.value = withTiming(snapped, { duration: 120 });
                    }
                }
            );
        });

    // Continuously sync translationX → value (covers both pan + decay)
    useAnimatedReaction(
        () => Math.round(-translationX.value / TICK_SPACING),
        (current, previous) => {
            if (current !== previous) {
                value.value = current;
            }
        }
    );

    return (
        <View style={styles.container}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={styles.rulerArea}>
                    {/* Origin dot — always at value 0 */}
                    <OriginDot translationX={translationX} />

                    {/* Tick marks — only for values > 0, bottom-aligned */}
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
                            />
                        ))}
                    </View>

                    {/* No separate center indicator — the tick at current value acts as it */}
                </Animated.View>
            </GestureDetector>

            {/* Edge gradient masks */}
            <LinearGradient
                colors={['#000000', 'transparent']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.leftMask}
                pointerEvents="none"
            />
            <LinearGradient
                colors={['transparent', '#000000']}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={styles.rightMask}
                pointerEvents="none"
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
        borderRadius: 1
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
    },
    rightMask: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: MASK_WIDTH,
    },
});
