import {
    Canvas,
    Circle,
    Skia,
    Path as SkiaPath,
} from '@shopify/react-native-skia';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';

const { RING_RADIUS, RING_STROKE_WIDTH, RING_BG_STROKE_WIDTH } = DIAL_CONFIG;
const SIZE = (RING_RADIUS + RING_STROKE_WIDTH) * 2;
const CENTER = SIZE / 2;

interface ProgressRingProps {
    value: SharedValue<number>;
    minValue?: number;
    maxValue?: number;
}

/** Bipolar fill: + side vs maxValue, − side vs |minValue|. */
function progressForValue(v: number, minValue: number, maxValue: number) {
    'worklet';
    if (v >= 0) {
        if (maxValue <= 0) return 0;
        return Math.min(v / maxValue, 1);
    }
    if (minValue >= 0) return 0;
    return Math.min(Math.abs(v) / Math.abs(minValue), 1);
}

export function ProgressRing({
    value,
    minValue = DIAL_CONFIG.MIN_VALUE,
    maxValue = DIAL_CONFIG.MAX_VALUE,
}: ProgressRingProps) {
    const arcPath = useDerivedValue(() => {
        const path = Skia.Path.Make();
        const progress = progressForValue(value.value, minValue, maxValue);
        const sweepAngle = progress * 360;

        if (sweepAngle <= 0) return path;

        const rect = Skia.XYWHRect(
            CENTER - RING_RADIUS,
            CENTER - RING_RADIUS,
            RING_RADIUS * 2,
            RING_RADIUS * 2
        );

        // Positive: clockwise from 12 o'clock (-90°)
        // Negative: counter-clockwise from 12 o'clock (-90°)
        if (value.value >= 0) {
            path.addArc(rect, -90, sweepAngle);
        } else {
            path.addArc(rect, -90, -sweepAngle);
        }

        return path;
    });

    const arcColor = useDerivedValue(() =>
        value.value >= 0 ? COLORS.POSITIVE : COLORS.NEGATIVE
    );

    return (
        <Canvas style={styles.canvas}>
            {/* Background ring */}
            <Circle
                cx={CENTER}
                cy={CENTER}
                r={RING_RADIUS}
                style="stroke"
                strokeWidth={RING_BG_STROKE_WIDTH}
                color={COLORS.RING_BG}
            />
            {/* Active arc */}
            <SkiaPath
                path={arcPath}
                style="stroke"
                strokeWidth={RING_STROKE_WIDTH}
                color={arcColor}
                strokeCap="round"
            />
        </Canvas>
    );
}

const styles = StyleSheet.create({
    canvas: {
        width: SIZE,
        height: SIZE,
    },
});
