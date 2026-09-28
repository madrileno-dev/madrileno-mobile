import { env } from '@/env'

// Lazy: none of the OTel packages load unless EXPO_PUBLIC_OTEL_ENDPOINT is set.
// The JS OTel SDK is not officially supported on React Native (hence the exact
// pins and the two fetch workarounds below, from the OTel demo's RN app).
export async function initObservability(): Promise<void> {
  const cfg = env.otel
  if (cfg === null) return

  const [
    { trace, propagation },
    { logs, SeverityNumber },
    { resourceFromAttributes },
    { WebTracerProvider },
    { BatchSpanProcessor },
    { LoggerProvider, BatchLogRecordProcessor },
    { OTLPTraceExporter },
    { OTLPLogExporter },
    { registerInstrumentations },
    { FetchInstrumentation },
    { XMLHttpRequestInstrumentation },
    { CompositePropagator, W3CBaggagePropagator, W3CTraceContextPropagator },
    Device,
    Crypto,
    { AppState },
    { installErrorReporting },
  ] = await Promise.all([
    import('@opentelemetry/api'),
    import('@opentelemetry/api-logs'),
    import('@opentelemetry/resources'),
    import('@opentelemetry/sdk-trace-web'),
    import('@opentelemetry/sdk-trace-base'),
    import('@opentelemetry/sdk-logs'),
    import('@opentelemetry/exporter-trace-otlp-http'),
    import('@opentelemetry/exporter-logs-otlp-http'),
    import('@opentelemetry/instrumentation'),
    import('@opentelemetry/instrumentation-fetch'),
    import('@opentelemetry/instrumentation-xml-http-request'),
    import('@opentelemetry/core'),
    import('expo-device'),
    import('expo-crypto'),
    import('react-native'),
    import('./errors'),
  ])

  const sessionId = Crypto.randomUUID()
  const headers: Record<string, string> =
    cfg.ingestToken !== undefined ? { Authorization: `Bearer ${cfg.ingestToken}` } : {}
  const resource = resourceFromAttributes({
    'service.name': cfg.serviceName,
    'os.name': Device.osName ?? 'unknown',
    'os.version': Device.osVersion ?? 'unknown',
    'device.model.name': Device.modelName ?? 'unknown',
    'session.id': sessionId,
  })

  const tracerProvider = new WebTracerProvider({
    resource,
    spanProcessors: [
      new BatchSpanProcessor(new OTLPTraceExporter({ url: `${cfg.endpoint}/v1/traces`, headers }), {
        scheduledDelayMillis: 500,
      }),
    ],
  })
  trace.setGlobalTracerProvider(tracerProvider)
  propagation.setGlobalPropagator(
    new CompositePropagator({
      propagators: [new W3CTraceContextPropagator(), new W3CBaggagePropagator()],
    }),
  )

  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        // RN's fetch is a polyfill over XMLHttpRequest, not real CORS: always propagate.
        propagateTraceHeaderCorsUrls: /.*/,
        clearTimingResources: false,
      }),
      // …and ignore the API in the XHR layer so each call yields one span, not two.
      new XMLHttpRequestInstrumentation({ ignoreUrls: [new RegExp(env.apiBaseUrl)] }),
    ],
  })

  const loggerProvider = new LoggerProvider({
    resource,
    processors: [
      new BatchLogRecordProcessor({
        exporter: new OTLPLogExporter({ url: `${cfg.endpoint}/v1/logs`, headers }),
      }),
    ],
  })
  logs.setGlobalLoggerProvider(loggerProvider)
  const logger = logs.getLogger(cfg.serviceName)

  installErrorReporting((record) => {
    logger.emit({
      severityNumber: SeverityNumber.ERROR,
      severityText: 'ERROR',
      body: record.body,
      attributes: {
        'exception.stacktrace': record.stack ?? '',
        'error.fatal': record.isFatal,
        'session.id': sessionId,
      },
    })
    if (record.isFatal) void loggerProvider.forceFlush()
  })

  AppState.addEventListener('change', (state) => {
    if (state === 'background') {
      void tracerProvider.forceFlush()
      void loggerProvider.forceFlush()
    }
  })
}
