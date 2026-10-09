import { TrackingConsent } from '@openobserve/mobile-react-native'
import { rumConsentStore } from '@/observability/consent'
import { trackingConsent } from '@/observability/rum'

describe('RUM consent', () => {
  it('collects nothing until the user allows it', () => {
    expect(trackingConsent(null)).toBe(TrackingConsent.NOT_GRANTED)
    expect(trackingConsent('granted')).toBe(TrackingConsent.GRANTED)
    expect(trackingConsent('denied')).toBe(TrackingConsent.NOT_GRANTED)
  })

  it('stores the choice and notifies subscribers', () => {
    const listener = jest.fn()
    const unsubscribe = rumConsentStore.subscribe(listener)
    rumConsentStore.set('granted')
    rumConsentStore.set('granted')
    rumConsentStore.set('denied')
    unsubscribe()

    expect(rumConsentStore.get()).toBe('denied')
    expect(listener).toHaveBeenCalledTimes(2)
  })
})
