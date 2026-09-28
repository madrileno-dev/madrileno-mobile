import { installErrorReporting } from '@/observability/errors'

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
})
