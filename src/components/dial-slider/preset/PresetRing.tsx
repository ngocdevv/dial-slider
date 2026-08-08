import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import {
    createCircularArcPath,
    getBipolarProgress,
} from '@/utils/dial-slider/ring-math';

import { DIAL_CONFIG } from '../constants';

const {
    ITEM_SIZE,
    RING_STROKE_WIDTH,
    RING_BG_STROKE_WIDTH,
} = DIAL_CONFIG;
const RING_CENTER = ITEM_SIZE / 2;
const RING_RADIUS = RING_CENTER - RING_STROKE_WIDTH / 2;

interface PresetRingProps {
    value: number;
    minValue: number;
    maxValue: number;
    color: string;
    backgroundColor: string;
}

export function PresetRing({
    value,
    minValue,
    maxValue,
    color,
    backgroundColor,
}: PresetRingProps) {
    const progress = getBipolarProgress(value, minValue, maxValue);
    const direction = value < 0 ? -1 : 1;
    const arcPath = createCircularArcPath(
        RING_CENTER,
        RING_CENTER,
        RING_RADIUS,
        progress,
        direction
    );

    return (
        <Svg
            width={ITEM_SIZE}
            height={ITEM_SIZE}
            viewBox={`0 0 ${ITEM_SIZE} ${ITEM_SIZE}`}
            style={styles.ringCanvas}
        >
            <Circle
                cx={RING_CENTER}
                cy={RING_CENTER}
                r={RING_RADIUS}
                fill="none"
                stroke={backgroundColor}
                strokeWidth={RING_BG_STROKE_WIDTH}
            />
            {arcPath ? (
                <Path
                    d={arcPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={RING_STROKE_WIDTH}
                    strokeLinecap="round"
                />
            ) : null}
        </Svg>
    );
}

const styles = StyleSheet.create({
    ringCanvas: {
        ...StyleSheet.absoluteFill,
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        pointerEvents: 'none',
    },
});
