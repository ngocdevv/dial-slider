# @ngocdevv/dial-slider 0.1.0

This is the first public release of Dial Slider, an animated, photo-style
adjustment control for React Native and Expo.

## Highlights

- One component supports a centered single preset or a scrollable multi-preset
  strip.
- Each preset keeps an independent value, range, label, icon, formatter, and
  disabled state.
- Gesture tracking, decay, and snap motion stay on the UI runtime with
  Reanimated and Gesture Handler.
- Controlled and uncontrolled value and selection APIs are available.
- VoiceOver and TalkBack users can increment or decrement the active value
  through adjustable accessibility actions.
- The npm package ships ESM, CommonJS, TypeScript declarations, source, and
  sourcemaps.

## Install

```bash
bun add @ngocdevv/dial-slider
npx expo install expo-linear-gradient react-native-gesture-handler \
  react-native-reanimated react-native-svg react-native-worklets
```

## Compatibility notes

- The initial package targets React Native 0.81–0.86 and Reanimated 4.3–4.5.
- Reanimated 4 requires the React Native New Architecture.
- iOS and Android are the primary targets. The Expo SDK 57 example passed
  development smoke tests in Expo Go on an iOS 26.5 simulator and an Android 36
  emulator; real-device release-build validation remains required.
- The Expo example exports successfully for web and passed a browser interaction
  smoke test, but full web compatibility is not claimed.

## Validation and follow-up

- Feel-check drag, interruption, fling, edge clamping, and snapping on real iOS
  and Android devices using release builds.
- Use the configured trusted-publishing workflow and protected `npm` environment
  for future versions so they include GitHub Actions provenance.
- Use `docs/RELEASING.md` for the remaining Git tag and GitHub Release steps.

The npm package is public. Creating a Git tag and GitHub Release remains a
separate maintainer action.
