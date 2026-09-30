import {
  BatchSize,
  O2SdkReactNative,
  OpenObserveProvider,
  OpenObserveProviderConfiguration,
  PropagatorType,
  TrackingConsent,
  UploadFrequency,
} from '@openobserve/mobile-react-native'
import { O2RumReactNavigationTracking } from '@openobserve/mobile-react-navigation'
import Constants from 'expo-constants'
import { useNavigationContainerRef } from 'expo-router'
import { useEffect, useMemo, type ReactNode } from 'react'
import { env, type RumConfig } from '@/env'
import { tokenStore } from '@/features/auth/tokenStore'
import { trackRumUser } from './rumUser'

if (env.rum !== null) {
  // Expo's native fetch bypasses XHR, which the RUM SDK instruments (resources and
  // traceparent). Swap in RN's XHR-backed whatwg-fetch before anything renders.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const rnFetch = require('whatwg-fetch') as {
    fetch: typeof fetch
    Headers: typeof Headers
    Request: typeof Request
    Response: typeof Response
  }
  globalThis.fetch = rnFetch.fetch
  globalThis.Headers = rnFetch.Headers
  globalThis.Request = rnFetch.Request
  globalThis.Response = rnFetch.Response
}

export const RUM_TRACKING_CONSENT = TrackingConsent.GRANTED

export function buildRumConfiguration(
  rum: RumConfig,
  apiBaseUrl: string,
  service: string,
  version: string,
): OpenObserveProviderConfiguration {
  // The SDK appends /rum and /logs; OpenObserve's intake is per-org.
  const orgEndpoint = `${rum.endpoint.replace(/\/$/, '')}/rum/v1/${rum.org}`
  const configuration = new OpenObserveProviderConfiguration(
    rum.clientToken,
    rum.env,
    RUM_TRACKING_CONSENT,
    {
      // The native uploader rejects http:// without this internal flag.
      additionalConfiguration: rum.endpoint.startsWith('http://')
        ? { '_o2.needsClearTextHttp': true }
        : undefined,
      batchSize: BatchSize.MEDIUM,
      uploadFrequency: UploadFrequency.AVERAGE,
      rumConfiguration: {
        applicationId: rum.applicationId,
        customEndpoint: orgEndpoint,
        // Its onPress instrumentation crashes against NativeWind's JSX runtime.
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
      // No traceConfiguration: OpenObserve rejects the SDK's span upload; propagation
      // still comes from firstPartyHosts.
    },
  )
  configuration.service = service
  configuration.version = version
  return configuration
}

function startRumUserTracking(): void {
  trackRumUser(tokenStore, {
    set: (id) => void O2SdkReactNative.setUserInfo({ id }),
    clear: () => void O2SdkReactNative.clearUserInfo(),
  })
}

export function RumProvider({ children }: { children: ReactNode }) {
  // RootLayout re-renders on every navigation.
  const configuration = useMemo(
    () =>
      env.rum === null
        ? null
        : buildRumConfiguration(
            env.rum,
            env.apiBaseUrl,
            Constants.expoConfig?.slug ?? 'madrileno-mobile',
            Constants.expoConfig?.version ?? '0.0.0',
          ),
    [],
  )
  if (configuration === null) return <>{children}</>
  return (
    <OpenObserveProvider configuration={configuration} onInitialization={startRumUserTracking}>
      {children}
    </OpenObserveProvider>
  )
}

export function useRumNavigationTracking(): void {
  const navigationRef = useNavigationContainerRef()

  useEffect(() => {
    if (env.rum === null) return undefined

    // Not gated on isReady(): the ref queues the listener until the Stack mounts.
    O2RumReactNavigationTracking.startTrackingViews(navigationRef)
    return () => O2RumReactNavigationTracking.stopTrackingViews(navigationRef)
  }, [navigationRef])
}
