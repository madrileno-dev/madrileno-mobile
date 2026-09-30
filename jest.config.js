// jest-expo doesn't transform .mjs, which pure-ESM deps (msw's rettime) need.
const { transform: presetTransform } = require('jest-expo/jest-preset')

module.exports = {
  preset: 'jest-expo',
  resolver: '<rootDir>/jest.resolver.js',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],
  transform: { ...presetTransform, '^.+\\.mjs$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@rn-primitives/.*|nativewind|react-native-css-interop|sonner-native|@shopify/flash-list|lucide-react-native|react-native-reanimated|react-native-mmkv|react-native-nitro-modules|standard-navigation|msw|rettime|until-async|@open-draft|@orpc/.*|use-intl|@formatjs/.*|@schummar/.*|icu-minify|intl-messageformat|temporal-polyfill|temporal-spec|temporal-utils)',
  ],
}
