# Dial slider

## `DialSlider`

One component for photo-style adjustments. The caller owns the tool list
(e.g. `PHOTO_PRESETS`); its length decides chrome:

- **1 preset** → single centered tool + shared ruler
- **N presets** → horizontal strip + independent values per tool + shared ruler

```tsx
import {
  DialSlider,
  type DialPreset,
} from '@/components/dial-slider';

const PHOTO_PRESETS: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: ({ selected }) => (
      <MyExposureIcon color={selected ? '#fff' : '#aaa'} />
    ),
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: <MyContrastIcon />,
    minValue: -100,
    maxValue: 100,
  },
];

<DialSlider
  presets={PHOTO_PRESETS}
  initialPresetId="exposure"
  onPresetChange={(presetId, value) => {
    // Load the selected adjustment preview.
  }}
  onValueChange={(presetId, value, allValues) => {
    // Apply the live image adjustment.
  }}
/>
```

Each preset accepts `id`, `label`, `icon`, `minValue`, `maxValue`,
`initialValue`, optional accessibility `step`, `formatValue`, and `disabled`.
Use stable, unique IDs; if duplicates are supplied, the first preset with that ID
wins deterministically. Non-finite ranges fall back to the default dial range;
finite bounds are clamped to `±1,000,000` so ruler transforms remain safe, and
very large ranges cap their rendered tick count.

The component preserves each preset's value while the user switches or scrolls
between tools. `onValuesChange` provides the complete value map, including when
a dynamic preset update adds, removes, or clamps values.

## Module layout

```text
src/components/dial-slider/
  DialSlider.tsx   # single public UI component
  DialRuler.tsx    # pan/decay ruler
  constants.ts
  dial-math.ts
  ring-math.ts
  preset-state.ts  # revision gate + dynamic reconcile
  index.ts
```

## Get started

```bash
bun install
bun start
```

```bash
bun run test
bun run lint
```
