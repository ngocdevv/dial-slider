import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    runOnJS,
    useAnimatedReaction,
    useSharedValue,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';
import { DialRuler } from './DialRuler';
import { ValueDisplay } from './ValueDisplay';

interface DialSliderProps {
    minValue?: number;
    maxValue?: number;
    initialValue?: number;
    onValueChange?: (value: number) => void;
}

export function DialSlider({
    minValue = DIAL_CONFIG.MIN_VALUE,
    maxValue = DIAL_CONFIG.MAX_VALUE,
    initialValue = 0,
    onValueChange,
}: DialSliderProps) {
    const value = useSharedValue(initialValue);

    const handleHapticTick = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    // Notify parent of value changes
    useAnimatedReaction(
        () => Math.round(value.value),
        (current, previous) => {
            if (current !== previous && onValueChange) {
                runOnJS(onValueChange)(current);
            }
        }
    );

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <View style={styles.container}>
                <ValueDisplay value={value} />
                <View style={styles.spacer} />
                <DialRuler
                    value={value}
                    minValue={minValue}
                    maxValue={maxValue}
                    onHapticTick={handleHapticTick}
                />
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    gestureRoot: {
        flex: 1,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.BACKGROUND,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spacer: {
        height: 32,
    },
});
