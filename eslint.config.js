const { defineConfig } = require('eslint/config')
const expoConfig = require('eslint-config-expo/flat')
const prettier = require('eslint-config-prettier')
const tseslint = require('typescript-eslint')

module.exports = defineConfig([
  {
    ignores: [
      'node_modules',
      'android',
      'ios',
      '.expo',
      'dist',
      'src/contracts',
      'assets/generated',
    ],
  },
  expoConfig,
  prettier,
  {
    // Only where type info exists; globally it breaks on babel.config.js & co.
    files: ['**/*.{ts,tsx}'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: __dirname },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'Date',
          message:
            'Use Temporal (temporal-polyfill). JS Date is allowed only in src/api/datetime.ts, the wire boundary.',
        },
      ],
    },
  },
  {
    files: ['src/api/datetime.ts', 'src/updates/useOtaUpdates.ts'],
    rules: { 'no-restricted-globals': 'off' },
  },
  { files: ['src/components/ui/**/*.tsx'], rules: { 'react/display-name': 'off' } },
  {
    // eslint-config-expo grants these only to metro.config.js.
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked, prettier],
    languageOptions: { globals: { __dirname: 'readonly', __filename: 'readonly' } },
  },
])
