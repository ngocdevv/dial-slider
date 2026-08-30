import { describe, expect, test } from 'bun:test';

import {
  buildDialTickValues,
  clampDialValue,
  dialTranslationToValue,
  dialValueToTranslation,
  getDialTickOpacity,
  getDialTranslationBounds,
  getNearestDialTick,
  normalizeDialRange,
  snapDialTranslation,
} from '../src/utils/dial-slider/dial-math';

describe('dial value math', () => {
  test('clamps at both range boundaries, including reversed input ranges', () => {
    expect(clampDialValue(-101, -100, 100)).toBe(-100);
    expect(clampDialValue(101, -100, 100)).toBe(100);
    expect(clampDialValue(25, 100, -100)).toBe(25);
    expect(clampDialValue(Number.NaN, -10, 10)).toBe(0);
  });

  test('maps values and ruler positions in both directions', () => {
    expect(dialValueToTranslation(-100, -100, 100, 1.5)).toBe(150);
    expect(dialValueToTranslation(40, -100, 100, 1.5)).toBe(-60);
    expect(dialTranslationToValue(-60, -100, 100, 1.5)).toBe(40);
    expect(dialTranslationToValue(300, -100, 100, 1.5)).toBe(-100);
  });

  test('keeps gesture bounds finite for invalid configuration', () => {
    const bounds = getDialTranslationBounds(
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      0
    );
    expect(bounds).toEqual({
      minTranslation: -100,
      maxTranslation: 100,
    });
    expect(Number.isFinite(dialValueToTranslation(5, -10, 10, 0))).toBe(true);
  });

  test('snaps fling translations to an integer value and respects hard edges', () => {
    expect(snapDialTranslation(-15.4, -100, 100, 1.5)).toBe(-15);
    expect(snapDialTranslation(-999, -100, 100, 1.5)).toBe(-150);
    expect(snapDialTranslation(999, -100, 100, 1.5)).toBe(150);
  });
});

describe('dial ticks', () => {
  test('includes unaligned boundaries and selects the nearest tick', () => {
    const ticks = buildDialTickValues(1, 10, 5, 201);
    expect(ticks).toEqual([1, 5, 10]);
    expect(getNearestDialTick(1, ticks)).toBe(1);
    expect(getNearestDialTick(4, ticks)).toBe(5);
    expect(getNearestDialTick(9, ticks)).toBe(10);
  });

  test('caps extreme ranges without generating non-finite ticks', () => {
    const ticks = buildDialTickValues(
      -Number.MAX_VALUE,
      Number.MAX_VALUE,
      5,
      201
    );
    expect(ticks.length).toBeGreaterThanOrEqual(2);
    expect(ticks.length).toBeLessThanOrEqual(201);
    expect(ticks.every(Number.isFinite)).toBe(true);
  });

  test('normalizes non-finite and reversed ranges', () => {
    expect(
      normalizeDialRange(Number.NEGATIVE_INFINITY, Number.NaN, -100, 100)
    ).toEqual({ min: -100, max: 100 });
    expect(normalizeDialRange(80, -20, -100, 100)).toEqual({
      min: -20,
      max: 80,
    });
  });

  test('keeps edge opacity finite before and after layout', () => {
    expect(getDialTickOpacity(0, 0)).toBe(0);
    expect(getDialTickOpacity(Number.NaN, 100)).toBe(0);
    expect(getDialTickOpacity(0, 100)).toBe(1);
    expect(getDialTickOpacity(95, 100)).toBe(0);
    expect(getDialTickOpacity(200, 100)).toBe(0);
  });
});
