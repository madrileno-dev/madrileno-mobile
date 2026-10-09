describe('installFetch', () => {
  const original = {
    fetch: globalThis.fetch,
    Headers: globalThis.Headers,
    Request: globalThis.Request,
    Response: globalThis.Response,
  }

  afterEach(() => {
    Object.assign(globalThis, original)
  })

  it("installs React Native's XHR-backed fetch, Headers, Request and Response", () => {
    // whatwg-fetch only installs onto an empty global, so its real behavior depends on load order.
    const mockXhrFetch = {
      fetch: (() => {}) as unknown as typeof fetch,
      Headers: class {} as unknown as typeof Headers,
      Request: class {} as unknown as typeof Request,
      Response: class {} as unknown as typeof Response,
    }
    jest.isolateModules(() => {
      jest.doMock('whatwg-fetch', () => mockXhrFetch)
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/api/installFetch')
    })

    expect(globalThis.fetch).toBe(mockXhrFetch.fetch)
    expect(globalThis.Headers).toBe(mockXhrFetch.Headers)
    expect(globalThis.Request).toBe(mockXhrFetch.Request)
    expect(globalThis.Response).toBe(mockXhrFetch.Response)
  })
})
