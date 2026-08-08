import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    cancelAnimation,
    type SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { getNearestDialTick } from '@/utils/dial-slider/dial-math';

import { COLORS, DIAL_CONFIG } from '../constants';

const {
    TICK_SPACING,
    TICK_HEIGHT,
    CENTER_TICK_HEIGHT,
    TICK_WIDTH,
} = DIAL_CONFIG;

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

interface DialRulerTickProps {
    tickValue: number;
    isMajor: boolean;
    translationX: SharedValue<number>;
    dragStartX: SharedValue<number>;
    isDragging: SharedValue<number>;
    screenCenter: number;
    tickValues: readonly number[];
}

export const DialRulerTick = React.memo(function DialRulerTick({
    tickValue,
    isMajor,
    translationX,
    dragStartX,
    isDragging,
    screenCenter,
    tickValues,
}: DialRulerTickProps) {
    const tickX = tickValue * TICK_SPACING;
    const heightAnim = useSharedValue(TICK_HEIGHT as number);
    const colorAnim = useSharedValue(0);

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
        const startVal = -dragStartX.value / TICK_SPACING;
        const currentVal = -translationX.value / TICK_SPACING;
        const lo = Math.min(startVal, currentVal);
        const hi = Math.max(startVal, currentVal);
        const rangeSize = hi - lo;
        const inRange = tickValue >= lo && tickValue <= hi && rangeSize > 0;
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

        return {
            height,
            opacity,
            backgroundColor: isNearest
                ? COLORS.POSITIVE
                : `rgb(${r},${g},${b})`,
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

const styles = StyleSheet.create({
    tick: {
        position: 'absolute',
        bottom: 0,
        height: TICK_HEIGHT,
        borderRadius: 1,
    },
});
