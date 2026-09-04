// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['**/.expo/**', '**/lib/**', 'coverage/**'],
  },
  {
    settings: {
      'import/core-modules': ['bun:test'],
      'import/resolver': {
        typescript: {
          noWarnOnMultipleProjects: true,
          project: [
            'apps/example/tsconfig.json',
            'packages/dial-slider/tsconfig.json',
          ],
        },
      },
    },
  },
  {
    // Reanimated SharedValues bridge through refs by design. React Compiler
    // purity rules report false positives for these worklet-facing modules.
    files: [
      'packages/dial-slider/src/components/dial-slider/**/*.{ts,tsx}',
      'packages/dial-slider/src/components/camera-zoom-dial/CameraZoomDial.tsx',
      'packages/dial-slider/src/hooks/useDialRulerMotion.ts',
      'packages/dial-slider/src/hooks/useCameraZoomMotion.ts',
    ],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]);
