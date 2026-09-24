import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { setReturnTo } from '@/features/auth/returnTo'
import { LoginScreen } from '@/features/auth/screens/LoginScreen'
import { tokenStore } from '@/features/auth/tokenStore'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockRouter } from '../../setup'

const BASE = 'http://10.0.2.2:9000'

async function submit(email: string) {
  await fireEvent.changeText(screen.getByTestId('login-email'), email)
  await fireEvent.press(screen.getByTestId('login-submit'))
}

describe('LoginScreen', () => {
  it('validates the email before calling the API', async () => {
    await renderWithProviders(<LoginScreen />)
    await submit('nope')
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy()
  })

  it('stores tokens and replaces the route on success', async () => {
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json({ jwt: 'j', refreshToken: 'r', userCreated: true }),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    await waitFor(() => expect(tokenStore.get()?.jwt).toBe('j'))
    expect(tokenStore.get()?.email).toBe('a@example.com')
    expect(mockRouter.replace).toHaveBeenCalledWith('/')
  })

  it('continues to the deep-linked screen after login', async () => {
    setReturnTo('/auctions/abc')
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json({ jwt: 'j', refreshToken: 'r', userCreated: false }),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/auctions/abc'))
  })

  it('shows the Problem title when the backend rejects', async () => {
    server.use(
      http.post(`${BASE}/v1/auth/dev`, () =>
        HttpResponse.json(
          { type: 'rejection:dev-auth-disabled', status: 403, title: 'Dev auth is off' },
          { status: 403 },
        ),
      ),
    )
    await renderWithProviders(<LoginScreen />)
    await submit('a@example.com')
    expect(await screen.findByText('Dev auth is off')).toBeTruthy()
    expect(tokenStore.get()).toBeNull()
  })
})
