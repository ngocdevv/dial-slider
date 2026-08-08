import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    type SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from '../constants';

const { TICK_HEIGHT } = DIAL_CONFIG;

interface DialRulerOriginDotProps {
    translationX: SharedValue<number>;
}

export function DialRulerOriginDot({
    translationX,
}: DialRulerOriginDotProps) {
    const animStyle = useAnimatedStyle(() => {
        const x = translationX.value;
        const isAtZero = Math.abs(x) < 2;
        const fadeOpacity = Math.max(0, 1 - Math.abs(x) / 160);
        return {
            opacity: isAtZero ? 0 : fadeOpacity,
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

const styles = StyleSheet.create({
    originDot: {
        position: 'absolute',
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.ORIGIN_DOT,
        bottom: TICK_HEIGHT + 6,
    },
});
