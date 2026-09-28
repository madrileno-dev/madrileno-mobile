import { installErrorReporting, installRejectionReporting } from '@/observability/errors'

describe('observability', () => {
  it('initObservability is a no-op without the env variable', async () => {
    // jest.doMock + a dynamic import() doesn't honour the mock under this
    // project's babel-jest transform (no --experimental-vm-modules), so use
    // isolateModules + require instead.
    let initObservability: () => Promise<void> = () => Promise.resolve()
    jest.isolateModules(() => {
      jest.doMock('@/env', () => ({ env: { apiBaseUrl: 'http://x', otel: null } }))
      // Must be a synchronous require (not a dynamic import) so jest.doMock,
      // which patches the CommonJS module registry, applies to it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const otel = require('@/observability/otel') as typeof import('@/observability/otel')
      initObservability = otel.initObservability
    })
    const before = ErrorUtils.getGlobalHandler()
    await expect(initObservability()).resolves.toBeUndefined()
    expect(ErrorUtils.getGlobalHandler()).toBe(before)
  })

  it('initObservability wires OTel and error/rejection reporting when configured', async () => {
    // The XHR instrumentation patches XMLHttpRequest.prototype at enable()
    // time; jest-expo's testEnvironment is plain Node, which has no such
    // global (RN's own polyfill installs it, at app boot, outside Jest). A
    // minimal stand-in is enough for the instrumentation to wrap it — it's
    // never actually invoked in this test (no request is made).
    class FakeXMLHttpRequest {
      open() {}
      send() {}
    }
    const previousXHR = (globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest
    ;(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = FakeXMLHttpRequest

    let initObservability: () => Promise<void> = () => Promise.resolve()
    jest.isolateModules(() => {
      jest.doMock('@/env', () => ({
        env: {
          apiBaseUrl: 'http://10.0.2.2:9000',
          otel: {
            endpoint: 'http://10.0.2.2:5080/api/default',
            ingestToken: undefined,
            serviceName: 'test-service',
          },
        },
      }))
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const otel = require('@/observability/otel') as typeof import('@/observability/otel')
      initObservability = otel.initObservability
    })

    const { trace } = await import('@opentelemetry/api')
    // ProxyTracerProvider (the real getTracerProvider() before any delegate is
    // registered) isn't itself the no-op — its getDelegate() is. This is the
    // documented, stable way to tell "still no-op" from "now wired".
    interface DelegatingTracerProvider {
      getDelegate(): unknown
    }
    const delegateBefore = (
      trace.getTracerProvider() as unknown as DelegatingTracerProvider
    ).getDelegate()

    const beforeHandler = ErrorUtils.getGlobalHandler()
    try {
      // No span/log record is ever created or flushed here (nothing calls
      // fetch/XHR, and forceFlush only runs on a fatal error or app
      // backgrounding), so MSW's onUnhandledRequest: 'error' (test/setup.ts)
      // is never in a position to trip.
      await expect(initObservability()).resolves.toBeUndefined()

      expect(ErrorUtils.getGlobalHandler()).not.toBe(beforeHandler)
      const delegateAfter = (
        trace.getTracerProvider() as unknown as DelegatingTracerProvider
      ).getDelegate()
      expect(delegateAfter).not.toBe(delegateBefore)
    } finally {
      ErrorUtils.setGlobalHandler(beforeHandler)
      ;(globalThis as { XMLHttpRequest?: unknown }).XMLHttpRequest = previousXHR
    }
  })

  it('installErrorReporting forwards uncaught errors and restores the previous handler', () => {
    const previous = jest.fn()
    ErrorUtils.setGlobalHandler(previous)
    const emit = jest.fn()
    const uninstall = installErrorReporting(emit)
    const boom = new Error('boom')
    ErrorUtils.getGlobalHandler()(boom, true)
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ body: 'boom', isFatal: true }))
    expect(previous).toHaveBeenCalledWith(boom, true)
    uninstall()
    expect(ErrorUtils.getGlobalHandler()).toBe(previous)
  })

  it('installRejectionReporting forwards unhandled rejections and stops after uninstall', () => {
    const captured: {
      onUnhandled?: (id: number, rejection?: unknown) => void
      onHandled?: (id: number) => void
    } = {}
    const enablePromiseRejectionTracker = jest.fn((options: typeof captured) => {
      captured.onUnhandled = options.onUnhandled
      captured.onHandled = options.onHandled
    })
    const previousHermesInternal = (globalThis as { HermesInternal?: unknown }).HermesInternal
    ;(globalThis as { HermesInternal?: unknown }).HermesInternal = {
      enablePromiseRejectionTracker,
    }

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const emit = jest.fn()
      const uninstall = installRejectionReporting(emit)
      expect(enablePromiseRejectionTracker).toHaveBeenCalledWith(
        expect.objectContaining({ allRejections: true }),
      )

      const boom = new Error('boom')
      captured.onUnhandled?.(1, boom)
      expect(emit).toHaveBeenCalledWith(
        expect.objectContaining({ body: 'boom', isFatal: false, unhandledRejection: true }),
      )
      expect(warnSpy).toHaveBeenCalledTimes(1)

      uninstall()
      emit.mockClear()
      warnSpy.mockClear()
      captured.onUnhandled?.(2, new Error('after uninstall'))
      expect(emit).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
    } finally {
      warnSpy.mockRestore()
      ;(globalThis as { HermesInternal?: unknown }).HermesInternal = previousHermesInternal
    }
  })

  it('installRejectionReporting is a no-op when Hermes has no rejection tracker', () => {
    const previousHermesInternal = (globalThis as { HermesInternal?: unknown }).HermesInternal
    delete (globalThis as { HermesInternal?: unknown }).HermesInternal
    try {
      const emit = jest.fn()
      expect(() => installRejectionReporting(emit)()).not.toThrow()
    } finally {
      ;(globalThis as { HermesInternal?: unknown }).HermesInternal = previousHermesInternal
    }
  })
})
