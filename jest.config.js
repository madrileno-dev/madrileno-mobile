// jest-expo's own transform map has no entry for `.mjs`, so a pure-ESM
// node_modules dependency (msw's `rettime`) fails to load under Jest's
// CJS runtime even when transformIgnorePatterns lets it through. Reuse the
// preset's transform (keeps its babel options and asset transformer) and
// add the missing `.mjs` -> babel-jest mapping.
const { transform: presetTransform } = require('jest-expo/jest-preset')

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/', '/.expo/'],
  transform: { ...presetTransform, '^.+\\.mjs$': 'babel-jest' },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@rn-primitives/.*|nativewind|react-native-css-interop|sonner-native|@shopify/flash-list|lucide-react-native|react-native-reanimated|react-native-mmkv|react-native-nitro-modules|standard-navigation|msw|rettime|until-async|@open-draft|@orpc/.*|use-intl|@formatjs/.*|@schummar/.*|icu-minify|intl-messageformat)',
  ],
}
