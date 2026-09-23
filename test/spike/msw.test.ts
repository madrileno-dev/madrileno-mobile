import { http, HttpResponse } from 'msw'
import { server } from '../mswServer'

describe('msw under jest-expo', () => {
  it('intercepts globalThis.fetch', async () => {
    server.use(http.get('http://api.test/ping', () => HttpResponse.json({ ok: true })))
    const res = await fetch('http://api.test/ping')
    expect(await res.json()).toEqual({ ok: true })
  })
})
