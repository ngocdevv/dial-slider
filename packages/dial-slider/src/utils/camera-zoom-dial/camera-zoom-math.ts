export interface CameraZoomRange {
  min: number;
  max: number;
}

export interface CameraZoomStopValue {
  value: number;
}

export type CameraZoomRotationMatrix = [
  number,
  number,
  number,
  number,
  number,
  number,
];

export const CAMERA_ZOOM_DEFAULTS = {
  MIN: 0.5,
  MAX: 10,
  STEP: 0.1,
  DEGREES_PER_OCTAVE: 20,
  MAX_TICK_COUNT: 240,
} as const;

const MAX_ZOOM_FACTOR = 1_000;
const FLOAT_PRECISION = 1_000_000;

function clampFinitePositive(value: number, fallback: number) {
  'worklet';
  const resolved = Number.isFinite(value) && value > 0 ? value : fallback;
  const clamped = Math.min(
    MAX_ZOOM_FACTOR,
    Math.max(1 / FLOAT_PRECISION, resolved)
  );
  return Math.round(clamped * FLOAT_PRECISION) / FLOAT_PRECISION;
}

export function normalizeCameraZoomRange(
  minZoom: number = CAMERA_ZOOM_DEFAULTS.MIN,
  maxZoom: number = CAMERA_ZOOM_DEFAULTS.MAX
): CameraZoomRange {
  const first = clampFinitePositive(minZoom, CAMERA_ZOOM_DEFAULTS.MIN);
  const second = clampFinitePositive(maxZoom, CAMERA_ZOOM_DEFAULTS.MAX);
  const min = Math.min(first, second);
  const max = Math.max(first, second);

  if (min === max) {
    return {
      min: CAMERA_ZOOM_DEFAULTS.MIN,
      max: CAMERA_ZOOM_DEFAULTS.MAX,
    };
  }
  return { min, max };
}

export function getSafeCameraZoomStep(step: number) {
  'worklet';
  return clampFinitePositive(step, CAMERA_ZOOM_DEFAULTS.STEP);
}

function getCameraZoomBounds(minZoom: number, maxZoom: number) {
  'worklet';
  const first = clampFinitePositive(minZoom, CAMERA_ZOOM_DEFAULTS.MIN);
  const second = clampFinitePositive(maxZoom, CAMERA_ZOOM_DEFAULTS.MAX);
  return {
    min: Math.min(first, second),
    max: Math.max(first, second),
  };
}

export function clampCameraZoom(
  zoom: number,
  minZoom: number,
  maxZoom: number
) {
  'worklet';
  const { min, max } = getCameraZoomBounds(minZoom, maxZoom);
  const safeZoom = Number.isFinite(zoom) && zoom > 0 ? zoom : min;
  return Math.min(max, Math.max(min, safeZoom));
}

export function roundCameraZoom(
  zoom: number,
  step: number,
  minZoom: number,
  maxZoom: number
) {
  'worklet';
  const safeStep = getSafeCameraZoomStep(step);
  const { min, max } = getCameraZoomBounds(minZoom, maxZoom);
  const clamped = clampCameraZoom(zoom, minZoom, maxZoom);
  const rounded =
    clamped === min || clamped === max
      ? clamped
      : Math.round(clamped / safeStep) * safeStep;
  return (
    Math.round(clampCameraZoom(rounded, minZoom, maxZoom) * FLOAT_PRECISION) /
    FLOAT_PRECISION
  );
}

export function cameraZoomToLogPosition(zoom: number) {
  'worklet';
  const safeZoom =
    Number.isFinite(zoom) && zoom > 0 ? zoom : CAMERA_ZOOM_DEFAULTS.MIN;
  return Math.log2(safeZoom);
}

export function cameraLogPositionToZoom(position: number) {
  'worklet';
  return Math.pow(2, Number.isFinite(position) ? position : 0);
}

/**
 * The reference video spaces each doubling (0.5→1→2) by approximately 20°.
 */
export function cameraZoomToAngle(
  zoom: number,
  selectedZoom: number,
  degreesPerOctave: number = CAMERA_ZOOM_DEFAULTS.DEGREES_PER_OCTAVE
) {
  'worklet';
  const safeDegrees =
    Number.isFinite(degreesPerOctave) && degreesPerOctave > 0
      ? degreesPerOctave
      : CAMERA_ZOOM_DEFAULTS.DEGREES_PER_OCTAVE;
  return (
    (cameraZoomToLogPosition(zoom) - cameraZoomToLogPosition(selectedZoom)) *
    safeDegrees
  );
}

/** Builds the native SVG affine matrix for a rotation around a fixed point. */
export function cameraZoomRotationMatrix(
  angleDegrees: number,
  centerX: number,
  centerY: number = centerX
): CameraZoomRotationMatrix {
  'worklet';
  const safeAngle = Number.isFinite(angleDegrees) ? angleDegrees : 0;
  const safeCenterX = Number.isFinite(centerX) ? centerX : 0;
  const safeCenterY = Number.isFinite(centerY) ? centerY : 0;
  const radians = (safeAngle * Math.PI) / 180;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);

  return [
    cosine,
    sine,
    -sine,
    cosine,
    safeCenterX - safeCenterX * cosine + safeCenterY * sine,
    safeCenterY - safeCenterX * sine - safeCenterY * cosine,
  ];
}

/** Returns one half of an isosceles triangle's base for its tip angle. */
export function getCameraZoomTriangleHalfWidth(
  height: number,
  apexAngleDegrees: number
) {
  const safeHeight = Number.isFinite(height) ? Math.max(0, height) : 0;
  const safeAngle =
    Number.isFinite(apexAngleDegrees) &&
    apexAngleDegrees > 0 &&
    apexAngleDegrees < 180
      ? apexAngleDegrees
      : 90;
  return safeHeight * Math.tan((safeAngle * Math.PI) / 360);
}

/** Builds a closed triangular SVG path with a quadratic curve at every corner. */
export function getCameraZoomRoundedTrianglePath(
  centerX: number,
  topY: number,
  halfWidth: number,
  apexY: number,
  cornerRadius: number
) {
  const safeCenterX = Number.isFinite(centerX) ? centerX : 0;
  const safeTopY = Number.isFinite(topY) ? topY : 0;
  const safeHalfWidth = Number.isFinite(halfWidth) ? Math.max(0, halfWidth) : 0;
  const safeApexY = Number.isFinite(apexY)
    ? Math.max(safeTopY, apexY)
    : safeTopY;
  const height = safeApexY - safeTopY;
  const leftX = safeCenterX - safeHalfWidth;
  const rightX = safeCenterX + safeHalfWidth;
  const sharpPath = `M ${leftX} ${safeTopY} L ${rightX} ${safeTopY} L ${safeCenterX} ${safeApexY} Z`;
  const requestedRadius = Number.isFinite(cornerRadius)
    ? Math.max(0, cornerRadius)
    : 0;

  if (requestedRadius === 0 || safeHalfWidth === 0 || height === 0) {
    return sharpPath;
  }

  const sideLength = Math.hypot(safeHalfWidth, height);
  const baseAngle = Math.atan2(height, safeHalfWidth);
  const apexAngle = Math.PI - 2 * baseAngle;
  const baseTangent = Math.tan(baseAngle / 2);
  const apexTangent = Math.tan(apexAngle / 2);

  if (baseTangent <= 0 || apexTangent <= 0) return sharpPath;

  const maxBaseRadius = safeHalfWidth * baseTangent;
  const maxSideRadius = sideLength / (1 / baseTangent + 1 / apexTangent);
  const radius = Math.min(requestedRadius, maxBaseRadius, maxSideRadius);
  const baseOffset = radius / baseTangent;
  const apexOffset = radius / apexTangent;
  const sideUnitX = safeHalfWidth / sideLength;
  const sideUnitY = height / sideLength;
  const baseSideX = sideUnitX * baseOffset;
  const baseSideY = sideUnitY * baseOffset;
  const apexSideX = sideUnitX * apexOffset;
  const apexSideY = sideUnitY * apexOffset;

  return [
    `M ${leftX + baseOffset} ${safeTopY}`,
    `L ${rightX - baseOffset} ${safeTopY}`,
    `Q ${rightX} ${safeTopY} ${rightX - baseSideX} ${safeTopY + baseSideY}`,
    `L ${safeCenterX + apexSideX} ${safeApexY - apexSideY}`,
    `Q ${safeCenterX} ${safeApexY} ${safeCenterX - apexSideX} ${safeApexY - apexSideY}`,
    `L ${leftX + baseSideX} ${safeTopY + baseSideY}`,
    `Q ${leftX} ${safeTopY} ${leftX + baseOffset} ${safeTopY}`,
    'Z',
  ].join(' ');
}

/** Maps a horizontal drag to the tangential rotation of the circular scale. */
export function cameraZoomFromTranslation(
  startZoom: number,
  translationX: number,
  radius: number,
  minZoom: number,
  maxZoom: number,
  degreesPerOctave: number = CAMERA_ZOOM_DEFAULTS.DEGREES_PER_OCTAVE
) {
  'worklet';
  const safeRadius = Number.isFinite(radius) && radius > 0 ? radius : 1;
  const safeDegrees =
    Number.isFinite(degreesPerOctave) && degreesPerOctave > 0
      ? degreesPerOctave
      : CAMERA_ZOOM_DEFAULTS.DEGREES_PER_OCTAVE;
  const pointsPerOctave = safeRadius * ((safeDegrees * Math.PI) / 180);
  const octaveDelta =
    -(Number.isFinite(translationX) ? translationX : 0) /
    Math.max(1, pointsPerOctave);
  return clampCameraZoom(
    startZoom * Math.pow(2, octaveDelta),
    minZoom,
    maxZoom
  );
}

export function buildCameraZoomTicks(
  minZoom: number,
  maxZoom: number,
  step: number,
  maxTickCount: number = CAMERA_ZOOM_DEFAULTS.MAX_TICK_COUNT
) {
  const { min, max } = normalizeCameraZoomRange(minZoom, maxZoom);
  const baseStep = getSafeCameraZoomStep(step);
  const safeMaxCount = Math.max(2, Math.floor(maxTickCount));
  const estimatedCount = Math.floor((max - min) / baseStep) + 1;
  const tickStep =
    baseStep * Math.max(1, Math.ceil(estimatedCount / safeMaxCount));
  const firstAligned = Math.ceil(min / tickStep) * tickStep;
  const epsilon = tickStep / FLOAT_PRECISION;
  const ticks = [min];

  for (let value = firstAligned; value < max - epsilon; value += tickStep) {
    const rounded = Math.round(value * FLOAT_PRECISION) / FLOAT_PRECISION;
    if (rounded > min + epsilon) ticks.push(rounded);
    if (ticks.length >= safeMaxCount - 1) break;
  }

  if (Math.abs(ticks[ticks.length - 1] - max) > epsilon) ticks.push(max);
  return ticks;
}

export function isCameraZoomMajorTick(
  zoom: number,
  stops: readonly CameraZoomStopValue[],
  step: number,
  minZoom: number,
  maxZoom: number
) {
  const tolerance = Math.max(getSafeCameraZoomStep(step) / 100, 1e-6);
  return (
    Math.abs(zoom - minZoom) <= tolerance ||
    Math.abs(zoom - maxZoom) <= tolerance ||
    Math.abs(zoom - Math.round(zoom)) <= tolerance ||
    stops.some((stop) => Math.abs(stop.value - zoom) <= tolerance)
  );
}

export function normalizeCameraZoomStops<T extends CameraZoomStopValue>(
  stops: readonly T[],
  minZoom: number,
  maxZoom: number,
  step?: number
) {
  const { min, max } = normalizeCameraZoomRange(minZoom, maxZoom);
  const seen = new Set<number>();
  return stops
    .filter(
      (stop) =>
        Number.isFinite(stop.value) && stop.value >= min && stop.value <= max
    )
    .map((stop) => {
      if (step === undefined) return stop;
      const value = roundCameraZoom(stop.value, step, min, max);
      return value === stop.value ? stop : ({ ...stop, value } as T);
    })
    .filter((stop) => {
      const key = Math.round(stop.value * FLOAT_PRECISION);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((first, second) => first.value - second.value);
}

export function findCameraZoomStop<T extends CameraZoomStopValue>(
  zoom: number,
  stops: readonly T[],
  step: number
) {
  const tolerance = Math.max(getSafeCameraZoomStep(step) / 2, 1e-6);
  return stops.find((stop) => Math.abs(stop.value - zoom) <= tolerance);
}

export function findNearestCameraZoomStop<T extends CameraZoomStopValue>(
  zoom: number,
  stops: readonly T[]
) {
  const validStops = stops.filter(
    (stop) => Number.isFinite(stop.value) && stop.value > 0
  );
  if (validStops.length === 0) return undefined;

  const zoomPosition = cameraZoomToLogPosition(zoom);
  return validStops.reduce((nearest, candidate) => {
    const nearestDistance = Math.abs(
      cameraZoomToLogPosition(nearest.value) - zoomPosition
    );
    const candidateDistance = Math.abs(
      cameraZoomToLogPosition(candidate.value) - zoomPosition
    );
    return candidateDistance < nearestDistance ? candidate : nearest;
  });
}

function getCameraZoomPrecision(value: number) {
  const source = Math.abs(value).toFixed(6).replace(/0+$/, '');
  const decimalIndex = source.indexOf('.');
  return decimalIndex === -1 ? 0 : source.length - decimalIndex - 1;
}

export function formatCameraZoomNumber(zoom: number, step: number) {
  const precision = Math.max(
    getCameraZoomPrecision(getSafeCameraZoomStep(step)),
    getCameraZoomPrecision(zoom)
  );
  return Number(zoom.toFixed(precision)).toString();
}

export function formatCameraZoomCompactNumber(zoom: number, step: number) {
  return formatCameraZoomNumber(zoom, step).replace(/^0\./, '.');
}

export function formatCameraZoomValue(zoom: number, step: number) {
  return `${formatCameraZoomNumber(zoom, step)}x`;
}
