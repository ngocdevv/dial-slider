import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withDecay,
    withTiming,
    type SharedValue,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';

const {
    TICK_SPACING,
    TICK_HEIGHT,
    CENTER_TICK_HEIGHT,
    TICK_WIDTH,
    CENTER_TICK_WIDTH,
} = DIAL_CONFIG;

// ─── Types ────────────────────────────────────────────────────────────

interface DialRulerProps {
    value: SharedValue<number>;
    minValue: number;
    maxValue: number;
    onHapticTick?: () => void;
}

// ─── Tick (bottom-aligned, dynamic height) ────────────────────────────
// Position formula: tickValue * TICK_SPACING + translationX
// This gives (tickValue - currentValue) * TICK_SPACING → 0 when at center.

const Tick = React.memo(function Tick({
    tickValue,
    isMajor,
    translationX,
    screenCenter,
}: {
    tickValue: number;
    isMajor: boolean;
    translationX: SharedValue<number>;
    screenCenter: number;
}) {
    const tickX = tickValue * TICK_SPACING;

    const animStyle = useAnimatedStyle(() => {
        const x = tickX + translationX.value;
        const dist = Math.abs(x);
        const opacity = Math.max(0, 1 - dist / (screenCenter * 0.95));

        return {
            opacity,
            transform: [{ translateX: x }],
        };
    });

    const color = isMajor ? COLORS.MAJOR_TICK : COLORS.MINOR_TICK;

    return (
        <Animated.View
            style={[
                styles.tick,
                { width: TICK_WIDTH, backgroundColor: color },
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
        const opacity = Math.max(0, 1 - Math.abs(x) / 160);
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
    maxValue,
    onHapticTick,
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

    // Clamp: value range [minValue, maxValue] → translationX range
    const minTranslation = -maxValue * TICK_SPACING;
    const maxTranslation = -minValue * TICK_SPACING;

    const triggerHaptic = useCallback(() => {
        onHapticTick?.();
    }, [onHapticTick]);

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
        })
        .onEnd((e) => {
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
                if (onHapticTick) {
                    runOnJS(triggerHaptic)();
                }
            }
        }
    );

    return (
        <View style={styles.container}>
            <GestureDetector gesture={gesture}>
                <Animated.View style={styles.rulerArea}>
                    {/* Tick marks — only for values > 0, bottom-aligned */}
                    <View style={styles.ticksContainer}>
                        {ticks.map((tick) => (
                            <Tick
                                key={tick.val}
                                tickValue={tick.val}
                                isMajor={tick.isMajor}
                                translationX={translationX}
                                screenCenter={screenCenter}
                            />
                        ))}
                    </View>

                    {/* Origin dot — always at value 0 */}
                    <OriginDot translationX={translationX} />

                    {/* Center indicator — fixed yellow line */}
                    <View style={styles.centerIndicator} />
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
        bottom: CENTER_TICK_HEIGHT + 6,
    },
    centerIndicator: {
        position: 'absolute',
        bottom: 0,
        width: CENTER_TICK_WIDTH,
        height: CENTER_TICK_HEIGHT,
        backgroundColor: COLORS.POSITIVE,
        borderRadius: 1.5,
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
