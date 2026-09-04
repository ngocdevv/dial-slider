# Contributing

Thanks for helping improve Dial Slider. Bug reports, focused feature proposals,
documentation fixes, and tested pull requests are welcome.

By participating, you agree to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).
Please report security issues through the private process in
[SECURITY.md](./SECURITY.md), not through a public issue.

## Development requirements

- [Bun](https://bun.sh/) 1.2.10 (the version pinned by `packageManager`)
- Node.js 20.19 or newer for React Native Builder Bob
- A React Native development environment for the platform you want to test
- Xcode for local iOS builds or Android Studio for local Android builds

The example currently uses Expo SDK 57, React Native 0.86, Reanimated 4, and
the New Architecture.

## Set up the repository

```bash
git clone https://github.com/ngocdevv/dial-slider.git
cd dial-slider
bun install --frozen-lockfile
```

Start the Expo example with:

```bash
bun start
```

Then press `i`, `a`, or `w` in the Expo CLI, or run one of these directly:

```bash
bun run ios
bun run android
bun run web
```

## Quality checks

Run the complete local verification before opening a pull request:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run pack:check
```

Use `bun run format` to apply the repository's formatting rules. Builder Bob
writes generated output to `packages/dial-slider/lib`; it is ignored and must
not be committed. The package check also runs Publint in strict mode and Are the
Types Wrong against the packed artifact, covering its CommonJS, ESM, bundler,
and TypeScript entry points.

## Issues

Search existing issues before opening a new one. Bug reports should include a
minimal reproduction, the affected platform, React Native or Expo version, and
versions of Reanimated, Gesture Handler, Worklets, SVG, and Linear Gradient.
Feature requests should describe the user problem and proposed API rather than
only a visual result.

## Pull requests

Keep pull requests focused and explain any public API or behavior change. Add or
update tests and documentation with the implementation. Every bug fix must add a
regression test that fails before the fix whenever the behavior can be tested in
the repository.

Changes to motion should preserve UI-thread execution. Feel-check drag,
interruption, fling, edge clamping, and snapping in a release build on a real
device; simulator and Expo Go results are not sufficient for performance claims.

Use short Conventional Commit-style subjects when practical, for example:

```text
fix: clamp controlled values before rendering
feat: add a disabled preset state
docs: clarify Reanimated setup
test: cover stale gesture revisions
```

Maintainers squash or merge based on the size and history of the pull request.
Do not change package versions, create release tags, or edit release notes unless
the change is specifically part of an approved release pull request.
