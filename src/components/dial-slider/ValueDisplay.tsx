import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    type SharedValue,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';
import { ProgressRing } from './ProgressRing';

const { RING_RADIUS, RING_STROKE_WIDTH, VALUE_FONT_SIZE } = DIAL_CONFIG;
const CIRCLE_SIZE = (RING_RADIUS + RING_STROKE_WIDTH) * 2;

interface ValueDisplayProps {
    value: SharedValue<number>;
    /** Plain number — avoid reading shared value during render */
    initialValue: number;
    minValue: number;
    maxValue: number;
}

export function ValueDisplay({
    value,
    initialValue,
    minValue,
    maxValue,
}: ValueDisplayProps) {
    const [displayText, setDisplayText] = useState(
        () => `${Math.round(initialValue)}`
    );

    useAnimatedReaction(
        () => Math.round(value.value),
        (current, previous) => {
            if (current !== previous) {
                runOnJS(setDisplayText)(`${current}`);
            }
        }
    );

    const textStyle = useAnimatedStyle(() => ({
        color: value.value >= 0 ? COLORS.POSITIVE : COLORS.NEGATIVE,
    }));

    return (
        <View
            style={styles.container}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        >
            <ProgressRing value={value} minValue={minValue} maxValue={maxValue} />
            <View style={styles.textContainer}>
                <Animated.Text
                    style={[styles.valueText, textStyle]}
                    accessible={false}
                >
                    {displayText}
                </Animated.Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: CIRCLE_SIZE,
        height: CIRCLE_SIZE,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    valueText: {
        fontSize: VALUE_FONT_SIZE,
        fontWeight: '700',
        fontVariant: ['tabular-nums'],
    },
});
