import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { http, HttpResponse } from 'msw'
import { AuctionDetailScreen } from '@/features/auctions/screens/AuctionDetailScreen'
import { server } from '../../mswServer'
import { renderWithProviders } from '../../renderApp'
import { mockToast } from '../../setup'
import { AUCTION_ID, BASE, bidTooLowProblem, bidsPageFixture, detailHandler } from './mocks'

const bidsUrl = `${BASE}/v1/auctions/${AUCTION_ID}/bids`

async function openDialogAndBid(amount: string) {
  await fireEvent.press(await screen.findByTestId('bid-open'))
  await fireEvent.changeText(await screen.findByTestId('bid-amount'), amount)
  await fireEvent.press(screen.getByTestId('bid-submit'))
}

describe('AuctionDetailScreen', () => {
  it('renders the auction and its bid history', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () =>
        HttpResponse.json(bidsPageFixture(['019ed9bb-0000-7000-8000-000000000b01'], false)),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    expect(await screen.findByText('Château Margaux 2015')).toBeTruthy()
    expect(await screen.findByText(/by bidder-0/)).toBeTruthy()
  })

  it('loads more bids via the cursor', async () => {
    const first = bidsPageFixture(
      ['019ed9bb-0000-7000-8000-000000000b01', '019ed9bb-0000-7000-8000-000000000b02'],
      true,
    )
    const second = bidsPageFixture(['019ed9bb-0000-7000-8000-000000000b03'], false, 2)
    server.use(
      detailHandler,
      http.get(bidsUrl, ({ request }) =>
        HttpResponse.json(new URL(request.url).searchParams.has('after-id') ? second : first),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await fireEvent.press(await screen.findByText('Load more bids'))
    expect(await screen.findByText(/by bidder-2/)).toBeTruthy()
  })

  it('places a bid from the dialog and toasts success', async () => {
    let posted: unknown = null
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json(
          {
            id: '019ed9bb-0000-7000-8000-000000000b09',
            auctionId: AUCTION_ID,
            bidderId: '019ed9bb-0000-7000-8000-0000000000bb',
            amount: 200,
            createdAt: '2026-06-16T10:00:00Z',
          },
          { status: 201 },
        )
      }),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('200')
    await waitFor(() => expect(posted).toEqual({ amount: 200 }))
    expect(mockToast.success).toHaveBeenCalledWith('Bid placed.')
  })

  it('accepts a decimal comma', async () => {
    let posted: unknown
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, async ({ request }) => {
        posted = await request.json()
        return HttpResponse.json(bidTooLowProblem, { status: 409 })
      }),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('120,50')
    await waitFor(() => expect(posted).toEqual({ amount: 120.5 }))
  })

  it('rejects a non-numeric amount with a translated message', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('abc')
    expect(await screen.findByText('Enter an amount, like 120 or 120.50')).toBeTruthy()
  })

  it('shows the typed bid-too-low rejection inline', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, () => HttpResponse.json(bidTooLowProblem, { status: 409 })),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('120')
    expect(
      await screen.findByText(/someone got there first. The minimum is now €300.00/),
    ).toBeTruthy()
  })

  it('clears the rejection and amount when the dialog is cancelled and reopened', async () => {
    server.use(
      detailHandler,
      http.get(bidsUrl, () => HttpResponse.json(bidsPageFixture([], false))),
      http.post(bidsUrl, () => HttpResponse.json(bidTooLowProblem, { status: 409 })),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    await openDialogAndBid('120')
    expect(await screen.findByTestId('bid-rejection')).toBeTruthy()
    await fireEvent.press(screen.getByText('Cancel'))
    await fireEvent.press(await screen.findByTestId('bid-open'))
    expect(screen.queryByTestId('bid-rejection')).toBeNull()
    expect((await screen.findByTestId('bid-amount')).props.value).toBe('')
  })

  it('shows the error state when the auction does not exist', async () => {
    server.use(
      http.get(`${BASE}/v1/auctions/${AUCTION_ID}`, () =>
        HttpResponse.json(
          { type: 'rejection:auction-not-found', status: 404, title: 'Not found' },
          { status: 404 },
        ),
      ),
    )
    await renderWithProviders(<AuctionDetailScreen auctionId={AUCTION_ID} />)
    expect(await screen.findByTestId('error-state')).toBeTruthy()
  })
})
