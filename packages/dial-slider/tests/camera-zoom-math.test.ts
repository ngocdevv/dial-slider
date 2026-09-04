import { describe, expect, test } from 'bun:test';

import { CAMERA_ZOOM_DIAL_GEOMETRY } from '../src/components/camera-zoom-dial/constants';
import {
  buildCameraZoomTicks,
  CAMERA_ZOOM_DEFAULTS,
  cameraZoomFromTranslation,
  cameraZoomRotationMatrix,
  cameraZoomToAngle,
  findCameraZoomStop,
  findNearestCameraZoomStop,
  formatCameraZoomCompactNumber,
  formatCameraZoomNumber,
  formatCameraZoomValue,
  getCameraZoomRoundedTrianglePath,
  getCameraZoomTriangleHalfWidth,
  getSafeCameraZoomStep,
  isCameraZoomMajorTick,
  normalizeCameraZoomRange,
  normalizeCameraZoomStops,
  roundCameraZoom,
} from '../src/utils/camera-zoom-dial/camera-zoom-math';

describe('camera zoom range and precision', () => {
  test('normalizes reversed, non-finite, and zero-width ranges', () => {
    expect(normalizeCameraZoomRange(10, 0.5)).toEqual({ min: 0.5, max: 10 });
    expect(
      normalizeCameraZoomRange(Number.NaN, Number.POSITIVE_INFINITY)
    ).toEqual({ min: 0.5, max: 10 });
    expect(normalizeCameraZoomRange(2, 2)).toEqual({ min: 0.5, max: 10 });
    expect(normalizeCameraZoomRange(0.5500004, 0.9500006)).toEqual({
      min: 0.55,
      max: 0.950001,
    });
  });

  test('rounds to the requested step and clamps hard camera limits', () => {
    expect(roundCameraZoom(0.51, 0.1, 0.5, 10)).toBe(0.5);
    expect(roundCameraZoom(7.36, 0.1, 0.5, 10)).toBe(7.4);
    expect(roundCameraZoom(12, 0.1, 0.5, 10)).toBe(10);
    expect(roundCameraZoom(Number.NaN, 0.1, 0.5, 10)).toBe(0.5);
    expect(getSafeCameraZoomStep(Number.MIN_VALUE)).toBe(0.000001);
    expect(roundCameraZoom(1, Number.MIN_VALUE, 0.5, 10)).toBe(1);
  });

  test('keeps unaligned hard limits reachable', () => {
    expect(roundCameraZoom(0.55, 0.1, 0.55, 0.95)).toBe(0.55);
    expect(roundCameraZoom(0.95, 0.1, 0.55, 0.95)).toBe(0.95);
    expect(roundCameraZoom(0.64, 0.1, 0.55, 0.95)).toBe(0.6);
    expect(formatCameraZoomValue(0.55, 0.1)).toBe('0.55x');
    expect(formatCameraZoomValue(0.95, 0.1)).toBe('0.95x');
    expect(roundCameraZoom(0, 0.1, 0.5500004, 0.9500006)).toBe(0.55);
    expect(roundCameraZoom(2, 0.1, 0.5500004, 0.9500006)).toBe(0.950001);
  });

  test('formats compact stop labels separately from active zoom labels', () => {
    expect(formatCameraZoomNumber(0.5, 0.1)).toBe('0.5');
    expect(formatCameraZoomCompactNumber(0.5, 0.1)).toBe('.5');
    expect(formatCameraZoomCompactNumber(1, 0.1)).toBe('1');
    expect(formatCameraZoomValue(1, 0.1)).toBe('1x');
    expect(formatCameraZoomValue(7.35, 0.05)).toBe('7.35x');
  });
});

describe('camera zoom logarithmic wheel geometry', () => {
  test('preserves the measured pointer and its 90-degree triangular cutout', () => {
    const pointerWidth = CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HALF_WIDTH * 2;
    const cutoutHeight =
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HEIGHT +
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_APEX_OFFSET +
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_PADDING;
    const cutoutHalfWidth = getCameraZoomTriangleHalfWidth(
      cutoutHeight,
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_APEX_ANGLE
    );
    const cutoutWidth = cutoutHalfWidth * 2;
    const apexAngle =
      (2 * Math.atan(cutoutHalfWidth / cutoutHeight) * 180) / Math.PI;
    const tailHeight =
      CAMERA_ZOOM_DIAL_GEOMETRY.MAJOR_TICK_LENGTH +
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_PADDING -
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HEIGHT -
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_APEX_OFFSET +
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_TAIL_HALF_WIDTH;

    expect(pointerWidth).toBe(4);
    expect(CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_HEIGHT).toBe(9);
    expect(cutoutWidth).toBeCloseTo(24);
    expect(cutoutHeight).toBe(12);
    expect(apexAngle).toBeCloseTo(90);
    expect(tailHeight).toBe(6.5);
  });

  test('keeps major and minor ticks at the same height', () => {
    expect(CAMERA_ZOOM_DIAL_GEOMETRY.MAJOR_TICK_LENGTH).toBe(
      CAMERA_ZOOM_DIAL_GEOMETRY.MINOR_TICK_LENGTH
    );
  });

  test('rounds every triangle corner while preserving its anchor points', () => {
    const roundedPath = getCameraZoomRoundedTrianglePath(
      0,
      0,
      12,
      12,
      CAMERA_ZOOM_DIAL_GEOMETRY.POINTER_OCCLUSION_CORNER_RADIUS
    );

    expect(roundedPath.match(/\bQ\b/g)).toHaveLength(3);
    expect(roundedPath).toContain('Q 12 0');
    expect(roundedPath).toContain('Q 0 12');
    expect(roundedPath).toContain('Q -12 0');
    expect(getCameraZoomRoundedTrianglePath(0, 0, 12, 12, 0)).toBe(
      'M -12 0 L 12 0 L 0 12 Z'
    );
  });

  test('spaces every zoom doubling by the measured 20 degree interval', () => {
    expect(cameraZoomToAngle(0.5, 1)).toBe(-20);
    expect(cameraZoomToAngle(2, 1)).toBe(20);
    expect(cameraZoomToAngle(10, 0.5)).toBeCloseTo(86.4386, 4);
  });

  test('maps one tangential octave of drag to one zoom doubling', () => {
    const radius = 200;
    const pointsPerOctave =
      radius * ((CAMERA_ZOOM_DEFAULTS.DEGREES_PER_OCTAVE * Math.PI) / 180);
    expect(
      cameraZoomFromTranslation(1, -pointsPerOctave, radius, 0.5, 10)
    ).toBeCloseTo(2, 6);
    expect(
      cameraZoomFromTranslation(1, pointsPerOctave, radius, 0.5, 10)
    ).toBeCloseTo(0.5, 6);
  });

  test('builds a native SVG matrix that rotates around the dial center', () => {
    const center = 100;
    const [a, b, c, d, translateX, translateY] = cameraZoomRotationMatrix(
      90,
      center
    );

    const transformedCenterX = a * center + c * center + translateX;
    const transformedCenterY = b * center + d * center + translateY;
    const transformedTopX = a * center + translateX;
    const transformedTopY = b * center + translateY;

    expect(transformedCenterX).toBeCloseTo(center, 6);
    expect(transformedCenterY).toBeCloseTo(center, 6);
    expect(transformedTopX).toBeCloseTo(center * 2, 6);
    expect(transformedTopY).toBeCloseTo(center, 6);
  });

  test('builds decimal ticks while capping extreme render work', () => {
    const ticks = buildCameraZoomTicks(0.5, 10, 0.1);
    expect(ticks[0]).toBe(0.5);
    expect(ticks.at(-1)).toBe(10);
    expect(ticks).toContain(1);
    expect(ticks).toContain(2);
    expect(ticks.length).toBeLessThanOrEqual(
      CAMERA_ZOOM_DEFAULTS.MAX_TICK_COUNT
    );

    const extremeTicks = buildCameraZoomTicks(0.01, 1_000, 0.001, 120);
    expect(extremeTicks.length).toBeLessThanOrEqual(120);
    expect(extremeTicks.every(Number.isFinite)).toBe(true);
  });

  test('marks integer, range-edge, and optical-stop ticks as major', () => {
    const stops = [{ value: 0.5 }, { value: 1 }, { value: 2 }];
    expect(isCameraZoomMajorTick(0.5, stops, 0.1, 0.5, 10)).toBe(true);
    expect(isCameraZoomMajorTick(3, stops, 0.1, 0.5, 10)).toBe(true);
    expect(isCameraZoomMajorTick(3.1, stops, 0.1, 0.5, 10)).toBe(false);
    expect(isCameraZoomMajorTick(10, stops, 0.1, 0.5, 10)).toBe(true);
  });
});

describe('camera zoom stops', () => {
  test('sorts, deduplicates, and drops out-of-range or invalid stops', () => {
    expect(
      normalizeCameraZoomStops(
        [
          { value: 2, label: 'first' },
          { value: 0.5 },
          { value: 2, label: 'duplicate' },
          { value: Number.NaN },
          { value: 12 },
        ],
        0.5,
        10
      )
    ).toEqual([{ value: 0.5 }, { value: 2, label: 'first' }]);
  });

  test('aligns custom stops with their rendered and selectable step values', () => {
    expect(
      normalizeCameraZoomStops(
        [
          { value: 1.25, focalLength: '50MM' },
          { value: 1.26, label: 'duplicate after snapping' },
        ],
        0.5,
        10,
        0.1
      )
    ).toEqual([{ value: 1.3, focalLength: '50MM' }]);
  });

  test('matches focal-length metadata within half a display step', () => {
    const stops = [
      { value: 0.5, focalLength: '13MM' },
      { value: 1, focalLength: '26MM' },
    ];
    expect(findCameraZoomStop(1.04, stops, 0.1)?.focalLength).toBe('26MM');
    expect(findCameraZoomStop(1.06, stops, 0.1)).toBeUndefined();
  });

  test('keeps the logarithmically nearest optical stop active between stops', () => {
    const stops = [{ value: 0.5 }, { value: 1 }, { value: 2 }];
    expect(findNearestCameraZoomStop(0.7, stops)?.value).toBe(0.5);
    expect(findNearestCameraZoomStop(1.5, stops)?.value).toBe(2);
    expect(findNearestCameraZoomStop(7.4, stops)?.value).toBe(2);
    expect(findNearestCameraZoomStop(1, [])).toBeUndefined();
  });
});
