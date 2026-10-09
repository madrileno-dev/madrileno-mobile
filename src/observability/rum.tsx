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
import { toast } from 'sonner-native'
import { createTranslator } from 'use-intl/core'
import { env, type RumConfig } from '@/env'
import { tokenStore } from '@/features/auth/tokenStore'
import { messages } from '@/i18n/config'
import { rumConsentStore, type RumConsent } from './consent'
import { trackRumUser } from './rumUser'

const t = createTranslator({ locale: 'en', messages, namespace: 'consent' })

function promptForRumConsent(): void {
  const id = toast(t('prompt'), {
    duration: Number.POSITIVE_INFINITY,
    action: {
      label: t('allow'),
      onClick: () => {
        rumConsentStore.set('granted')
        toast.dismiss(id)
      },
    },
    cancel: { label: t('decline'), onClick: () => rumConsentStore.set('denied') },
  })
}

// Not PENDING: that collects on the device and uploads it all on a later grant.
export function trackingConsent(consent: RumConsent | null): TrackingConsent {
  return consent === 'granted' ? TrackingConsent.GRANTED : TrackingConsent.NOT_GRANTED
}

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
    trackingConsent(rumConsentStore.get()),
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

function onRumInitialized(): void {
  rumConsentStore.subscribe(() => {
    void O2SdkReactNative.setTrackingConsent(trackingConsent(rumConsentStore.get()))
  })
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
  useEffect(() => {
    if (configuration !== null && rumConsentStore.get() === null) promptForRumConsent()
  }, [configuration])
  if (configuration === null) return <>{children}</>
  return (
    <OpenObserveProvider configuration={configuration} onInitialization={onRumInitialized}>
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
