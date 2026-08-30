import { describe, expect, test } from 'bun:test';

import type { DialPreset } from '../src/components/dial-slider/types';
import {
  getPresetInitialValue,
  getPresetRange,
  resolvePresetValues,
} from '../src/utils/dial-slider/preset-config';
import {
  createPresetValueChange,
  dedupePresetsById,
  isCurrentPresetRevision,
  reconcilePresetValues,
  resolveSelectedPresetId,
  updatePresetValueForRevision,
} from '../src/utils/dial-slider/preset-state';

const presets: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: null,
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: null,
    minValue: -50,
    maxValue: 50,
    initialValue: 5,
  },
];

describe('preset configuration', () => {
  test('resolves a single preset and falls back from invalid selections', () => {
    expect(resolveSelectedPresetId([presets[0]], 'missing')).toBe('exposure');
    expect(resolveSelectedPresetId(presets, 'contrast')).toBe('contrast');
    expect(
      resolveSelectedPresetId(
        [{ ...presets[0], disabled: true }, presets[1]],
        'exposure'
      )
    ).toBe('contrast');
  });

  test('uses initial values for uncontrolled state and clamps controlled values', () => {
    expect(resolvePresetValues(presets)).toEqual({
      exposure: 0,
      contrast: 5,
    });
    expect(
      resolvePresetValues(presets, {
        exposure: 500,
        contrast: Number.NaN,
      })
    ).toEqual({ exposure: 100, contrast: 5 });
  });

  test('safely normalizes invalid min, max, and initial values', () => {
    const reversed: DialPreset = {
      id: 'reversed',
      label: 'Reversed',
      icon: null,
      minValue: 20,
      maxValue: -10,
      initialValue: 50,
    };
    const nonFinite: DialPreset = {
      id: 'invalid',
      label: 'Invalid',
      icon: null,
      minValue: Number.NaN,
      maxValue: Number.POSITIVE_INFINITY,
      initialValue: Number.NaN,
    };
    expect(getPresetRange(reversed)).toEqual({ min: -10, max: 20 });
    expect(getPresetInitialValue(reversed)).toBe(20);
    expect(getPresetRange(nonFinite)).toEqual({ min: -100, max: 100 });
    expect(getPresetInitialValue(nonFinite)).toBe(0);
  });

  test('deduplicates IDs, drops empty IDs, and keeps the first occurrence', () => {
    expect(
      dedupePresetsById([
        { id: 'exposure', marker: 'first' },
        { id: '', marker: 'invalid' },
        { id: 'contrast', marker: 'only' },
        { id: 'exposure', marker: 'duplicate' },
      ])
    ).toEqual([
      { id: 'exposure', marker: 'first' },
      { id: 'contrast', marker: 'only' },
    ]);
  });
});

describe('independent preset state and callbacks', () => {
  test('keeps independent values while switching multiple presets', () => {
    const initial = resolvePresetValues(presets);
    const exposureUpdate = updatePresetValueForRevision({
      callbackRevision: 1,
      currentRevision: 1,
      presetId: 'exposure',
      nextValue: 20,
      values: initial,
    });
    expect(exposureUpdate).not.toBeNull();

    const contrastUpdate = updatePresetValueForRevision({
      callbackRevision: 2,
      currentRevision: 2,
      presetId: 'contrast',
      nextValue: -15,
      values: exposureUpdate!,
    });
    expect(contrastUpdate).toEqual({ exposure: 20, contrast: -15 });
    expect(resolveSelectedPresetId(presets, 'exposure')).toBe('exposure');
    expect(contrastUpdate?.exposure).toBe(20);
  });

  test('rejects stale gesture callbacks after a preset switch', () => {
    expect(isCurrentPresetRevision(3, 4)).toBe(false);
    expect(isCurrentPresetRevision(4, 4)).toBe(true);
    const values = { highlights: 40, contrast: 0 };
    expect(
      updatePresetValueForRevision({
        callbackRevision: 3,
        currentRevision: 4,
        presetId: 'contrast',
        nextValue: 55,
        values,
      })
    ).toBeNull();
    expect(values).toEqual({ highlights: 40, contrast: 0 });
  });

  test('constructs the documented callback argument order and full value map', () => {
    const change = createPresetValueChange({
      callbackRevision: 7,
      currentRevision: 7,
      presetId: 'contrast',
      nextValue: 12,
      values: { exposure: -4, contrast: 0 },
    });
    expect(change).toEqual({
      presetId: 'contrast',
      value: 12,
      values: { exposure: -4, contrast: 12 },
      changed: true,
    });

    const received: unknown[] = [];
    const callback = (...args: unknown[]) => received.push(...args);
    callback(change?.presetId, change?.value, change?.values);
    expect(received).toEqual(['contrast', 12, { exposure: -4, contrast: 12 }]);
  });

  test('reconciles additions, removals, and new range clamps', () => {
    expect(
      reconcilePresetValues(
        [
          { id: 'highlights', min: -10, max: 10, initialValue: 0 },
          { id: 'saturation', min: -100, max: 100, initialValue: 7 },
        ],
        { highlights: 40, removed: 12 }
      )
    ).toEqual({
      changed: true,
      values: { highlights: 10, saturation: 7 },
    });
  });
});
