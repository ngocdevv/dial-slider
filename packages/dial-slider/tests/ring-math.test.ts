import { describe, expect, test } from 'bun:test';

import {
  createCircularArcPath,
  getBipolarProgress,
  getSignedProgressColor,
} from '../src/utils/dial-slider/ring-math';

describe('preset progress ring', () => {
  test('calculates positive and negative bipolar progress', () => {
    expect(getBipolarProgress(50, -100, 100)).toBe(0.5);
    expect(getBipolarProgress(-25, -100, 100)).toBe(0.25);
    expect(getBipolarProgress(0, -100, 100)).toBe(0);
  });

  test('starts one-sided ranges at their nearest-to-zero boundary', () => {
    expect(getBipolarProgress(10, 10, 20)).toBe(0);
    expect(getBipolarProgress(15, 10, 20)).toBe(0.5);
    expect(getBipolarProgress(20, 10, 20)).toBe(1);

    expect(getBipolarProgress(-10, -20, -10)).toBe(0);
    expect(getBipolarProgress(-15, -20, -10)).toBe(0.5);
    expect(getBipolarProgress(-20, -20, -10)).toBe(1);
  });

  test('clamps progress and safely rejects non-finite configuration', () => {
    expect(getBipolarProgress(500, -100, 100)).toBe(1);
    expect(getBipolarProgress(-500, -100, 100)).toBe(1);
    expect(getBipolarProgress(Number.NaN, -100, 100)).toBe(0);
    expect(getBipolarProgress(10, Number.NaN, 100)).toBe(0);
  });

  test('uses the signed progress color', () => {
    expect(getSignedProgressColor(-1, '#FFD700', '#FFFFFF')).toBe('#FFFFFF');
    expect(getSignedProgressColor(0, '#FFD700', '#FFFFFF')).toBe('#FFD700');
    expect(getSignedProgressColor(1, '#FFD700', '#FFFFFF')).toBe('#FFD700');
  });

  test('draws clockwise and counter-clockwise finite SVG arcs', () => {
    expect(createCircularArcPath(29, 29, 25, 0, 1)).toBeNull();
    const positive = createCircularArcPath(29, 29, 25, 0.25, 1);
    const negative = createCircularArcPath(29, 29, 25, 0.25, -1);
    const full = createCircularArcPath(29, 29, 25, 1, 1);

    expect(positive).toContain('A 25 25 0 0 1');
    expect(negative).toContain('A 25 25 0 0 0');
    expect(full).not.toContain('NaN');
    expect(full).not.toContain('Infinity');
  });
});
