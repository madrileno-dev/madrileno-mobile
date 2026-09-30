import { checkForOtaUpdate, type OtaDeps } from '@/updates/useOtaUpdates'

type TestDeps = OtaDeps & {
  prompt: jest.Mock<void, [(onAccept: () => Promise<void>) => void]>
  failed: jest.Mock<void, [(retry: () => Promise<void>) => void]>
}

function deps(overrides: Partial<TestDeps> = {}): TestDeps {
  return {
    isEnabled: true,
    checkForUpdate: jest.fn().mockResolvedValue({ isAvailable: true }),
    fetchUpdate: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn().mockResolvedValue(undefined),
    prompt: jest.fn(),
    failed: jest.fn(),
    now: () => 1_000_000,
    ...overrides,
  }
}

function acceptFrom(d: TestDeps): () => Promise<void> {
  return d.prompt.mock.calls[0]?.[0] as () => Promise<void>
}

// The throttle is module state, so each test uses a clock well past the previous one.
describe('checkForOtaUpdate', () => {
  it('prompts before downloading and downloads only on accept', async () => {
    const d = deps()
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(1)
    expect(d.fetchUpdate).not.toHaveBeenCalled()
    await acceptFrom(d)()
    expect(d.fetchUpdate).toHaveBeenCalledTimes(1)
    expect(d.reload).toHaveBeenCalledTimes(1)
  })

  it('does nothing when no update is available', async () => {
    const d = deps({
      now: () => 5_000_000,
      checkForUpdate: jest.fn().mockResolvedValue({ isAvailable: false }),
    })
    await checkForOtaUpdate(d)
    expect(d.prompt).not.toHaveBeenCalled()
  })

  it('does nothing when updates are disabled (dev, Expo Go)', async () => {
    const d = deps({ isEnabled: false, now: () => 10_000_000 })
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).not.toHaveBeenCalled()
  })

  it('throttles checks to once per five minutes', async () => {
    let t = 15_000_000
    const d = deps({ now: () => t })
    await checkForOtaUpdate(d)
    t += 60_000
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(1)
    t += 5 * 60_000
    await checkForOtaUpdate(d)
    expect(d.checkForUpdate).toHaveBeenCalledTimes(2)
  })

  it('swallows check failures', async () => {
    const d = deps({
      now: () => 20_000_000,
      checkForUpdate: jest.fn().mockRejectedValue(new Error('offline')),
    })
    await expect(checkForOtaUpdate(d)).resolves.toBeUndefined()
  })

  it('reports a failed download and offers a retry that can succeed', async () => {
    const d = deps({
      now: () => 25_000_000,
      fetchUpdate: jest
        .fn()
        .mockRejectedValueOnce(new Error('offline'))
        .mockResolvedValue(undefined),
    })
    await checkForOtaUpdate(d)
    await expect(acceptFrom(d)()).resolves.toBeUndefined()
    expect(d.reload).not.toHaveBeenCalled()
    expect(d.failed).toHaveBeenCalledTimes(1)
    const retry = d.failed.mock.calls[0]?.[0] as () => Promise<void>
    await retry()
    expect(d.reload).toHaveBeenCalledTimes(1)
  })
})
