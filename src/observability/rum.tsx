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
  const configuration = new OpenObserveProviderConfiguration(
    rum.clientToken,
    rum.env,
    RUM_TRACKING_CONSENT,
    {
      batchSize: BatchSize.MEDIUM,
      uploadFrequency: UploadFrequency.AVERAGE,
      rumConfiguration: {
        applicationId: rum.applicationId,
        customEndpoint: rum.endpoint,
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
      logsConfiguration: { customEndpoint: rum.endpoint },
      traceConfiguration: { customEndpoint: rum.endpoint },
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
