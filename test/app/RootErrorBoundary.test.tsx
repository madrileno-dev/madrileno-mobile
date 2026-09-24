import { fireEvent, render, screen } from '@testing-library/react-native'
import { RootErrorBoundary } from '@/app/RootErrorBoundary'

describe('RootErrorBoundary', () => {
  // Plain render, not renderWithProviders: Expo Router mounts this outside
  // the root layout's own providers when the layout itself throws.
  it('renders the heading and the error message', async () => {
    await render(<RootErrorBoundary error={new Error('boom')} retry={jest.fn()} />)

    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByTestId('error-message')).toHaveTextContent('boom')
  })

  it('calls retry when the reload button is pressed', async () => {
    const retry = jest.fn().mockResolvedValue(undefined)
    await render(<RootErrorBoundary error={new Error('boom')} retry={retry} />)

    await fireEvent.press(screen.getByTestId('error-retry'))

    expect(retry).toHaveBeenCalledTimes(1)
  })
})
