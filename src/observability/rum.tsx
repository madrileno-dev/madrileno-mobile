import {
  BatchSize,
  OpenObserveProvider,
  OpenObserveProviderConfiguration,
  PropagatorType,
  TrackingConsent,
  UploadFrequency,
} from '@openobserve/mobile-react-native'
import { O2RumReactNavigationTracking } from '@openobserve/mobile-react-navigation'
import Constants from 'expo-constants'
import { useNavigationContainerRef } from 'expo-router'
import { useEffect, type ReactNode } from 'react'
import { env, type RumConfig } from '@/env'

export const RUM_TRACKING_CONSENT = TrackingConsent.GRANTED

export function buildRumConfiguration(
  rum: RumConfig,
  apiBaseUrl: string,
  service: string,
  version: string,
): OpenObserveProviderConfiguration {
  // The SDK appends /rum and /logs to customEndpoint itself; OpenObserve's RUM
  // intake is per-org at /rum/v1/<org>, so that org path goes here.
  const orgEndpoint = `${rum.endpoint.replace(/\/$/, '')}/rum/v1/${rum.org}`
  const configuration = new OpenObserveProviderConfiguration(
    rum.clientToken,
    rum.env,
    RUM_TRACKING_CONSENT,
    {
      // The Android bridge's own OkHttp client rejects http:// uploads outright
      // (independent of the app manifest's usesCleartextTraffic) unless this
      // internal flag is set — see O2SdkImplementation.kt's DD_NEEDS_CLEAR_TEXT_HTTP /
      // O2SdkNativeInitialization.kt's allowClearTextHttp(). No public API exposes it.
      additionalConfiguration: rum.endpoint.startsWith('http://')
        ? { '_o2.needsClearTextHttp': true }
        : undefined,
      batchSize: BatchSize.MEDIUM,
      uploadFrequency: UploadFrequency.AVERAGE,
      rumConfiguration: {
        applicationId: rum.applicationId,
        customEndpoint: orgEndpoint,
        // The SDK's onPress auto-instrumentation patches the active JSX runtime module, which
        // crashes against NativeWind's `createInteropElement` (a getter-only export); track taps
        // manually with O2Rum.addAction if needed instead.
        trackInteractions: false,
        trackResources: true,
        trackErrors: true,
        sessionSampleRate: 100,
        nativeCrashReportEnabled: true,
        firstPartyHosts: [
          { match: new URL(apiBaseUrl).hostname, propagatorTypes: [PropagatorType.TRACECONTEXT] },
        ],
      },
      logsConfiguration: { customEndpoint: orgEndpoint },
      // No traceConfiguration: the SDK's trace upload targets Datadog's /api/v2/spans, which
      // OpenObserve's RUM intake doesn't accept; W3C trace propagation still comes from RUM's
      // firstPartyHosts above.
    },
  )
  configuration.service = service
  configuration.version = version
  return configuration
}

export function RumProvider({ children }: { children: ReactNode }) {
  if (env.rum === null) return <>{children}</>

  const configuration = buildRumConfiguration(
    env.rum,
    env.apiBaseUrl,
    Constants.expoConfig?.slug ?? 'madrileno-mobile',
    Constants.expoConfig?.version ?? '0.0.0',
  )
  return <OpenObserveProvider configuration={configuration}>{children}</OpenObserveProvider>
}

export function useRumNavigationTracking(): void {
  const navigationRef = useNavigationContainerRef()

  useEffect(() => {
    if (env.rum === null) return undefined

    // Don't gate on navigationRef.isReady(): this effect runs once, right
    // after RootLayout's first commit, before Expo Router's Stack has
    // finished mounting. startTrackingViews queues its 'state' listener on
    // the ref (expo-router's createNavigationContainerRef replays queued
    // listeners once the real container mounts), so calling it unconditionally
    // here is what actually gets tracking wired up.
    O2RumReactNavigationTracking.startTrackingViews(navigationRef)
    return () => O2RumReactNavigationTracking.stopTrackingViews(navigationRef)
  }, [navigationRef])
}
