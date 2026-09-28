module.exports = function (api) {
  api.cache(true)
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'nativewind' }], 'nativewind/babel'],
    plugins: ['react-native-worklets/plugin'],
    env: {
      // Jest has no bundler code-splitting to defer a real dynamic import()
      // for, and running it without --experimental-vm-modules throws. Rewrite
      // it to a plain require() under test only; Metro (dev/prod) is untouched.
      test: { plugins: ['dynamic-import-node'] },
    },
  }
}
