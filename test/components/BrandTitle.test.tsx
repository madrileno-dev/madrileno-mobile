import { screen } from '@testing-library/react-native'
import Constants from 'expo-constants'
import { BrandTitle } from '@/components/BrandTitle'
import { renderWithProviders } from '../renderApp'

describe('BrandTitle', () => {
  it('renders the app name next to the mark', async () => {
    await renderWithProviders(<BrandTitle />)
    expect(screen.getByTestId('brand-title')).toBeTruthy()
    expect(screen.getByText(Constants.expoConfig?.name ?? 'madrileno')).toBeTruthy()
  })
})
