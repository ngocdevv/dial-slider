import React from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    runOnJS,
    useAnimatedReaction,
    useSharedValue,
} from 'react-native-reanimated';

import { DIAL_CONFIG } from './constants';
import { DialRuler } from './DialRuler';
import { ValueDisplay } from './ValueDisplay';

interface DialSliderProps {
    /** Minimum value (default: -100) */
    minValue?: number;
    /** Maximum value (default: 100) */
    maxValue?: number;
    /** Starting value (default: 0) */
    initialValue?: number;
    /** Called on each value change */
    onValueChange?: (value: number) => void;
}

export function DialSlider({
    minValue = DIAL_CONFIG.MIN_VALUE,
    maxValue = DIAL_CONFIG.MAX_VALUE,
    initialValue = 0,
    onValueChange,
}: DialSliderProps) {
    const value = useSharedValue(initialValue);

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
                <DialRuler
                    value={value}
                    minValue={minValue}
                    maxValue={maxValue}
                />
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    gestureRoot: {
        alignSelf: 'stretch',
    },
    container: {
        alignItems: 'center',
        paddingVertical: 8,
    },
});
