import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, { type SharedValue } from 'react-native-reanimated';

import { useDialRulerMotion } from '@/hooks/useDialRulerMotion';
import { buildDialTickValues } from '@/utils/dial-slider/dial-math';

import { COLORS, DIAL_CONFIG } from '../constants';
import { DialRulerEdgeFade } from './DialRulerEdgeFade';
import { DialRulerOriginDot } from './DialRulerOriginDot';
import { DialRulerTick } from './DialRulerTick';

const {
    CENTER_TICK_HEIGHT,
    TICK_STEP,
    MAJOR_TICK_EVERY,
} = DIAL_CONFIG;
const MAX_RENDERED_TICKS = 201;

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
    const ticks = useMemo(
        () =>
            tickValues.map((tickValue) => ({
                value: tickValue,
                isMajor: tickValue % MAJOR_TICK_EVERY === 0,
            })),
        [tickValues]
    );
    const {
        contentStyle,
        gesture,
        isDragging,
        startX,
        translationX,
    } = useDialRulerMotion({
        value,
        initialValue,
        minValue,
        maxValue,
        enabled,
        interactionRevision,
        onInteractionStart,
        onInteractionEnd,
    });

    return (
        <View
            style={styles.container}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
        >
            <Animated.View style={[styles.content, contentStyle]}>
                <GestureDetector gesture={gesture}>
                    <Animated.View style={styles.rulerArea}>
                        <DialRulerOriginDot translationX={translationX} />
                        <View style={styles.ticksContainer}>
                            {ticks.map((tick) => (
                                <DialRulerTick
                                    key={tick.value}
                                    tickValue={tick.value}
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
                <DialRulerEdgeFade fadeColor={fadeColor} />
            </Animated.View>
        </View>
    );
}

const RULER_HEIGHT = CENTER_TICK_HEIGHT + 24;

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: RULER_HEIGHT,
        position: 'relative',
        overflow: 'hidden',
    },
    content: {
        flex: 1,
        width: '100%',
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
});
