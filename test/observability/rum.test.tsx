import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { env } from '@/env'
import { buildRumConfiguration, RumProvider } from '@/observability/rum'
import { mockOpenObserveProvider, mockSetTrackingConsent, mockSetUserInfo } from '../setup'

type TokenStoreModule = typeof import('@/features/auth/tokenStore')
type ConsentModule = typeof import('@/observability/consent')

describe('buildRumConfiguration', () => {
  it('builds the RUM/logs configuration from a RumConfig and the API base URL', () => {
    const configuration = buildRumConfiguration(
      {
        clientToken: 'test-token',
        endpoint: 'http://10.0.2.2:55080',
        applicationId: 'madrileno-mobile',
        org: 'default',
        env: 'development',
      },
      'http://10.0.2.2:9000',
      'madrileno-mobile',
      '1.0.0',
    )

    expect(configuration.rumConfiguration?.firstPartyHosts).toEqual([
      { match: '10.0.2.2', propagatorTypes: ['tracecontext'] },
    ])
    expect(configuration.rumConfiguration?.trackErrors).toBe(true)
    expect(configuration.rumConfiguration?.trackResources).toBe(true)
    // Disabled: the SDK's onPress auto-instrumentation crashes against NativeWind's JSX runtime.
    expect(configuration.rumConfiguration?.trackInteractions).toBe(false)
    expect(configuration.rumConfiguration?.nativeCrashReportEnabled).toBe(true)
    expect(configuration.rumConfiguration?.customEndpoint).toBe(
      'http://10.0.2.2:55080/rum/v1/default',
    )
    expect(configuration.logsConfiguration?.customEndpoint).toBe(
      'http://10.0.2.2:55080/rum/v1/default',
    )
    // No traceConfiguration: OpenObserve's RUM intake doesn't accept the SDK's trace upload.
    expect(configuration.traceConfiguration).toBeUndefined()
    expect(configuration.service).toBe('madrileno-mobile')
    expect(configuration.version).toBe('1.0.0')
    // The Android bridge otherwise rejects http:// uploads outright.
    expect(configuration.additionalConfiguration).toEqual({ '_o2.needsClearTextHttp': true })
  })

  it('does not request cleartext HTTP for an https endpoint', () => {
    const configuration = buildRumConfiguration(
      {
        clientToken: 'test-token',
        endpoint: 'https://rum.example.com',
        applicationId: 'madrileno-mobile',
        org: 'default',
        env: 'production',
      },
      'https://api.example.com',
      'madrileno-mobile',
      '1.0.0',
    )

    expect(configuration.additionalConfiguration).toBeUndefined()
  })

  it('strips a trailing slash from the endpoint before appending the org path', () => {
    const configuration = buildRumConfiguration(
      {
        clientToken: 'test-token',
        endpoint: 'http://10.0.2.2:55080/',
        applicationId: 'madrileno-mobile',
        org: 'acme',
        env: 'development',
      },
      'http://10.0.2.2:9000',
      'madrileno-mobile',
      '1.0.0',
    )

    expect(configuration.rumConfiguration?.customEndpoint).toBe('http://10.0.2.2:55080/rum/v1/acme')
    expect(configuration.logsConfiguration?.customEndpoint).toBe(
      'http://10.0.2.2:55080/rum/v1/acme',
    )
  })
})

describe('RumProvider', () => {
  it('renders children without mounting OpenObserveProvider when env.rum is null', async () => {
    expect(env.rum).toBeNull()

    const { getByText } = await render(
      <RumProvider>
        <Text>hello</Text>
      </RumProvider>,
    )

    expect(getByText('hello')).toBeTruthy()
    expect(mockOpenObserveProvider).not.toHaveBeenCalled()
  })

  it('mounts OpenObserveProvider when env.rum is configured', async () => {
    let FreshRumProvider: typeof import('@/observability/rum').RumProvider | undefined
    let freshTokenStore: TokenStoreModule['tokenStore'] | undefined
    let freshConsentStore: ConsentModule['rumConsentStore'] | undefined
    const outerReact = jest.requireActual<typeof import('react')>('react')
    jest.isolateModules(() => {
      // Otherwise the isolated registry loads a second React.
      jest.doMock('react', () => outerReact)
      jest.doMock('@/env', () => ({
        env: {
          apiBaseUrl: 'http://10.0.2.2:9000',
          rum: {
            clientToken: 'test-token',
            endpoint: 'http://10.0.2.2:55080',
            applicationId: 'madrileno-mobile',
            org: 'default',
            env: 'development',
          },
        },
      }))
      // Synchronous require, so jest.doMock applies.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rum = require('@/observability/rum') as typeof import('@/observability/rum')
      FreshRumProvider = rum.RumProvider
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const auth = require('@/features/auth/tokenStore') as TokenStoreModule
      freshTokenStore = auth.tokenStore
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      freshConsentStore = (require('@/observability/consent') as ConsentModule).rumConsentStore
    })
    if (FreshRumProvider === undefined) throw new Error('RumProvider did not load')

    const { getByText, rerender } = await render(
      <FreshRumProvider>
        <Text>hello</Text>
      </FreshRumProvider>,
    )

    expect(getByText('hello')).toBeTruthy()
    expect(mockOpenObserveProvider).toHaveBeenCalledTimes(1)

    await rerender(
      <FreshRumProvider>
        <Text>hello again</Text>
      </FreshRumProvider>,
    )
    expect(mockOpenObserveProvider).toHaveBeenCalledTimes(2)
    const [first, second] = mockOpenObserveProvider.mock.calls.map(
      ([props]) => (props as { configuration?: unknown }).configuration,
    )
    expect(second).toBe(first)

    const [[props]] = mockOpenObserveProvider.mock.calls as [[{ onInitialization?: () => void }]]
    const claims = btoa(JSON.stringify({ userId: 'u-1' })).replace(/=+$/, '')
    freshTokenStore?.set({ jwt: `h.${claims}.s`, refreshToken: 'r', email: 'a@example.com' })
    props.onInitialization?.()
    expect(mockSetUserInfo).toHaveBeenCalledWith({ id: 'u-1' })

    expect((first as { trackingConsent: string }).trackingConsent).toBe('pending')
    freshConsentStore?.set('granted')
    expect(mockSetTrackingConsent).toHaveBeenCalledWith('granted')
  })
})
