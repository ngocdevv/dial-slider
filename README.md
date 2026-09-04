# Dial Slider

[![CI](https://github.com/ngocdevv/dial-slider/actions/workflows/ci.yml/badge.svg)](https://github.com/ngocdevv/dial-slider/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/%40ngocdevv%2Fdial-slider.svg)](https://www.npmjs.com/package/@ngocdevv/dial-slider)

Animated, photo-style dial controls for React Native and Expo. The package
includes a multi-preset adjustment ruler and an iPhone-camera-style zoom wheel,
with UI-runtime gestures and accessible increment/decrement actions.

## Demo

![Dial Slider demo](./demo.gif)

## Features

- `CameraZoomDial` provides compact optical-stop buttons plus a logarithmic,
  circular zoom scale that expands on touch-and-hold.
- Camera zoom motion follows the wheel tangent, spaces every zoom doubling by
  20 degrees, snaps to the requested step, and reports a final value.
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

## Camera zoom wheel

Tap a compact stop to jump to it, or tap the selected stop to open the adjustable
wheel. Touch and hold the control, then drag left or right for continuous zoom.
In uncontrolled expansion mode, the wheel returns to its compact state 1.2
seconds after an interaction finishes.

```tsx
import { useState } from 'react';
import { CameraZoomDial, type CameraZoomStop } from '@ngocdevv/dial-slider';

const ZOOM_STOPS: readonly CameraZoomStop[] = [
  { value: 0.5, focalLength: '13MM' },
  { value: 1, focalLength: '26MM' },
  { value: 2 },
];

export function CameraZoomControl() {
  const [zoom, setZoom] = useState(1);

  return (
    <CameraZoomDial
      minZoom={0.5}
      maxZoom={10}
      step={0.1}
      value={zoom}
      zoomStops={ZOOM_STOPS}
      onZoomChange={setZoom}
      accessibilityLabel="Camera zoom"
    />
  );
}
```

Use `defaultValue` instead of `value` for uncontrolled zoom. Use `expanded` and
`onExpandedChange` to own the compact/expanded state, or `defaultExpanded` when
the wheel should initially be open.

## Single preset

```tsx
import { useState } from 'react';
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
  },
];

export function ExposureControl() {
  const [value, setValue] = useState(0);

  return (
    <DialSlider
      presets={EXPOSURE}
      defaultValues={{ exposure: 0 }}
      onValueChange={(_presetId, nextValue) => setValue(nextValue)}
      accessibilityLabel={`Exposure, ${value}`}
    />
  );
}
```

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

### `CameraZoomDialProps`

| Prop                 | Type                          | Default                  | Description                                                                         |
| -------------------- | ----------------------------- | ------------------------ | ----------------------------------------------------------------------------------- |
| `minZoom`            | `number`                      | `0.5`                    | Smallest positive zoom factor. Reversed and invalid ranges are normalized.          |
| `maxZoom`            | `number`                      | `10`                     | Largest zoom factor.                                                                |
| `step`               | `number`                      | `0.1`                    | Visible, callback, snapping, and accessibility precision.                           |
| `value`              | `number`                      | `undefined`              | Controlled zoom factor.                                                             |
| `defaultValue`       | `number`                      | `1` when in range        | Initial uncontrolled zoom factor.                                                   |
| `zoomStops`          | `readonly CameraZoomStop[]`   | In-range `0.5`, `1`, `2` | Optical/quick stops; empty or invalid input falls back to the in-range defaults.    |
| `expanded`           | `boolean`                     | `undefined`              | Controlled wheel expansion state.                                                   |
| `defaultExpanded`    | `boolean`                     | `false`                  | Initial uncontrolled expansion state.                                               |
| `onExpandedChange`   | `(expanded: boolean) => void` | `undefined`              | Reports requested compact/expanded state changes.                                   |
| `onZoomChange`       | `(zoom: number) => void`      | `undefined`              | Reports each crossed step during a drag or animated stop change.                    |
| `onInteractionStart` | `() => void`                  | `undefined`              | Called when a wheel drag or quick-stop transition begins.                           |
| `onInteractionEnd`   | `(zoom: number) => void`      | `undefined`              | Called with the final snapped value.                                                |
| `formatValue`        | `(zoom: number) => string`    | Numeric value plus `x`   | Formats the current visible and accessible value.                                   |
| `accentColor`        | `string`                      | `#FFD60A`                | Pointer, active value, focal length, and selected compact label.                    |
| `surfaceColor`       | `string`                      | 50% black                | Expanded circular surface color.                                                    |
| `labelColor`         | `string`                      | `#FFFFFF`                | Inactive stop label color.                                                          |
| `disabled`           | `boolean`                     | `false`                  | Disables drag, quick-stop, and accessibility value changes.                         |
| `accessibilityLabel` | `string`                      | `Camera zoom`            | Adjustable wheel label.                                                             |
| `accessibilityHint`  | `string`                      | Interaction instructions | Adjustable wheel hint.                                                              |
| `style`              | `StyleProp<ViewStyle>`        | `undefined`              | Root style. Width determines the measured wheel geometry; height follows its ratio. |
| `testID`             | `string`                      | `undefined`              | Root identifier; stop IDs append `-stop-{value}`.                                   |

### `CameraZoomStop`

| Field          | Type     | Default      | Description                                                         |
| -------------- | -------- | ------------ | ------------------------------------------------------------------- |
| `value`        | `number` | Required     | Positive factor, normalized to the nearest configured `step`.       |
| `label`        | `string` | Numeric      | Circular wheel label without an automatically appended `x`.         |
| `compactLabel` | `string` | Camera style | Inactive compact label; fractions omit the leading zero by default. |
| `focalLength`  | `string` | None         | Optional equivalent focal length, such as `13MM` or `26MM`.         |

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

- `CameraZoomDial` reports discrete `step` values while its scale moves. In
  controlled mode, `value` remains the source of truth; in uncontrolled mode,
  the component applies each proposal internally.
- Controlled `expanded` state is changed only by its owner. In uncontrolled
  mode, the component expands for a wheel gesture and automatically collapses
  after the interaction.
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

The expanded camera wheel and active adjustment ruler expose `adjustable`, their
normalized range and current value, disabled state, and increment/decrement
actions. Compact zoom stops and preset controls expose button selection and
disabled state. Supply concise labels, use `formatValue` for units, and provide
an explicit `accessibilityLabel` when the surrounding context is not obvious.
Reanimated transitions honor the system reduced-motion preference.

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
