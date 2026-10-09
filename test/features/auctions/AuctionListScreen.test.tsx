import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { PAGE_SIZE } from '@/features/auctions/queries'
import { AuctionListScreen } from '@/features/auctions/screens/AuctionListScreen'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockRouter } from '../../setup'
import { AUCTION_ID, BASE, auctionFixture, auctionsPageFixture, listHandler } from './mocks'

describe('AuctionListScreen', () => {
  it('renders auctions with price and status', async () => {
    server.use(listHandler)
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByText('Château Margaux 2015')).toBeTruthy()
    expect(screen.getByText('€150.00')).toBeTruthy()
    expect(screen.getByText('Open')).toBeTruthy()
  })

  it('navigates to the detail on tap', async () => {
    server.use(listHandler)
    await renderWithProviders(<AuctionListScreen />)
    await fireEvent.press(await screen.findByTestId(`auction-${AUCTION_ID}`))
    expect(mockRouter.push).toHaveBeenCalledWith(`/auctions/${AUCTION_ID}`)
  })

  it('fetches the next page when the end of the list is reached', async () => {
    const items = Array.from({ length: PAGE_SIZE + 1 }, (_, i) => ({
      ...auctionFixture,
      id: `${AUCTION_ID.slice(0, -2)}${i.toString(16).padStart(2, '0')}`,
      wineName: `Wine ${String(i)}`,
    }))
    const requestedOffsets: number[] = []
    server.use(
      http.get(`${BASE}/v1/auctions`, ({ request }) => {
        const offset = Number(new URL(request.url).searchParams.get('offset') ?? '0')
        requestedOffsets.push(offset)
        return HttpResponse.json({
          items: items.slice(offset, offset + PAGE_SIZE),
          limit: PAGE_SIZE,
          offset,
          total: items.length,
        })
      }),
    )
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByText('Wine 0 2015')).toBeTruthy()
    expect(requestedOffsets).toEqual([0])
    // Virtualised lists render a window, so assert on the request, not on item 21.
    await fireEvent(screen.getByTestId('auction-list'), 'onEndReached')
    await waitFor(() => expect(requestedOffsets).toEqual([0, PAGE_SIZE]))
  })

  it('shows the empty state', async () => {
    server.use(
      http.get(`${BASE}/v1/auctions`, () =>
        HttpResponse.json({ ...auctionsPageFixture, items: [], total: 0 }),
      ),
    )
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByTestId('empty-state')).toBeTruthy()
  })

  it('shows the error state with retry when the API fails', async () => {
    server.use(http.get(`${BASE}/v1/auctions`, () => HttpResponse.error()))
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByTestId('error-state')).toBeTruthy()
    expect(screen.getByText('Try again')).toBeTruthy()
  })

  it('keeps the cached list and shows a banner when a refetch fails', async () => {
    server.use(listHandler)
    await renderWithProviders(<AuctionListScreen />)
    expect(await screen.findByText('Château Margaux 2015')).toBeTruthy()

    server.use(http.get(`${BASE}/v1/auctions`, () => HttpResponse.error()))
    await fireEvent(screen.getByTestId('auction-list'), 'onRefresh')

    expect(await screen.findByTestId('stale-banner')).toBeTruthy()
    expect(screen.getByText('Château Margaux 2015')).toBeTruthy()
  })
})
