export interface ErrorRecord {
  body: string
  stack: string | undefined
  isFatal: boolean
  unhandledRejection?: boolean
}

// Wrap RN's global handler: report, then hand off to whatever was installed
// before (the red box in dev, the crash in production).
export function installErrorReporting(emit: (record: ErrorRecord) => void): () => void {
  const previous = ErrorUtils.getGlobalHandler()
  ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    const e = error instanceof Error ? error : new Error(String(error))
    emit({ body: e.message, stack: e.stack, isFatal: isFatal === true })
    previous(error, isFatal)
  })
  return () => ErrorUtils.setGlobalHandler(previous)
}

interface HermesRejectionTracker {
  enablePromiseRejectionTracker?: (options: {
    allRejections?: boolean
    onUnhandled?: (id: number, rejection?: unknown) => void
    onHandled?: (id: number) => void
  }) => void
}

// ErrorUtils' global handler never sees unhandled promise rejections: RN's own
// polyfillPromise.js instead hooks Hermes' own tracker directly, and only in
// __DEV__ (see node_modules/react-native/Libraries/Core/polyfillPromise.js and
// promiseRejectionTrackingOptions.js). Hermes' tracker has a single slot and no
// getter, so calling enablePromiseRejectionTracker here replaces whatever
// RN/Expo installed for the dev red box; reproduce their console warning
// ourselves so it isn't silently lost.
export function installRejectionReporting(emit: (record: ErrorRecord) => void): () => void {
  const hermes = (globalThis as { HermesInternal?: HermesRejectionTracker }).HermesInternal
  if (hermes?.enablePromiseRejectionTracker === undefined) return () => {}

  let installed = true
  hermes.enablePromiseRejectionTracker({
    allRejections: true,
    onUnhandled: (id, rejection) => {
      if (!installed) return
      const e = rejection instanceof Error ? rejection : new Error(String(rejection))
      emit({ body: e.message, stack: e.stack, isFatal: false, unhandledRejection: true })
      if (__DEV__) console.warn(`Possible Unhandled Promise Rejection (id: ${id}): ${e.message}`)
    },
    onHandled: (id) => {
      if (!installed) return
      if (__DEV__) {
        console.warn(
          `Promise Rejection Handled (id: ${id}): this means you can ignore any previous ` +
            `"Possible Unhandled Promise Rejection" message with id ${id}.`,
        )
      }
    },
  })

  return () => {
    installed = false
  }
}
