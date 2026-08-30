import React, {
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
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  ReduceMotion,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { clampDialValue } from '../../utils/dial-slider/dial-math';
import {
  getPresetInitialValue,
  getPresetRange,
  resolvePresetValues,
} from '../../utils/dial-slider/preset-config';
import {
  createPresetValueChange,
  dedupePresetsById,
  reconcilePresetValues,
  resolveSelectedPresetId,
} from '../../utils/dial-slider/preset-state';

import { COLORS, DIAL_CONFIG } from './constants';
import { DialPresetViewport } from './preset/DialPresetViewport';
import { DialRuler } from './ruler/DialRuler';
import type { DialPreset, DialSliderProps } from './types';

export type {
  DialPreset,
  DialPresetIconState,
  DialSliderProps,
  DialSliderValues,
} from './types';

const {
  ITEM_SIZE,
  ITEM_GAP,
  VALUE_BADGE_DELAY_MS,
  PRESET_DIM_OPACITY,
  PRESET_DIM_OUT_MS,
  PRESET_DIM_IN_MS,
  VALUE_BADGE_IN_MS,
  VALUE_BADGE_OUT_MS,
} = DIAL_CONFIG;

/**
 * Photo-style adjustment control. One preset renders a centered tool; multiple
 * presets render a strip with an independent value for each tool.
 */
export function DialSlider({
  presets: presetInput,
  initialPresetId,
  selectedPresetId,
  values: controlledValues,
  defaultValues,
  onPresetChange,
  onValueChange,
  onValuesChange,
  accentColor = COLORS.POSITIVE,
  adjustedColor = '#8F8129',
  backgroundColor = COLORS.BACKGROUND,
  accessibilityLabel,
  accessibilityHint = 'Swipe horizontally or use increment and decrement actions to adjust.',
  testID,
}: DialSliderProps) {
  const presets = useMemo(() => dedupePresetsById(presetInput), [presetInput]);
  const multiPreset = presets.length > 1;
  const selectionIsControlled = selectedPresetId !== undefined;
  const valuesAreControlled = controlledValues !== undefined;
  const firstSelectedId = resolveSelectedPresetId(
    presets,
    selectionIsControlled ? selectedPresetId : initialPresetId
  );

  const [uncontrolledSelectedId, setUncontrolledSelectedId] =
    useState(firstSelectedId);
  const [uncontrolledValues, setUncontrolledValues] = useState<
    Record<string, number>
  >(() => resolvePresetValues(presets, defaultValues));
  const [displayValue, setDisplayValue] = useState(
    () =>
      resolvePresetValues(
        presets,
        valuesAreControlled ? controlledValues : defaultValues
      )[firstSelectedId] ?? 0
  );
  const [viewportWidth, setViewportWidth] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

  const presetValueConfigs = useMemo(
    () =>
      presets.map((preset) => {
        const { min, max } = getPresetRange(preset);
        return {
          id: preset.id,
          min,
          max,
          initialValue: getPresetInitialValue(preset),
        };
      }),
    [presets]
  );
  const reconciledUncontrolledValues = useMemo(
    () => reconcilePresetValues(presetValueConfigs, uncontrolledValues).values,
    [presetValueConfigs, uncontrolledValues]
  );
  const resolvedControlledValues = useMemo(
    () => resolvePresetValues(presets, controlledValues),
    [controlledValues, presets]
  );
  const values = valuesAreControlled
    ? resolvedControlledValues
    : reconciledUncontrolledValues;
  const selectedId = resolveSelectedPresetId(
    presets,
    selectionIsControlled ? selectedPresetId : uncontrolledSelectedId
  );

  const selectedIdRef = useRef(selectedId);
  const valuesRef = useRef(values);
  const presetsRef = useRef(presets);
  const valuesAreControlledRef = useRef(valuesAreControlled);
  const onValueChangeRef = useRef(onValueChange);
  const onValuesChangeRef = useRef(onValuesChange);
  const onPresetChangeRef = useRef(onPresetChange);
  const revisionRef = useRef(0);
  const selectedConfigSignatureRef = useRef('');
  const hideBadgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Keep the latest JS callbacks and state available to worklet bridges.
  useLayoutEffect(() => {
    selectedIdRef.current = selectedId;
    valuesRef.current = values;
    presetsRef.current = presets;
    valuesAreControlledRef.current = valuesAreControlled;
    onValueChangeRef.current = onValueChange;
    onValuesChangeRef.current = onValuesChange;
    onPresetChangeRef.current = onPresetChange;
  });

  const initialSelectedValue = values[firstSelectedId] ?? 0;
  const value = useSharedValue(initialSelectedValue);
  const interactionRevision = useSharedValue(0);
  const presetRowOpacity = useSharedValue(1);
  const valueBadgeOpacity = useSharedValue(0);

  const selectedPreset =
    presets.find((preset) => preset.id === selectedId) ?? presets[0];
  const selectedRange = selectedPreset
    ? getPresetRange(selectedPreset)
    : { min: 0, max: 0 };
  const selectedValue = selectedPreset
    ? (values[selectedPreset.id] ?? getPresetInitialValue(selectedPreset))
    : 0;

  const advanceRevision = useCallback(() => {
    const nextRevision = revisionRef.current + 1;
    revisionRef.current = nextRevision;
    interactionRevision.set(nextRevision);
    return nextRevision;
  }, [interactionRevision]);

  const scrollToPreset = useCallback(
    (index: number, animated = true) => {
      if (!multiPreset) return;
      scrollRef.current?.scrollTo({
        x: index * (ITEM_SIZE + ITEM_GAP),
        y: 0,
        animated,
      });
    },
    [multiPreset]
  );

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
      const preset = presetsRef.current.find((item) => item.id === presetId);
      if (!preset || preset.disabled) return;

      const { min, max } = getPresetRange(preset);
      const next = clampDialValue(Math.round(nextValue), min, max);
      const currentValues = valuesRef.current;
      const change = createPresetValueChange({
        callbackRevision,
        currentRevision: revisionRef.current,
        presetId,
        nextValue: next,
        values: currentValues,
      });
      if (change === null) return;

      setDisplayValue(change.value);
      if (!change.changed) return;

      valuesRef.current = change.values;
      if (!valuesAreControlledRef.current) {
        setUncontrolledValues(change.values);
      }
      onValueChangeRef.current?.(change.presetId, change.value, change.values);
      onValuesChangeRef.current?.(change.values);
    },
    []
  );

  useAnimatedReaction(
    () => ({
      value: Math.round(value.get()),
      revision: interactionRevision.get(),
    }),
    (current, previous) => {
      if (previous !== null && current.value !== previous.value) {
        scheduleOnRN(handleSharedValueChange, current.value, current.revision);
      }
    }
  );

  const handleInteractionStart = useCallback(() => {
    if (hideBadgeTimerRef.current) {
      clearTimeout(hideBadgeTimerRef.current);
      hideBadgeTimerRef.current = null;
    }
    setIsInteracting(true);
    presetRowOpacity.set(
      withTiming(multiPreset ? PRESET_DIM_OPACITY : 1, {
        duration: PRESET_DIM_OUT_MS,
        reduceMotion: ReduceMotion.System,
      })
    );
    valueBadgeOpacity.set(
      withTiming(1, {
        duration: VALUE_BADGE_IN_MS,
        reduceMotion: ReduceMotion.System,
      })
    );
  }, [multiPreset, presetRowOpacity, valueBadgeOpacity]);

  const handleInteractionEnd = useCallback(() => {
    setIsInteracting(false);
    presetRowOpacity.set(
      withTiming(1, {
        duration: PRESET_DIM_IN_MS,
        reduceMotion: ReduceMotion.System,
      })
    );
    hideBadgeTimerRef.current = setTimeout(() => {
      valueBadgeOpacity.set(
        withTiming(0, {
          duration: VALUE_BADGE_OUT_MS,
          reduceMotion: ReduceMotion.System,
        })
      );
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

  // Reconcile dynamic preset ranges and additions in uncontrolled mode.
  useEffect(() => {
    if (valuesAreControlled) return;
    const { values: nextValues, changed } = reconcilePresetValues(
      presetValueConfigs,
      uncontrolledValues
    );
    if (!changed) return;

    valuesRef.current = nextValues;
    // Prop-driven preset changes intentionally reconcile uncontrolled state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUncontrolledValues(nextValues);
    onValuesChangeRef.current?.(nextValues);

    const activePreset = presets.find(
      (preset) => preset.id === selectedIdRef.current && !preset.disabled
    );
    if (
      activePreset &&
      uncontrolledValues[activePreset.id] !== nextValues[activePreset.id]
    ) {
      onValueChangeRef.current?.(
        activePreset.id,
        nextValues[activePreset.id],
        nextValues
      );
    }
  }, [presets, presetValueConfigs, uncontrolledValues, valuesAreControlled]);

  // Repair an uncontrolled selection when presets are removed or disabled.
  useEffect(() => {
    if (selectionIsControlled || selectedId === uncontrolledSelectedId) return;

    selectedIdRef.current = selectedId;
    // Invalid/disabled selections intentionally fall back after prop changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUncontrolledSelectedId(selectedId);
    const next = valuesRef.current[selectedId] ?? 0;
    onPresetChangeRef.current?.(selectedId, next);
  }, [selectedId, selectionIsControlled, uncontrolledSelectedId]);

  // Synchronize preset/config changes and controlled value corrections.
  useEffect(() => {
    if (!selectedPreset) return;

    const nextConfigSignature = [
      selectedPreset.id,
      selectedRange.min,
      selectedRange.max,
      selectedPreset.disabled ? 1 : 0,
    ].join(':');
    const configChanged =
      nextConfigSignature !== selectedConfigSignatureRef.current;
    const controlledValueChanged =
      valuesAreControlled && selectedValue !== displayValue;
    if (!configChanged && !controlledValueChanged) return;

    if (configChanged) advanceRevision();
    selectedConfigSignatureRef.current = nextConfigSignature;
    setDisplayValue(selectedValue);
    value.set(selectedValue);

    if (configChanged) {
      const index = presets.findIndex(
        (preset) => preset.id === selectedPreset.id
      );
      if (index >= 0) scrollToPreset(index, false);
    }
  }, [
    advanceRevision,
    displayValue,
    presets,
    scrollToPreset,
    selectedPreset,
    selectedRange.max,
    selectedRange.min,
    selectedValue,
    value,
    valuesAreControlled,
  ]);

  const selectPreset = useCallback(
    (preset: DialPreset, index: number) => {
      if (preset.disabled || preset.id === selectedIdRef.current) return;

      const next =
        valuesRef.current[preset.id] ?? getPresetInitialValue(preset);
      const { min, max } = getPresetRange(preset);
      advanceRevision();
      onPresetChangeRef.current?.(preset.id, next);
      if (selectionIsControlled) return;

      selectedConfigSignatureRef.current = [preset.id, min, max, 0].join(':');
      selectedIdRef.current = preset.id;
      setUncontrolledSelectedId(preset.id);
      setDisplayValue(next);
      value.set(next);
      scrollToPreset(index);
    },
    [advanceRevision, scrollToPreset, selectionIsControlled, value]
  );

  const adjustBy = useCallback(
    (delta: number) => {
      const preset = presetsRef.current.find(
        (item) => item.id === selectedIdRef.current
      );
      if (!preset || preset.disabled) return;

      const { min, max } = getPresetRange(preset);
      const current =
        valuesRef.current[preset.id] ?? getPresetInitialValue(preset);
      const next = clampDialValue(current + delta, min, max);
      if (next !== current) value.set(next);
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

  const formattedValue =
    selectedPreset.formatValue?.(displayValue) ?? `${Math.round(displayValue)}`;
  const contentPadding = multiPreset
    ? Math.max(0, (viewportWidth - ITEM_SIZE) / 2)
    : 0;

  return (
    <GestureHandlerRootView style={styles.gestureRoot} testID={testID}>
      <View style={[styles.container, { backgroundColor }]}>
        <DialPresetViewport
          presets={presets}
          values={values}
          selectedPreset={selectedPreset}
          selectedRange={selectedRange}
          displayValue={displayValue}
          formattedValue={formattedValue}
          multiPreset={multiPreset}
          isInteracting={isInteracting}
          contentPadding={contentPadding}
          accentColor={accentColor}
          adjustedColor={adjustedColor}
          presetRowOpacity={presetRowOpacity}
          valueBadgeOpacity={valueBadgeOpacity}
          scrollRef={scrollRef}
          onLayout={handleViewportLayout}
          onSelectPreset={selectPreset}
        />

        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityState={{ disabled: selectedPreset.disabled }}
          accessibilityLabel={accessibilityLabel ?? selectedPreset.label}
          accessibilityHint={accessibilityHint}
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
  rulerAccessibilityContainer: {
    marginTop: 4,
  },
});
