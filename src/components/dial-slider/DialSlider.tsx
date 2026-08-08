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
    runOnJS,
    useAnimatedReaction,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';

import { clampDialValue } from '@/utils/dial-slider/dial-math';
import {
    createInitialPresetValues,
    getPresetInitialValue,
    getPresetRange,
} from '@/utils/dial-slider/preset-config';
import {
    dedupePresetsById,
    reconcilePresetValues,
    updatePresetValueForRevision,
} from '@/utils/dial-slider/preset-state';

import { COLORS, DIAL_CONFIG } from './constants';
import { DialPresetViewport } from './preset/DialPresetViewport';
import { DialRuler } from './ruler/DialRuler';
import type { DialPreset, DialSliderProps } from './types';

export type {
    DialPreset,
    DialPresetIconState,
    DialSliderProps,
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
  const initialValues = useMemo(
    () => createInitialPresetValues(presets),
    [presets]
  );
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
    ? getPresetRange(selectedPreset)
    : { min: 0, max: 0 };

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

      const { min, max } = getPresetRange(preset);
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
      const { min, max } = getPresetRange(preset);
      return {
        id: preset.id,
        min,
        max,
        initialValue: getPresetInitialValue(preset),
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
    const nextRange = nextPreset
      ? getPresetRange(nextPreset)
      : { min: 0, max: 0 };
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
      const next =
        valuesRef.current[preset.id] ?? getPresetInitialValue(preset);
      const { min, max } = getPresetRange(preset);
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
      const { min, max } = getPresetRange(preset);
      const current =
        valuesRef.current[preset.id] ?? getPresetInitialValue(preset);
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

  const selectedValue =
    values[selectedPreset.id] ?? getPresetInitialValue(selectedPreset);
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
  rulerAccessibilityContainer: {
    marginTop: 4,
  },
});
