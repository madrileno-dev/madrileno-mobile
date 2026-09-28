import { z } from 'zod'

// Kept in sync by hand with app.config.ts's DEFAULT_API_BASE_URL: app.config.ts
// runs as a standalone Node script at prebuild time and cannot import this
// module (or anything else under src/) there.
const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().optional().default('http://10.0.2.2:9000'),
  EXPO_PUBLIC_OTEL_ENDPOINT: z.string().optional(),
  EXPO_PUBLIC_OTEL_INGEST_TOKEN: z.string().optional(),
  EXPO_PUBLIC_OTEL_SERVICE_NAME: z.string().optional(),
})

// Expo inlines EXPO_PUBLIC_* at build time; read them once, here, so a typo is
// one place to fix and the rest of the app sees a typed object.
const raw = schema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_OTEL_ENDPOINT: process.env.EXPO_PUBLIC_OTEL_ENDPOINT,
  EXPO_PUBLIC_OTEL_INGEST_TOKEN: process.env.EXPO_PUBLIC_OTEL_INGEST_TOKEN,
  EXPO_PUBLIC_OTEL_SERVICE_NAME: process.env.EXPO_PUBLIC_OTEL_SERVICE_NAME,
})

export interface OtelConfig {
  endpoint: string
  ingestToken: string | undefined
  serviceName: string
}

export const env: { apiBaseUrl: string; otel: OtelConfig | null } = {
  apiBaseUrl: raw.EXPO_PUBLIC_API_BASE_URL,
  otel:
    raw.EXPO_PUBLIC_OTEL_ENDPOINT !== undefined
      ? {
          endpoint: raw.EXPO_PUBLIC_OTEL_ENDPOINT,
          ingestToken: raw.EXPO_PUBLIC_OTEL_INGEST_TOKEN,
          serviceName: raw.EXPO_PUBLIC_OTEL_SERVICE_NAME ?? 'madrileno-mobile',
        }
      : null,
}
