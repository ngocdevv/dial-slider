interface Point {
  x: number;
  y: number;
}

/** Bipolar fill: + side vs maxValue, − side vs |minValue|. */
export function getBipolarProgress(
  value: number,
  minValue: number,
  maxValue: number
) {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(minValue) ||
    !Number.isFinite(maxValue)
  ) {
    return 0;
  }

  const min = Math.min(minValue, maxValue);
  const max = Math.max(minValue, maxValue);
  const clampedValue = Math.min(max, Math.max(min, value));
  if (clampedValue >= 0) {
    return max <= 0 ? 0 : Math.min(Math.max(clampedValue / max, 0), 1);
  }
  return min >= 0
    ? 0
    : Math.min(Math.max(Math.abs(clampedValue) / Math.abs(min), 0), 1);
}

export function getSignedProgressColor(
  value: number,
  positiveColor: string,
  negativeColor: string
) {
  return value < 0 ? negativeColor : positiveColor;
}

function polarPoint(
  centerX: number,
  centerY: number,
  radius: number,
  angleDegrees: number
): Point {
  const angleRadians = (angleDegrees * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRadians),
    y: centerY + radius * Math.sin(angleRadians),
  };
}

/**
 * Builds a continuous SVG arc from 12 o'clock.
 * Positive direction sweeps clockwise; negative sweeps counter-clockwise.
 */
export function createCircularArcPath(
  centerX: number,
  centerY: number,
  radius: number,
  progress: number,
  direction: 1 | -1
) {
  if (
    !Number.isFinite(centerX) ||
    !Number.isFinite(centerY) ||
    !Number.isFinite(radius) ||
    !Number.isFinite(progress) ||
    radius <= 0 ||
    progress <= 0
  ) {
    return null;
  }

  const clampedProgress = Math.min(progress, 1);
  // SVG cannot represent a 360° arc whose endpoints are identical.
  const sweepDegrees = Math.min(clampedProgress * 360, 359.999);
  const startAngle = -90;
  const endAngle = startAngle + direction * sweepDegrees;
  const start = polarPoint(centerX, centerY, radius, startAngle);
  const end = polarPoint(centerX, centerY, radius, endAngle);
  const largeArcFlag = sweepDegrees > 180 ? 1 : 0;
  const sweepFlag = direction > 0 ? 1 : 0;

  return [
    `M ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`,
  ].join(' ');
}
