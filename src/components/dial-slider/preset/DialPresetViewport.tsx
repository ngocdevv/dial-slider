import type { RefObject } from 'react';
import React from 'react';
import {
    type LayoutChangeEvent,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    type SharedValue,
    useAnimatedStyle,
} from 'react-native-reanimated';

import type { DialRange } from '@/utils/dial-slider/dial-math';
import { getPresetInitialValue } from '@/utils/dial-slider/preset-config';
import { getSignedProgressColor } from '@/utils/dial-slider/ring-math';

import { COLORS, DIAL_CONFIG } from '../constants';
import type { DialPreset } from '../types';
import { PresetButton } from './PresetButton';
import { PresetRing } from './PresetRing';

const { ITEM_SIZE, ITEM_GAP } = DIAL_CONFIG;
const NOOP = () => {};

interface DialPresetViewportProps {
    presets: readonly DialPreset[];
    values: Readonly<Record<string, number>>;
    selectedPreset: DialPreset;
    selectedRange: DialRange;
    displayValue: number;
    formattedValue: string;
    multiPreset: boolean;
    isInteracting: boolean;
    contentPadding: number;
    accentColor: string;
    adjustedColor: string;
    presetRowOpacity: SharedValue<number>;
    valueBadgeOpacity: SharedValue<number>;
    scrollRef: RefObject<ScrollView | null>;
    onLayout: (event: LayoutChangeEvent) => void;
    onSelectPreset: (preset: DialPreset, index: number) => void;
}

export function DialPresetViewport({
    presets,
    values,
    selectedPreset,
    selectedRange,
    displayValue,
    formattedValue,
    multiPreset,
    isInteracting,
    contentPadding,
    accentColor,
    adjustedColor,
    presetRowOpacity,
    valueBadgeOpacity,
    scrollRef,
    onLayout,
    onSelectPreset,
}: DialPresetViewportProps) {
    const rowStyle = useAnimatedStyle(() => ({
        opacity: presetRowOpacity.value,
    }));
    const badgeStyle = useAnimatedStyle(() => ({
        opacity: valueBadgeOpacity.value,
        transform: [{ scale: 0.94 + valueBadgeOpacity.value * 0.06 }],
    }));
    const selectedValue =
        values[selectedPreset.id] ?? getPresetInitialValue(selectedPreset);
    const badgeProgressColor = getSignedProgressColor(
        displayValue,
        accentColor,
        COLORS.NEGATIVE
    );

    return (
        <View style={styles.presetViewport} onLayout={onLayout}>
            {multiPreset ? (
                <Animated.ScrollView
                    ref={scrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    scrollEnabled={!isInteracting}
                    contentContainerStyle={{
                        paddingHorizontal: contentPadding,
                        gap: ITEM_GAP,
                    }}
                    style={rowStyle}
                >
                    {presets.map((preset, index) => (
                        <PresetButton
                            key={preset.id}
                            preset={preset}
                            value={
                                values[preset.id] ??
                                getPresetInitialValue(preset)
                            }
                            selected={preset.id === selectedPreset.id}
                            accentColor={accentColor}
                            adjustedColor={adjustedColor}
                            onPress={() => onSelectPreset(preset, index)}
                        />
                    ))}
                </Animated.ScrollView>
            ) : (
                <View style={styles.singlePresetRow}>
                    <PresetButton
                        preset={selectedPreset}
                        value={selectedValue}
                        selected
                        accentColor={accentColor}
                        adjustedColor={adjustedColor}
                        onPress={NOOP}
                    />
                </View>
            )}

            <Animated.View
                style={[styles.valueBadge, badgeStyle]}
                accessible={false}
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
            >
                <PresetRing
                    value={displayValue}
                    minValue={selectedRange.min}
                    maxValue={selectedRange.max}
                    color={badgeProgressColor}
                    backgroundColor="#5C5C60"
                />
                <Text style={[styles.valueText, { color: accentColor }]}>
                    {formattedValue}
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    presetViewport: {
        height: ITEM_SIZE,
        position: 'relative',
        overflow: 'hidden',
    },
    singlePresetRow: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    valueBadge: {
        position: 'absolute',
        left: '50%',
        marginLeft: -ITEM_SIZE / 2,
        top: 0,
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: ITEM_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1C1E',
        pointerEvents: 'none',
    },
    valueText: {
        fontSize: 15,
        fontWeight: '500',
        fontVariant: ['tabular-nums'],
        textAlign: 'center',
    },
});
