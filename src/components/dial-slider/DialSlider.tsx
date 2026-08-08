import React, {
    type ReactNode,
    useCallback,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    type AccessibilityActionEvent,
    type LayoutChangeEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { COLORS, DIAL_CONFIG } from './constants';
import { clampDialValue, normalizeDialRange } from './dial-math';
import { DialRuler } from './DialRuler';
import {
    dedupePresetsById,
    reconcilePresetValues,
    updatePresetValueForRevision,
} from './preset-state';
import {
    createCircularArcPath,
    getBipolarProgress,
    getSignedProgressColor,
} from './ring-math';

const {
    ITEM_SIZE,
    ITEM_GAP,
    RING_STROKE_WIDTH,
    RING_BG_STROKE_WIDTH,
    VALUE_BADGE_DELAY_MS,
    PRESET_DIM_OPACITY,
    PRESET_DIM_OUT_MS,
    PRESET_DIM_IN_MS,
    VALUE_BADGE_IN_MS,
    VALUE_BADGE_OUT_MS,
} = DIAL_CONFIG;
const RING_CENTER = ITEM_SIZE / 2;
const RING_RADIUS = RING_CENTER - RING_STROKE_WIDTH / 2;

function getRange(preset: DialPreset) {
    return normalizeDialRange(
        preset.minValue ?? DIAL_CONFIG.MIN_VALUE,
        preset.maxValue ?? DIAL_CONFIG.MAX_VALUE,
        DIAL_CONFIG.MIN_VALUE,
        DIAL_CONFIG.MAX_VALUE
    );
}

function getInitialValue(preset: DialPreset) {
    const { min, max } = getRange(preset);
    const requestedInitial = Number.isFinite(preset.initialValue)
        ? (preset.initialValue as number)
        : 0;
    return clampDialValue(requestedInitial, min, max);
}

export interface DialPresetIconState {
    selected: boolean;
    adjusted: boolean;
    value: number;
}

export interface DialPreset {
    /** Stable identifier used as the key in the values map */
    id: string;
    /** VoiceOver/TalkBack label */
    label: string;
    /** Static node or renderer for selected/adjusted visual states */
    icon: ReactNode | ((state: DialPresetIconState) => ReactNode);
    minValue?: number;
    maxValue?: number;
    initialValue?: number;
    /** Accessibility increment/decrement amount (default: 1) */
    step?: number;
    formatValue?: (value: number) => string;
    disabled?: boolean;
}

export interface DialSliderProps {
    /**
     * Adjustment tools to render. Length is controlled by the caller
     * (e.g. `PHOTO_PRESETS`): one item = single tool, many = strip.
     */
    presets: readonly DialPreset[];
    initialPresetId?: string;
    onPresetChange?: (presetId: string, value: number) => void;
    onValueChange?: (
        presetId: string,
        value: number,
        values: Readonly<Record<string, number>>
    ) => void;
    onValuesChange?: (values: Readonly<Record<string, number>>) => void;
    accentColor?: string;
    adjustedColor?: string;
    backgroundColor?: string;
    testID?: string;
}

interface PresetRingProps {
    value: number;
    minValue: number;
    maxValue: number;
    color: string;
    backgroundColor: string;
}

function PresetRing({
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

interface PresetButtonProps {
    preset: DialPreset;
    value: number;
    selected: boolean;
    accentColor: string;
    adjustedColor: string;
    onPress: () => void;
}

function PresetButton({
    preset,
    value,
    selected,
    accentColor,
    adjustedColor,
    onPress,
}: PresetButtonProps) {
    const { min, max } = getRange(preset);
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

function createInitialValues(presets: readonly DialPreset[]) {
    return Object.fromEntries(
        presets.map((preset) => [preset.id, getInitialValue(preset)])
    );
}

/**
 * Single dial control for photo-style adjustments.
 * Pass one preset for a lone tool, or many for a horizontal strip —
 * both use the same structure; only `presets.length` changes the chrome.
 */
export function DialSlider({
    presets: presetInput,
    initialPresetId,
    onPresetChange,
    onValueChange,
    onValuesChange,
    accentColor = COLORS.POSITIVE,
    adjustedColor = '#8F8129',
    backgroundColor = COLORS.BACKGROUND,
    testID,
}: DialSliderProps) {
    const presets = useMemo(
        () => dedupePresetsById(presetInput),
        [presetInput]
    );
    const multiPreset = presets.length > 1;
    const firstSelectedId =
        presets.find(
            (preset) => preset.id === initialPresetId && !preset.disabled
        )?.id ??
        presets.find((preset) => !preset.disabled)?.id ??
        presets[0]?.id ??
        '';
    const initialValues = useMemo(() => createInitialValues(presets), [presets]);
    const initialSelectedValue = initialValues[firstSelectedId] ?? 0;

    const [selectedId, setSelectedId] = useState(firstSelectedId);
    const [values, setValues] = useState<Record<string, number>>(initialValues);
    const [displayValue, setDisplayValue] = useState(initialSelectedValue);
    const [viewportWidth, setViewportWidth] = useState(0);
    const [isInteracting, setIsInteracting] = useState(false);

    const selectedIdRef = useRef(selectedId);
    const valuesRef = useRef(values);
    const presetsRef = useRef(presets);
    const onValueChangeRef = useRef(onValueChange);
    const onValuesChangeRef = useRef(onValuesChange);
    const onPresetChangeRef = useRef(onPresetChange);
    const revisionRef = useRef(0);
    const selectedConfigSignatureRef = useRef('');
    const hideBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollRef = useRef<ScrollView>(null);

    // Keep latest JS bridges for worklets / async callbacks without re-render churn.
    useLayoutEffect(() => {
        selectedIdRef.current = selectedId;
        valuesRef.current = values;
        presetsRef.current = presets;
        onValueChangeRef.current = onValueChange;
        onValuesChangeRef.current = onValuesChange;
        onPresetChangeRef.current = onPresetChange;
    });

    const value = useSharedValue(initialSelectedValue);
    const interactionRevision = useSharedValue(0);
    const presetRowOpacity = useSharedValue(1);
    const valueBadgeOpacity = useSharedValue(0);

    const selectedPreset =
        presets.find((preset) => preset.id === selectedId) ?? presets[0];
    const selectedRange = selectedPreset
        ? getRange(selectedPreset)
        : { min: 0, max: 0 };

    const rowStyle = useAnimatedStyle(() => ({
        opacity: presetRowOpacity.value,
    }));
    const badgeStyle = useAnimatedStyle(() => ({
        opacity: valueBadgeOpacity.value,
        transform: [{ scale: 0.94 + valueBadgeOpacity.value * 0.06 }],
    }));

    const advanceRevision = useCallback(() => {
        const nextRevision = revisionRef.current + 1;
        revisionRef.current = nextRevision;
        interactionRevision.value = nextRevision;
        return nextRevision;
    }, [interactionRevision]);

    const scrollToPreset = useCallback((index: number, animated = true) => {
        if (!multiPreset) return;
        scrollRef.current?.scrollTo({
            x: index * (ITEM_SIZE + ITEM_GAP),
            y: 0,
            animated,
        });
    }, [multiPreset]);

    const handleViewportLayout = useCallback(
        (event: LayoutChangeEvent) => {
            const width = event.nativeEvent.layout.width;
            setViewportWidth(width);
            if (!multiPreset) return;
            const index = presetsRef.current.findIndex(
                (preset) => preset.id === selectedIdRef.current
            );
            if (index >= 0) {
                requestAnimationFrame(() => scrollToPreset(index, false));
            }
        },
        [multiPreset, scrollToPreset]
    );

    const handleSharedValueChange = useCallback(
        (nextValue: number, callbackRevision: number) => {
            const presetId = selectedIdRef.current;
            const preset = presetsRef.current.find(
                (item) => item.id === presetId
            );
            if (!preset) return;

            const { min, max } = getRange(preset);
            const next = clampDialValue(Math.round(nextValue), min, max);
            const currentValues = valuesRef.current;
            const nextValues = updatePresetValueForRevision({
                callbackRevision,
                currentRevision: revisionRef.current,
                presetId,
                nextValue: next,
                values: currentValues,
            });
            if (nextValues === null) return;
            if (nextValues === currentValues) {
                setDisplayValue(next);
                return;
            }

            valuesRef.current = nextValues;
            setValues(nextValues);
            setDisplayValue(next);
            onValueChangeRef.current?.(presetId, next, nextValues);
            onValuesChangeRef.current?.(nextValues);
        },
        []
    );

    useAnimatedReaction(
        () => ({
            value: Math.round(value.value),
            revision: interactionRevision.value,
        }),
        (current, previous) => {
            if (previous !== null && current.value !== previous.value) {
                runOnJS(handleSharedValueChange)(
                    current.value,
                    current.revision
                );
            }
        }
    );

    const handleInteractionStart = useCallback(() => {
        if (hideBadgeTimerRef.current) {
            clearTimeout(hideBadgeTimerRef.current);
            hideBadgeTimerRef.current = null;
        }
        setIsInteracting(true);
        // Multi: gradually dim the strip so the centered badge reads clearly.
        // Single: keep the lone tool fully visible; badge still overlays value.
        presetRowOpacity.value = withTiming(multiPreset ? PRESET_DIM_OPACITY : 1, {
            duration: PRESET_DIM_OUT_MS,
        });
        valueBadgeOpacity.value = withTiming(1, { duration: VALUE_BADGE_IN_MS });
    }, [multiPreset, presetRowOpacity, valueBadgeOpacity]);

    const handleInteractionEnd = useCallback(() => {
        setIsInteracting(false);
        presetRowOpacity.value = withTiming(1, { duration: PRESET_DIM_IN_MS });
        hideBadgeTimerRef.current = setTimeout(() => {
            valueBadgeOpacity.value = withTiming(0, { duration: VALUE_BADGE_OUT_MS });
            hideBadgeTimerRef.current = null;
        }, VALUE_BADGE_DELAY_MS);
    }, [presetRowOpacity, valueBadgeOpacity]);

    useEffect(
        () => () => {
            if (hideBadgeTimerRef.current) {
                clearTimeout(hideBadgeTimerRef.current);
            }
        },
        []
    );

    useEffect(() => {
        const previousValues = valuesRef.current;
        const presetValueConfigs = presets.map((preset) => {
            const { min, max } = getRange(preset);
            return {
                id: preset.id,
                min,
                max,
                initialValue: getInitialValue(preset),
            };
        });
        const { values: nextValues, changed: valuesChanged } =
            reconcilePresetValues(presetValueConfigs, previousValues);

        if (valuesChanged) {
            valuesRef.current = nextValues;
            setValues(nextValues);
            onValuesChangeRef.current?.(nextValues);
        }

        const currentPreset = presets.find(
            (preset) => preset.id === selectedIdRef.current
        );
        const replacementPreset = presets.find((preset) => !preset.disabled);
        const hasUsableCurrentPreset = currentPreset && !currentPreset.disabled;
        const nextId = hasUsableCurrentPreset
            ? selectedIdRef.current
            : (replacementPreset?.id ?? presets[0]?.id ?? '');
        const nextPreset = presets.find((preset) => preset.id === nextId);
        const next = nextValues[nextId] ?? 0;
        const selectionChanged = nextId !== selectedIdRef.current;
        const activeValueChanged = previousValues[nextId] !== next;
        const nextRange = nextPreset ? getRange(nextPreset) : { min: 0, max: 0 };
        const nextConfigSignature = [
            nextId,
            nextRange.min,
            nextRange.max,
            nextPreset?.disabled ? 1 : 0,
        ].join(':');
        const configChanged =
            nextConfigSignature !== selectedConfigSignatureRef.current;

        if (selectionChanged || activeValueChanged || configChanged) {
            advanceRevision();
            selectedConfigSignatureRef.current = nextConfigSignature;
            setDisplayValue(next);
            value.value = next;
        }

        if (selectionChanged) {
            selectedIdRef.current = nextId;
            setSelectedId(nextId);
            const replacementIndex = presets.findIndex(
                (preset) => preset.id === nextId
            );
            if (replacementIndex >= 0) {
                scrollToPreset(replacementIndex, false);
            }
            onPresetChangeRef.current?.(nextId, next);
        } else if (activeValueChanged) {
            onValueChangeRef.current?.(nextId, next, nextValues);
        }
    }, [advanceRevision, presets, scrollToPreset, value]);

    const selectPreset = useCallback(
        (preset: DialPreset, index: number) => {
            if (preset.disabled) return;
            if (preset.id === selectedIdRef.current) return;
            const next = valuesRef.current[preset.id] ?? getInitialValue(preset);
            const { min, max } = getRange(preset);
            advanceRevision();
            selectedConfigSignatureRef.current = [
                preset.id,
                min,
                max,
                0,
            ].join(':');
            selectedIdRef.current = preset.id;
            setSelectedId(preset.id);
            setDisplayValue(next);
            value.value = next;
            scrollToPreset(index);
            onPresetChangeRef.current?.(preset.id, next);
        },
        [advanceRevision, scrollToPreset, value]
    );

    const adjustBy = useCallback(
        (delta: number) => {
            const preset = presetsRef.current.find(
                (item) => item.id === selectedIdRef.current
            );
            if (!preset || preset.disabled) return;
            const { min, max } = getRange(preset);
            const current = valuesRef.current[preset.id] ?? getInitialValue(preset);
            const next = clampDialValue(current + delta, min, max);
            if (next !== current) value.value = next;
        },
        [value]
    );

    const handleAccessibilityAction = useCallback(
        (event: AccessibilityActionEvent) => {
            const requestedStep = selectedPreset?.step;
            const step =
                typeof requestedStep === 'number' &&
                Number.isFinite(requestedStep) &&
                requestedStep > 0
                    ? requestedStep
                    : 1;
            if (event.nativeEvent.actionName === 'increment') adjustBy(step);
            if (event.nativeEvent.actionName === 'decrement') adjustBy(-step);
        },
        [adjustBy, selectedPreset?.step]
    );

    if (!selectedPreset) return null;

    const selectedValue = values[selectedPreset.id] ?? getInitialValue(selectedPreset);
    const formattedValue =
        selectedPreset.formatValue?.(displayValue) ?? `${Math.round(displayValue)}`;
    const badgeProgressColor = getSignedProgressColor(
        displayValue,
        accentColor,
        COLORS.NEGATIVE
    );
    const contentPadding = multiPreset
        ? Math.max(0, (viewportWidth - ITEM_SIZE) / 2)
        : 0;

    return (
        <GestureHandlerRootView style={styles.gestureRoot} testID={testID}>
            <View style={[styles.container, { backgroundColor }]}>
                <View style={styles.presetViewport} onLayout={handleViewportLayout}>
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
                                    value={values[preset.id] ?? getInitialValue(preset)}
                                    selected={preset.id === selectedPreset.id}
                                    accentColor={accentColor}
                                    adjustedColor={adjustedColor}
                                    onPress={() => selectPreset(preset, index)}
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
                                onPress={() => {}}
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

                <View
                    accessible
                    accessibilityRole="adjustable"
                    accessibilityState={{ disabled: selectedPreset.disabled }}
                    accessibilityLabel={selectedPreset.label}
                    accessibilityValue={{
                        min: selectedRange.min,
                        max: selectedRange.max,
                        now: selectedValue,
                        text: formattedValue,
                    }}
                    aria-valuemin={selectedRange.min}
                    aria-valuemax={selectedRange.max}
                    aria-valuenow={selectedValue}
                    aria-valuetext={formattedValue}
                    accessibilityActions={[
                        { name: 'increment', label: 'Increment' },
                        { name: 'decrement', label: 'Decrement' },
                    ]}
                    onAccessibilityAction={handleAccessibilityAction}
                    style={styles.rulerAccessibilityContainer}
                >
                    <DialRuler
                        value={value}
                        initialValue={selectedValue}
                        minValue={selectedRange.min}
                        maxValue={selectedRange.max}
                        fadeColor={backgroundColor}
                        onInteractionStart={handleInteractionStart}
                        onInteractionEnd={handleInteractionEnd}
                        enabled={!selectedPreset.disabled}
                        interactionRevision={interactionRevision}
                    />
                </View>
            </View>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    gestureRoot: {
        alignSelf: 'stretch',
    },
    container: {
        alignItems: 'stretch',
        paddingTop: 8,
        paddingBottom: 6,
    },
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
    ringCanvas: {
        ...StyleSheet.absoluteFill,
        width: ITEM_SIZE,
        height: ITEM_SIZE,
        pointerEvents: 'none',
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
    rulerAccessibilityContainer: {
        marginTop: 4,
    },
});
