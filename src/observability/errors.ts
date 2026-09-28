export interface ErrorRecord {
  body: string
  stack: string | undefined
  isFatal: boolean
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
