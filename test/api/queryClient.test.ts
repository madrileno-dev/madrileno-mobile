import { ORPCError } from '@orpc/client'
import { focusManager } from '@tanstack/react-query'
import { AppState, type AppStateStatus } from 'react-native'
import { connectQueryManagers, retryUnlessClientError } from '@/api/queryClient'

describe('retryUnlessClientError', () => {
  it('does not retry 4xx responses', () => {
    expect(retryUnlessClientError(0, new ORPCError('NOT_FOUND', { status: 404 }))).toBe(false)
  })

  it('retries 5xx and network errors up to three times', () => {
    const serverError = new ORPCError('INTERNAL_SERVER_ERROR', { status: 503 })
    expect(retryUnlessClientError(0, serverError)).toBe(true)
    expect(retryUnlessClientError(2, new TypeError('Network request failed'))).toBe(true)
    expect(retryUnlessClientError(3, serverError)).toBe(false)
  })
})

describe('connectQueryManagers', () => {
  it('tracks focus from AppState', () => {
    let onChange: ((state: AppStateStatus) => void) | undefined
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      onChange = listener
      return { remove: jest.fn() }
    })

    connectQueryManagers()
    onChange?.('background')
    expect(focusManager.isFocused()).toBe(false)
    onChange?.('active')
    expect(focusManager.isFocused()).toBe(true)
  })
})
