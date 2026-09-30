// Chains two resolvers Jest's single `resolver` slot can't compose: RN's (keeps
// its subpaths mockable) and worklets' (loads the JS runtime, not the native one).
// MSW runs in Jest's Node process; its exports map the react-native condition to null.
const nodeOnly = /(^|[\\/])(msw|@mswjs)([\\/]|$)/

module.exports = (request, options) => {
  const originalPackageFilter = options.packageFilter
  let resolveOptions =
    options.basedir.includes('react-native-worklets') || request.includes('react-native-worklets')
      ? { ...options, extensions: options.extensions?.filter((ext) => !ext.includes('native')) }
      : options
  if (nodeOnly.test(request) || nodeOnly.test(options.basedir)) {
    resolveOptions = { ...resolveOptions, conditions: ['node', 'require', 'default'] }
  }

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
