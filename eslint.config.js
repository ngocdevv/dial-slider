// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
  {
    // Reanimated SharedValues + gesture worklets intentionally mutate .value and
    // bridge via refs. React Compiler purity rules are false positives here.
    files: [
      'src/components/dial-slider/**/*.{ts,tsx}',
      'src/hooks/useDialRulerMotion.ts',
    ],
    rules: {
      'react-hooks/refs': 'off',
      'react-hooks/immutability': 'off',
    },
  },
]);
