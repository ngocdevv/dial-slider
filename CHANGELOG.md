# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Added `CameraZoomDial`, an accessible compact/expanded camera zoom control with
  configurable optical stops, focal-length labels, logarithmic wheel geometry,
  touch-and-hold expansion, snapping, controlled or uncontrolled state, and a
  measured pointer cutout that masks rotating ticks like the iPhone Camera UI.
- Added a camera-style example, zoom geometry regression tests, public type
  coverage, and API documentation.

## [0.1.0] - 2026-08-30

### Added

- Prepared the initial `@ngocdevv/dial-slider` package at version `0.1.0`.
- Added single-preset and multi-preset photo-style dial modes.
- Added controlled and uncontrolled value and selection APIs.
- Added UI-thread gesture, decay, snapping, preset transitions, and reduced-motion
  handling with Reanimated and Gesture Handler.
- Added accessibility actions, labels, state, and formatted adjustable values.
- Added ESM, CommonJS, TypeScript declaration, and sourcemap builds with React
  Native Builder Bob.
- Added an Expo workspace example, regression tests, CI, release preparation,
  and open source community documentation.

[Unreleased]: https://github.com/ngocdevv/dial-slider/commits/master
[0.1.0]: https://www.npmjs.com/package/@ngocdevv/dial-slider/v/0.1.0
