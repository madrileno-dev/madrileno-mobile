import type { ConfigContext, ExpoConfig } from 'expo/config'
import pkg from './package.json'

// Derived from package.json so init-project's rename re-brands the app.
const name = pkg.name.replace(/-mobile$/, '')
const scheme = name.replace(/[^a-z0-9]/gi, '').toLowerCase()
const bundleId = `dev.${scheme}.mobile`
const associatedDomain = process.env.EXPO_PUBLIC_ASSOCIATED_DOMAIN
const easOwner = process.env.EAS_OWNER
const easProjectId = process.env.EAS_PROJECT_ID

// Duplicated in src/env.ts: Expo loads this file standalone, it can't import src/.
export const DEFAULT_API_BASE_URL = 'http://10.0.2.2:9000'

// Cleartext only for an http:// API; never in production, even with the URL unset.
export function usesCleartext(
  apiBaseUrl: string | undefined,
  buildProfile: string | undefined,
): boolean {
  if (buildProfile === 'production') return false
  return /^http:\/\//i.test(apiBaseUrl || DEFAULT_API_BASE_URL)
}

const cleartextPlugin: [string, object] = [
  'expo-build-properties',
  { android: { usesCleartextTraffic: true } },
]

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name,
  slug: pkg.name,
  ...(easOwner ? { owner: easOwner } : {}),
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
      backgroundColor: '#B5122B',
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
    ...(usesCleartext(process.env.EXPO_PUBLIC_API_BASE_URL, process.env.EAS_BUILD_PROFILE)
      ? [cleartextPlugin]
      : []),
  ],
  extra: { ...(easProjectId ? { eas: { projectId: easProjectId } } : {}) },
})
