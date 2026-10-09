// One networking stack in every build: Expo's native fetch bypasses XMLHttpRequest, which
// the RUM SDK instruments, so RN's XHR-backed whatwg-fetch replaces it before anything runs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const xhrFetch = require('whatwg-fetch') as {
  fetch: typeof fetch
  Headers: typeof Headers
  Request: typeof Request
  Response: typeof Response
}

globalThis.fetch = xhrFetch.fetch
globalThis.Headers = xhrFetch.Headers
globalThis.Request = xhrFetch.Request
globalThis.Response = xhrFetch.Response
