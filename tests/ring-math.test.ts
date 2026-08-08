import {
    createCircularArcPath,
    getBipolarProgress,
    getSignedProgressColor,
} from '../src/utils/dial-slider/ring-math';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

assert(
    createCircularArcPath(29, 29, 25, 0, 1) === null,
    'Zero progress must not render an active arc'
);

const positive = createCircularArcPath(29, 29, 25, 0.25, 1);
const negative = createCircularArcPath(29, 29, 25, 0.25, -1);
assert(positive !== null, 'Positive progress must create an arc');
assert(negative !== null, 'Negative progress must create an arc');
assert(
    positive !== null && positive.includes('A 25 25 0 0 1'),
    `Positive progress must sweep clockwise: ${positive}`
);
assert(
    negative !== null && negative.includes('A 25 25 0 0 0'),
    `Negative progress must sweep counter-clockwise: ${negative}`
);

const full = createCircularArcPath(29, 29, 25, 1, 1);
assert(
    full !== null && !full.includes('NaN') && !full.includes('Infinity'),
    `Full progress must remain a finite SVG arc: ${full}`
);

const accentColor = '#FFD700';
const negativeColor = '#FFFFFF';
assert(
    getSignedProgressColor(-1, accentColor, negativeColor) === negativeColor,
    'Negative progress must use white'
);
assert(
    getSignedProgressColor(0, accentColor, negativeColor) === accentColor,
    'Zero progress must keep the positive color'
);
assert(
    getSignedProgressColor(1, accentColor, negativeColor) === accentColor,
    'Positive progress must keep the positive color'
);

assert(
    getBipolarProgress(50, -100, 100) === 0.5,
    'Positive progress is relative to max'
);
assert(
    getBipolarProgress(-25, -100, 100) === 0.25,
    'Negative progress is relative to |min|'
);
assert(
    getBipolarProgress(0, -100, 100) === 0,
    'Zero has no active arc progress'
);

console.log('ring-math regression: PASS');
