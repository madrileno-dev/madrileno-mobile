// Composes two upstream resolvers that each only know how to wrap Jest's
// defaultResolver directly, so neither can be chained via jest.config.js's
// single `resolver` slot:
// - @react-native/jest-preset's resolver drops react-native's `exports`
//   field so its subpaths stay mockable (RFC0894 backwards compatibility).
// - react-native-worklets/jest/resolver strips "native" extensions when
//   resolving its own package, so Jest loads the JS worklets runtime
//   instead of the native turbo module react-native-reanimated needs.
module.exports = (request, options) => {
  const originalPackageFilter = options.packageFilter
  const resolveOptions =
    options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets')
      ? { ...options, extensions: options.extensions?.filter((ext) => !ext.includes('native')) }
      : options

  return resolveOptions.defaultResolver(request, {
    ...resolveOptions,
    packageFilter: (pkg) => {
      const filteredPkg = originalPackageFilter ? originalPackageFilter(pkg) : pkg
      if (filteredPkg.name === 'react-native') {
        delete filteredPkg.exports
      }
      return filteredPkg
    },
  })
}
