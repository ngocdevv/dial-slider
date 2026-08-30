import {
    buildDialTickValues,
    getNearestDialTick,
    normalizeDialRange,
} from '../src/utils/dial-slider/dial-math';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

const offsetTicks = buildDialTickValues(1, 10, 5, 201);
assert(
    JSON.stringify(offsetTicks) === JSON.stringify([1, 5, 10]),
    `Expected boundary-aware ticks [1,5,10], got ${JSON.stringify(offsetTicks)}`
);
assert(getNearestDialTick(1, offsetTicks) === 1, 'Value 1 needs a center tick');
assert(getNearestDialTick(4, offsetTicks) === 5, 'Value 4 should select tick 5');
assert(getNearestDialTick(9, offsetTicks) === 10, 'Value 9 should select tick 10');

const hugeTicks = buildDialTickValues(-1_000_000, 1_000_000, 5, 201);
assert(hugeTicks.length <= 201, `Tick count must be capped, got ${hugeTicks.length}`);

const finiteRange = normalizeDialRange(
    Number.NEGATIVE_INFINITY,
    Number.NaN,
    -100,
    100
);
assert(
    finiteRange.min === -100 && finiteRange.max === 100,
    'Non-finite ranges must fall back to finite defaults'
);

const extremeRange = normalizeDialRange(
    -Number.MAX_VALUE,
    Number.MAX_VALUE,
    -100,
    100
);
assert(
    Number.isFinite(extremeRange.max - extremeRange.min),
    'Finite extreme inputs must not overflow the normalized range width'
);
const extremeTicks = buildDialTickValues(
    -Number.MAX_VALUE,
    Number.MAX_VALUE,
    5,
    201
);
assert(
    extremeTicks.length >= 2 &&
        extremeTicks.every((tick) => Number.isFinite(tick)),
    'Finite extreme inputs must produce finite boundary ticks'
);

console.log('dial-math regression: PASS');
