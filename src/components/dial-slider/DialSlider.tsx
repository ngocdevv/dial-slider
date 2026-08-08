import React, { useCallback, useRef, useState } from 'react';
import {
    AccessibilityActionEvent,
    StyleSheet,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
    runOnJS,
    useAnimatedReaction,
    useSharedValue,
} from 'react-native-reanimated';

import { COLORS, DIAL_CONFIG } from './constants';
import { normalizeDialRange } from './dial-math';
import { DialRuler } from './DialRuler';
import { ValueDisplay } from './ValueDisplay';

function clamp(n: number, min: number, max: number) {
    if (min > max) return n;
    return Math.min(max, Math.max(min, n));
}

export interface DialSliderProps {
    /** Minimum value (default: -100) */
    minValue?: number;
    /** Maximum value (default: 100) */
    maxValue?: number;
    /** Starting value (default: 0), clamped to [minValue, maxValue] */
    initialValue?: number;
    /** Called on each integer value change */
    onValueChange?: (value: number) => void;
    /**
     * Color of the ruler edge fade masks (should match the surface behind the dial).
     * Defaults to black (`COLORS.BACKGROUND`).
     */
    fadeColor?: string;
    /** Accessibility label for VoiceOver / TalkBack */
    accessibilityLabel?: string;
}

export function DialSlider({
    minValue = DIAL_CONFIG.MIN_VALUE,
    maxValue = DIAL_CONFIG.MAX_VALUE,
    initialValue = 0,
    onValueChange,
    fadeColor = COLORS.BACKGROUND,
    accessibilityLabel = 'Dial slider',
}: DialSliderProps) {
    const { min: lo, max: hi } = normalizeDialRange(
        minValue,
        maxValue,
        DIAL_CONFIG.MIN_VALUE,
        DIAL_CONFIG.MAX_VALUE
    );
    const safeInitialValue = Number.isFinite(initialValue) ? initialValue : 0;
    const clampedInitial = clamp(safeInitialValue, lo, hi);

    const value = useSharedValue(clampedInitial);
    const [a11yNow, setA11yNow] = useState(clampedInitial);

    // Stable JS bridge so worklets never capture a stale onValueChange
    const onValueChangeRef = useRef(onValueChange);
    onValueChangeRef.current = onValueChange;

    const notifyValueChange = useCallback((next: number) => {
        setA11yNow(next);
        onValueChangeRef.current?.(next);
    }, []);

    useAnimatedReaction(
        () => Math.round(value.value),
        (current, previous) => {
            if (current !== previous) {
                runOnJS(notifyValueChange)(current);
            }
        }
    );

    const adjustBy = useCallback(
        (delta: number) => {
            const next = clamp(Math.round(value.value) + delta, lo, hi);
            // External write — DialRuler syncs translation; reaction notifies JS
            if (next !== Math.round(value.value)) {
                value.value = next;
            }
        },
        [lo, hi, value]
    );

    const onAccessibilityAction = useCallback(
        (event: AccessibilityActionEvent) => {
            switch (event.nativeEvent.actionName) {
                case 'increment':
                    adjustBy(1);
                    break;
                case 'decrement':
                    adjustBy(-1);
                    break;
            }
        },
        [adjustBy]
    );

    return (
        <GestureHandlerRootView style={styles.gestureRoot}>
            <View
                style={styles.container}
                accessible
                accessibilityRole="adjustable"
                accessibilityLabel={accessibilityLabel}
                accessibilityValue={{ min: lo, max: hi, now: a11yNow }}
                aria-valuemin={lo}
                aria-valuemax={hi}
                aria-valuenow={a11yNow}
                aria-valuetext={`${a11yNow}`}
                accessibilityActions={[
                    { name: 'increment', label: 'Increment' },
                    { name: 'decrement', label: 'Decrement' },
                ]}
                onAccessibilityAction={onAccessibilityAction}
            >
                <ValueDisplay
                    value={value}
                    initialValue={clampedInitial}
                    minValue={lo}
                    maxValue={hi}
                />
                <DialRuler
                    value={value}
                    initialValue={clampedInitial}
                    minValue={lo}
                    maxValue={hi}
                    fadeColor={fadeColor}
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
