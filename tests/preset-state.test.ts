import {
    dedupePresetsById,
    isCurrentPresetRevision,
    reconcilePresetValues,
    updatePresetValueForRevision,
} from '../src/utils/dial-slider/preset-state';

function assert(condition: boolean, message: string) {
    if (!condition) throw new Error(message);
}

assert(
    !isCurrentPresetRevision(3, 4),
    'A queued value from an old preset revision must be rejected'
);
assert(
    isCurrentPresetRevision(4, 4),
    'A value from the current preset revision must be accepted'
);

const deduped = dedupePresetsById([
    { id: 'exposure', marker: 'first' },
    { id: 'contrast', marker: 'only' },
    { id: 'exposure', marker: 'duplicate' },
]);
assert(deduped.length === 2, 'Duplicate preset IDs must be removed');
assert(
    deduped[0].marker === 'first',
    'The first preset with a duplicate ID must win deterministically'
);

const currentValues = { highlights: 40, contrast: 0 };
const staleUpdate = updatePresetValueForRevision({
    callbackRevision: 3,
    currentRevision: 4,
    presetId: 'contrast',
    nextValue: 55,
    values: currentValues,
});
assert(
    staleUpdate === null,
    'A queued Highlights update must not create a Contrast value update'
);
assert(
    currentValues.contrast === 0,
    'Rejecting a stale update must leave the current map untouched'
);

const reconciled = reconcilePresetValues(
    [
        { id: 'highlights', min: -10, max: 10, initialValue: 0 },
        { id: 'saturation', min: -100, max: 100, initialValue: 7 },
    ],
    { highlights: 40, removed: 12 }
);
assert(reconciled.changed, 'Dynamic preset changes must be detected');
assert(
    JSON.stringify(reconciled.values) ===
        JSON.stringify({ highlights: 10, saturation: 7 }),
    `Dynamic values were not reconciled: ${JSON.stringify(reconciled.values)}`
);

console.log('preset-state revision and ID regression: PASS');
