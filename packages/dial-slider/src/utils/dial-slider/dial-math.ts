export interface DialRange {
  min: number;
  max: number;
}

/** Keeps range arithmetic and Reanimated transforms safely finite. */
export const MAX_ABS_DIAL_VALUE = 1_000_000;

function clampFiniteDialValue(value: number) {
  'worklet';
  return Math.max(-MAX_ABS_DIAL_VALUE, Math.min(MAX_ABS_DIAL_VALUE, value));
}

export function clampDialValue(value: number, min: number, max: number) {
  'worklet';
  const lower = Math.min(min, max);
  const upper = Math.max(min, max);
  const safeValue = Number.isFinite(value) ? value : 0;
  return Math.min(upper, Math.max(lower, safeValue));
}

export interface DialTranslationBounds {
  minTranslation: number;
  maxTranslation: number;
}

function getSafeTickSpacing(tickSpacing: number) {
  'worklet';
  return Number.isFinite(tickSpacing) && tickSpacing > 0 ? tickSpacing : 1;
}

/** Returns the finite translation limits used by the pan gesture. */
export function getDialTranslationBounds(
  minValue: number,
  maxValue: number,
  tickSpacing: number
): DialTranslationBounds {
  'worklet';
  const spacing = getSafeTickSpacing(tickSpacing);
  const safeMin = clampFiniteDialValue(
    Number.isFinite(minValue) ? minValue : -100
  );
  const safeMax = clampFiniteDialValue(
    Number.isFinite(maxValue) ? maxValue : 100
  );
  const lower = Math.min(safeMin, safeMax);
  const upper = Math.max(safeMin, safeMax);
  return {
    minTranslation: -upper * spacing,
    maxTranslation: -lower * spacing,
  };
}

/** Maps a dial value to its clamped horizontal ruler translation. */
export function dialValueToTranslation(
  value: number,
  minValue: number,
  maxValue: number,
  tickSpacing: number
) {
  'worklet';
  const spacing = getSafeTickSpacing(tickSpacing);
  const { minTranslation, maxTranslation } = getDialTranslationBounds(
    minValue,
    maxValue,
    spacing
  );
  const safeValue = clampDialValue(
    value,
    -maxTranslation / spacing,
    -minTranslation / spacing
  );
  return Math.max(
    minTranslation,
    Math.min(maxTranslation, -safeValue * spacing)
  );
}

/** Maps a ruler translation back to a clamped dial value. */
export function dialTranslationToValue(
  translation: number,
  minValue: number,
  maxValue: number,
  tickSpacing: number
) {
  'worklet';
  const spacing = getSafeTickSpacing(tickSpacing);
  const safeTranslation = Number.isFinite(translation) ? translation : 0;
  const { minTranslation, maxTranslation } = getDialTranslationBounds(
    minValue,
    maxValue,
    spacing
  );
  return clampDialValue(
    -safeTranslation / spacing,
    -maxTranslation / spacing,
    -minTranslation / spacing
  );
}

/** Snaps the ruler to the nearest integer dial value within its range. */
export function snapDialTranslation(
  translation: number,
  minValue: number,
  maxValue: number,
  tickSpacing: number
) {
  'worklet';
  const value = Math.round(
    dialTranslationToValue(translation, minValue, maxValue, tickSpacing)
  );
  return dialValueToTranslation(value, minValue, maxValue, tickSpacing);
}

export function normalizeDialRange(
  first: number,
  second: number,
  fallbackMin: number,
  fallbackMax: number
): DialRange {
  const safeFallbackMin = clampFiniteDialValue(
    Number.isFinite(fallbackMin) ? fallbackMin : -100
  );
  const safeFallbackMax = clampFiniteDialValue(
    Number.isFinite(fallbackMax) ? fallbackMax : 100
  );
  const safeFirst = clampFiniteDialValue(
    Number.isFinite(first) ? first : safeFallbackMin
  );
  const safeSecond = clampFiniteDialValue(
    Number.isFinite(second) ? second : safeFallbackMax
  );
  return {
    min: Math.min(safeFirst, safeSecond),
    max: Math.max(safeFirst, safeSecond),
  };
}

/**
 * Includes range boundaries and aligned interior ticks while capping render work.
 */
export function buildDialTickValues(
  minValue: number,
  maxValue: number,
  baseStep: number,
  maxTickCount: number
) {
  if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) return [];
  const boundedMin = clampFiniteDialValue(minValue);
  const boundedMax = clampFiniteDialValue(maxValue);
  const min = Math.min(boundedMin, boundedMax);
  const max = Math.max(boundedMin, boundedMax);
  if (min === max) return [min];

  const safeBaseStep = Number.isFinite(baseStep) && baseStep > 0 ? baseStep : 1;
  const safeMaxCount = Math.max(2, Math.floor(maxTickCount));
  const availableInterior = Math.max(1, safeMaxCount - 2);
  const range = max - min;
  const stepMultiplier = Math.max(
    1,
    Math.ceil(range / (safeBaseStep * availableInterior))
  );
  const step = safeBaseStep * stepMultiplier;
  const firstAligned = Math.ceil(min / step) * step;
  const epsilon = step * 1e-9;
  const ticks = [min];

  for (let tick = firstAligned; tick < max - epsilon; tick += step) {
    if (tick > min + epsilon) ticks.push(tick);
    if (ticks.length >= safeMaxCount - 1) break;
  }

  if (Math.abs(ticks[ticks.length - 1] - max) > epsilon) {
    ticks.push(max);
  }
  return ticks;
}

export function getNearestDialTick(value: number, ticks: readonly number[]) {
  'worklet';
  if (ticks.length === 0) return value;

  let nearest = ticks[0];
  let nearestDistance = Math.abs(value - nearest);
  for (let index = 1; index < ticks.length; index += 1) {
    const candidate = ticks[index];
    const distance = Math.abs(value - candidate);
    if (distance < nearestDistance) {
      nearest = candidate;
      nearestDistance = distance;
    }
  }
  return nearest;
}

/** Keeps the edge fade finite before the ruler receives its first layout. */
export function getDialTickOpacity(x: number, screenCenter: number) {
  'worklet';
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(screenCenter) ||
    screenCenter <= 0
  ) {
    return 0;
  }
  const fadeRadius = screenCenter * 0.95;
  return Math.max(0, Math.min(1, 1 - Math.abs(x) / fadeRadius));
}
