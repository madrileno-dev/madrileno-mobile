import { render } from '@testing-library/react-native'
import { Text } from 'react-native'
import { env } from '@/env'
import { buildRumConfiguration, RumProvider } from '@/observability/rum'
import { mockOpenObserveProvider } from '../setup'

describe('buildRumConfiguration', () => {
  it('builds the RUM/logs/trace configuration from a RumConfig and the API base URL', () => {
    const configuration = buildRumConfiguration(
      {
        clientToken: 'test-token',
        endpoint: 'http://10.0.2.2:55080',
        applicationId: 'madrileno-mobile',
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
    expect(configuration.rumConfiguration?.customEndpoint).toBe('http://10.0.2.2:55080')
    expect(configuration.logsConfiguration?.customEndpoint).toBe('http://10.0.2.2:55080')
    expect(configuration.traceConfiguration?.customEndpoint).toBe('http://10.0.2.2:55080')
    expect(configuration.service).toBe('madrileno-mobile')
    expect(configuration.version).toBe('1.0.0')
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
    jest.isolateModules(() => {
      jest.doMock('@/env', () => ({
        env: {
          apiBaseUrl: 'http://10.0.2.2:9000',
          rum: {
            clientToken: 'test-token',
            endpoint: 'http://10.0.2.2:55080',
            applicationId: 'madrileno-mobile',
            env: 'development',
          },
        },
      }))
      // Must be a synchronous require (not a dynamic import) so jest.doMock,
      // which patches the CommonJS module registry, applies to it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rum = require('@/observability/rum') as typeof import('@/observability/rum')
      FreshRumProvider = rum.RumProvider
    })
    if (FreshRumProvider === undefined) throw new Error('RumProvider did not load')

    const { getByText } = await render(
      <FreshRumProvider>
        <Text>hello</Text>
      </FreshRumProvider>,
    )

    expect(getByText('hello')).toBeTruthy()
    expect(mockOpenObserveProvider).toHaveBeenCalledTimes(1)
  })
})
