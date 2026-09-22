// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // eslint-config-expo 57 pulls in eslint-plugin-react-hooks 7's
    // "recommended" preset, which adds the React Compiler rule set
    // (immutability, refs, purity, set-state-in-effect, etc.) on top of
    // the two hooks rules this project has always linted against. Those
    // new rules assume a React-Compiler target and flag idiomatic,
    // correct Reanimated worklet code (mutating `.value`) and existing
    // effect-driven data loading throughout the app as errors. Keep the
    // rules this repo has always used; drop the React Compiler set.
    rules: {
      'react-hooks/static-components': 'off',
      'react-hooks/use-memo': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/globals': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/error-boundaries': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/unsupported-syntax': 'off',
      'react-hooks/config': 'off',
      'react-hooks/gating': 'off',
    },
  },
]);
