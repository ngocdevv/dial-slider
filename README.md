# Dial slider

Minimal Expo app demoing a single component: `DialSlider`.

## `DialSlider`

Photo-style adjustment control. The caller owns the tool list (e.g.
`PHOTO_PRESETS`); its length decides chrome:

- **1 preset** → single centered tool + shared ruler
- **N presets** → horizontal strip + independent values per tool + shared ruler

```tsx
import { DialSlider, type DialPreset } from '@/components/dial-slider';

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
];

<DialSlider
  presets={PHOTO_PRESETS}
  initialPresetId="exposure"
  onPresetChange={(presetId, value) => {}}
  onValueChange={(presetId, value, allValues) => {}}
/>
```

## Layout

```text
src/app/                 # single demo screen
src/components/dial-slider/
  DialSlider.tsx
  DialRuler.tsx
  constants.ts
  dial-math.ts
  ring-math.ts
  preset-state.ts
  index.ts
tests/
```

## Scripts

```bash
bun install
bun start
bun run test
bun run lint
```
