import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { clampDialValue } from '@/utils/dial-slider/dial-math';
import { getPresetRange } from '@/utils/dial-slider/preset-config';
import { getSignedProgressColor } from '@/utils/dial-slider/ring-math';

import { COLORS, DIAL_CONFIG } from '../constants';
import type { DialPreset } from '../types';
import { PresetRing } from './PresetRing';

const { ITEM_SIZE } = DIAL_CONFIG;

interface PresetButtonProps {
    preset: DialPreset;
    value: number;
    selected: boolean;
    accentColor: string;
    adjustedColor: string;
    onPress: () => void;
}

export function PresetButton({
    preset,
    value,
    selected,
    accentColor,
    adjustedColor,
    onPress,
}: PresetButtonProps) {
    const { min, max } = getPresetRange(preset);
    const adjusted = Math.round(value) !== Math.round(clampDialValue(0, min, max));
    const iconState = { selected, adjusted, value };
    const icon =
        typeof preset.icon === 'function' ? preset.icon(iconState) : preset.icon;
    const positiveProgressColor = selected ? accentColor : adjustedColor;
    const progressColor = getSignedProgressColor(
        value,
        positiveProgressColor,
        COLORS.NEGATIVE
    );

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={preset.label}
            accessibilityState={{ selected, disabled: preset.disabled }}
            accessibilityValue={{
                min,
                max,
                now: value,
                text: preset.formatValue?.(value) ?? `${Math.round(value)}`,
            }}
            disabled={preset.disabled}
            onPress={onPress}
            style={({ pressed }) => [
                styles.presetButton,
                preset.disabled && styles.disabledPreset,
                pressed && styles.pressedPreset,
            ]}
        >
            <PresetRing
                value={value}
                minValue={min}
                maxValue={max}
                color={progressColor}
                backgroundColor={selected ? '#5C5C60' : '#4A4A4D'}
            />
            <View style={[styles.iconSlot, !selected && styles.inactiveIcon]}>
                {icon}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    presetButton: {
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        borderRadius: ITEM_SIZE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1C1C1E',
    },
    pressedPreset: {
        transform: [{ scale: 0.96 }],
        opacity: 0.85,
    },
    disabledPreset: {
        opacity: 0.35,
    },
    iconSlot: {
        width: ITEM_SIZE - 12,
        height: ITEM_SIZE - 12,
        borderRadius: (ITEM_SIZE - 12) / 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inactiveIcon: {
        opacity: 0.88,
    },
});
