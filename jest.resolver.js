// Chains two resolvers Jest's single `resolver` slot can't compose: RN's (keeps
// its subpaths mockable) and worklets' (loads the JS runtime, not the native one).
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
