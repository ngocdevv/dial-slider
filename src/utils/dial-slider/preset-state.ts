/**
 * A value callback may cross the UI→JS boundary after the user has selected
 * another preset. Only callbacks tagged with the currently active revision may
 * mutate the preset value map.
 */
export function isCurrentPresetRevision(
    callbackRevision: number,
    currentRevision: number
) {
    return callbackRevision === currentRevision;
}

export interface PresetValueUpdateInput {
    callbackRevision: number;
    currentRevision: number;
    presetId: string;
    nextValue: number;
    values: Readonly<Record<string, number>>;
}

/** Returns null for stale UI→JS callbacks without mutating the input map. */
export function updatePresetValueForRevision({
    callbackRevision,
    currentRevision,
    presetId,
    nextValue,
    values,
}: PresetValueUpdateInput) {
    if (!isCurrentPresetRevision(callbackRevision, currentRevision)) {
        return null;
    }
    if (values[presetId] === nextValue) return values;
    return { ...values, [presetId]: nextValue };
}

/** Keeps the first occurrence so keys and value maps remain deterministic. */
export function dedupePresetsById<T extends { id: string }>(
    presets: readonly T[]
) {
    const seen = new Set<string>();
    return presets.filter((preset) => {
        if (seen.has(preset.id)) return false;
        seen.add(preset.id);
        return true;
    });
}

export interface PresetValueConfig {
    id: string;
    min: number;
    max: number;
    initialValue: number;
}

export function reconcilePresetValues(
    presets: readonly PresetValueConfig[],
    currentValues: Readonly<Record<string, number>>
) {
    const values: Record<string, number> = {};
    for (const preset of presets) {
        const current = currentValues[preset.id] ?? preset.initialValue;
        values[preset.id] = Math.min(
            preset.max,
            Math.max(preset.min, current)
        );
    }

    const currentKeys = Object.keys(currentValues);
    const nextKeys = Object.keys(values);
    const changed =
        currentKeys.length !== nextKeys.length ||
        nextKeys.some((key) => currentValues[key] !== values[key]);
    return { values, changed };
}
