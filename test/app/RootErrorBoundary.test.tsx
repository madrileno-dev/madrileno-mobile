import { fireEvent, render, screen } from '@testing-library/react-native'
import { RootErrorBoundary } from '@/components/RootErrorBoundary'

describe('RootErrorBoundary', () => {
  // No providers: Expo Router mounts it outside them.
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
