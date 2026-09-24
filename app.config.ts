import type { ConfigContext, ExpoConfig } from 'expo/config'
import pkg from './package.json'

// name/slug/scheme derive from package.json so init-project's rename re-brands
// the app (the web manifest works the same way).
const name = pkg.name.replace(/-mobile$/, '')
const scheme = name.replace(/[^a-z0-9]/gi, '').toLowerCase()
const bundleId = `dev.${scheme}.mobile`
const associatedDomain = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN
const easProjectId = process.env.EAS_PROJECT_ID

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: pkg.name,
  scheme,
  version: pkg.version,
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  icon: './assets/generated/icon.png',
  runtimeVersion: { policy: 'appVersion' },
  updates: {
    enabled: true,
    checkAutomatically: 'NEVER',
    ...(easProjectId ? { url: `https://u.expo.dev/${easProjectId}` } : {}),
  },
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
    ...(associatedDomain ? { associatedDomains: [`applinks:${associatedDomain}`] } : {}),
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      foregroundImage: './assets/generated/adaptive-icon-foreground.png',
      backgroundColor: '#772938',
    },
    ...(associatedDomain
      ? {
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{ scheme: 'https', host: associatedDomain, pathPrefix: '/' }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
        }
      : {}),
  },
  experiments: { typedRoutes: true },
  plugins: [
    'expo-router',
    'expo-secure-store',
    [
      'expo-splash-screen',
      {
        image: './assets/generated/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#0A0A0A' },
      },
    ],
  ],
  extra: { ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
})
