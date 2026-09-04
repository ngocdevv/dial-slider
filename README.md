# Dial Slider

[![CI](https://github.com/ngocdevv/dial-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/ngocdevv/dial-slider/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40ngocdevv%2Fdial-slider.svg)](https://www.npmjs.com/package/@ngocdevv/dial-slider)

An animated, photo-style dial slider component for React Native and Expo. It
combines a gesture-driven ruler with single- or multi-preset adjustment controls,
independent values, progress rings, and accessible increment/decrement actions.

## Demo

![Dial Slider demo](./demo.gif)

## Features

- One preset renders a centered adjustment tool; multiple presets render a
  horizontally scrollable strip.
- Each preset keeps an independent value, range, initial value, icon, label,
  formatter, step, and disabled state.
- Pan, decay, edge clamping, and snap motion run with Gesture Handler and
  Reanimated shared values on the UI runtime.
- Controlled and uncontrolled values and selection are supported.
- VoiceOver and TalkBack receive an adjustable role, range, current value,
  disabled state, labels, hints, and increment/decrement actions.
- Invalid ranges are normalized, initial/controlled values are clamped, duplicate
  IDs are deterministic, and stale gesture callbacks are rejected.
- The package builds ESM, CommonJS, TypeScript declarations, and sourcemaps while
  keeping React and native dependencies external.

## Installation

```bash
bun add @ngocdevv/dial-slider
```

Install versions of the native peers compatible with your Expo SDK:

```bash
npx expo install expo-linear-gradient react-native-gesture-handler \
  react-native-reanimated react-native-svg react-native-worklets
```

For a bare React Native app, install the same packages with your package manager,
follow each library's native installation instructions, and run CocoaPods for
iOS when required.

### Peer dependencies

| Package                        | Supported range  |
| ------------------------------ | ---------------- |
| `react`                        | `>=18.2.0`       |
| `react-native`                 | `>=0.81.0 <0.87` |
| `react-native-gesture-handler` | `>=2.14.0 <3`    |
| `react-native-reanimated`      | `>=4.3.0 <4.6`   |
| `react-native-worklets`        | `>=0.8.0 <0.12`  |
| `react-native-svg`             | `>=15.0.0 <16`   |
| `expo-linear-gradient`         | `>=14.0.0`       |

Reanimated 4 requires the React Native New Architecture. Reanimated, Worklets,
and React Native versions must also form a compatible triplet; the individual
peer ranges do not make every cross-combination valid. Expo's Babel preset and
`expo install` select the SDK-compatible versions. Bare React Native consumers
must follow the official compatibility table and Babel setup for their installed
versions.

Wrap the application root in `GestureHandlerRootView`. The component also has a
local wrapper so it remains usable in isolation, but a root wrapper is the
recommended application setup:

```tsx
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <YourNavigation />
    </GestureHandlerRootView>
  );
}
```

The library package does not depend on Expo Router. `expo-linear-gradient` is
the only Expo module used by the component itself.

## Single preset

```tsx
import { Text } from 'react-native';
import { DialSlider, type DialPreset } from '@ngocdevv/dial-slider';

const EXPOSURE: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: ({ selected }) => (
      <Text style={{ color: selected ? '#FFFFFF' : '#A1A1AA' }}>◐</Text>
    ),
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
    formatValue: (value) => `${value}%`,
  },
];

export function ExposureControl() {
  return (
    <DialSlider
      presets={EXPOSURE}
      defaultValues={{ exposure: 0 }}
      accessibilityLabel="Exposure"
    />
  );
}
```

Keep `accessibilityLabel` stable. The active value is exposed separately through
the adjustable control's accessibility value and uses the preset's
`formatValue` output.

## Multiple presets

The example below is fully controlled. Update `selectedPresetId` and `values` in
their callbacks; if the parent does not apply a proposed change, the controlled
props remain the source of truth.

```tsx
import { useState } from 'react';
import { Text } from 'react-native';
import {
  DialSlider,
  type DialPreset,
  type DialSliderValues,
} from '@ngocdevv/dial-slider';

const PHOTO_PRESETS: readonly DialPreset[] = [
  {
    id: 'exposure',
    label: 'Exposure',
    icon: ({ selected }) => (
      <Text style={{ color: selected ? '#FFFFFF' : '#A1A1AA' }}>◐</Text>
    ),
    minValue: -100,
    maxValue: 100,
    initialValue: 0,
  },
  {
    id: 'contrast',
    label: 'Contrast',
    icon: ({ selected }) => (
      <Text style={{ color: selected ? '#FFFFFF' : '#A1A1AA' }}>◉</Text>
    ),
    minValue: -50,
    maxValue: 50,
    initialValue: 0,
  },
];

export function PhotoAdjustments() {
  const [selectedPresetId, setSelectedPresetId] = useState('exposure');
  const [values, setValues] = useState<DialSliderValues>({
    exposure: 0,
    contrast: 0,
  });

  return (
    <DialSlider
      presets={PHOTO_PRESETS}
      selectedPresetId={selectedPresetId}
      values={values}
      onPresetChange={(presetId) => setSelectedPresetId(presetId)}
      onValueChange={(_presetId, _value, nextValues) => setValues(nextValues)}
    />
  );
}
```

## API reference

### `DialSliderProps`

| Prop                 | Type                                                                  | Default                 | Description                                                                                 |
| -------------------- | --------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------- |
| `presets`            | `readonly DialPreset[]`                                               | Required                | Adjustment definitions. Empty/invalid input renders nothing; duplicate IDs keep the first.  |
| `initialPresetId`    | `string`                                                              | First enabled preset    | Initial selection in uncontrolled mode.                                                     |
| `selectedPresetId`   | `string`                                                              | `undefined`             | Controlled selected ID. Invalid or disabled IDs safely fall back to the first enabled item. |
| `values`             | `Readonly<Record<string, number>>`                                    | `undefined`             | Controlled values. Entries are clamped; missing/non-finite entries use preset initials.     |
| `defaultValues`      | `Readonly<Record<string, number>>`                                    | Preset initial values   | Initial uncontrolled values. Later prop changes are ignored.                                |
| `onPresetChange`     | `(presetId: string, value: number) => void`                           | `undefined`             | Reports a user selection request or an uncontrolled fallback after removal/disable.         |
| `onValueChange`      | `(presetId: string, value: number, values: DialSliderValues) => void` | `undefined`             | Called for each changed integer value with the complete proposed map.                       |
| `onValuesChange`     | `(values: DialSliderValues) => void`                                  | `undefined`             | Convenience callback containing only the complete proposed map.                             |
| `accentColor`        | `string`                                                              | `#FFD700`               | Center tick, selected positive progress, and value text.                                    |
| `adjustedColor`      | `string`                                                              | `#8F8129`               | Positive progress color for adjusted inactive presets.                                      |
| `backgroundColor`    | `string`                                                              | `#000000`               | Component surface and ruler fade color.                                                     |
| `accessibilityLabel` | `string`                                                              | Active preset label     | Overrides the adjustable ruler's label.                                                     |
| `accessibilityHint`  | `string`                                                              | Adjustment instructions | Overrides the adjustable ruler's interaction hint.                                          |
| `testID`             | `string`                                                              | `undefined`             | Test identifier on the component's root.                                                    |

### `DialPreset`

| Field          | Type                                                       | Default  | Description                                                            |
| -------------- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------------------- |
| `id`           | `string`                                                   | Required | Stable, non-empty key for selection and the values map.                |
| `label`        | `string`                                                   | Required | Human-readable and accessibility label.                                |
| `icon`         | `ReactNode \| ((state: DialPresetIconState) => ReactNode)` | Required | Static icon or renderer receiving `selected`, `adjusted`, and `value`. |
| `minValue`     | `number`                                                   | `-100`   | Minimum value. Reversed and invalid ranges are normalized safely.      |
| `maxValue`     | `number`                                                   | `100`    | Maximum value.                                                         |
| `initialValue` | `number`                                                   | `0`      | Uncontrolled initial value, clamped to the normalized range.           |
| `step`         | `number`                                                   | `1`      | Positive accessibility increment/decrement amount.                     |
| `formatValue`  | `(value: number) => string`                                | Integer  | Formats the visible badge and accessibility value text.                |
| `disabled`     | `boolean`                                                  | `false`  | Disables selection, ruler gestures, and accessibility value changes.   |

### Callback semantics

- `onPresetChange(presetId, value)` reports a user selection request and the
  current value owned by that preset. Uncontrolled mode also reports an
  automatic fallback when the active preset is removed or disabled.
- `onValueChange(presetId, value, values)` reports the active preset, its next
  clamped integer value, and the complete proposed values map.
- In uncontrolled mode, the component applies the proposed changes internally.
- In controlled mode, the parent must update `selectedPresetId` and/or `values`.
  Changing controlled props does not call the corresponding callback again.

## Platform compatibility

| Platform | Status                                                                                  |
| -------- | --------------------------------------------------------------------------------------- |
| iOS      | Expo SDK 57 example smoke-tested in Expo Go on an iOS 26.5 simulator.                   |
| Android  | Expo SDK 57 example smoke-tested in Expo Go on an Android 36 emulator, including a pan. |
| Web      | Expo example exports and passes an interaction smoke test; full support is not claimed. |

Animation feel and gesture velocity must be validated in release builds on real
devices. Expo Go and simulators are useful for development but are not evidence
of release performance.

## Accessibility

The active ruler exposes `adjustable`, its normalized range and current value,
disabled state, and increment/decrement actions. Preset buttons expose selected
and disabled state plus their values. Supply concise preset labels, use
`formatValue` for units, and provide an explicit `accessibilityLabel` when the
surrounding context is not obvious. Reanimated transitions honor the system
reduced-motion preference.

## Development

This repository is a Bun workspace:

```text
apps/example/             Expo Router demonstration app
packages/dial-slider/     Publishable React Native library
```

```bash
bun install
bun start
bun run lint
bun run typecheck
bun run test
bun run build
bun run pack:check
```

`bun run build` uses React Native Builder Bob because it follows React Native
library entry-point conventions while producing ESM, CommonJS, declarations,
and sourcemaps without bundling peer dependencies. Metro resolves the package's
source through its `react-native` entry.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the contribution workflow and
[docs/RELEASING.md](./docs/RELEASING.md) for the maintainer-only release
checklist.

## Roadmap

- Release-build feel checks on a wider range of physical iOS and Android devices.
- Browser interaction tests and an explicit web compatibility matrix.
- Optional haptic detents without making haptics a required dependency.
- Additional visual customization only where it does not expand the core API
  unnecessarily.

## License

[MIT](./LICENSE) © 2026 Ngoc Le.
