import { z } from 'zod'

// Kept in sync by hand with app.config.ts's DEFAULT_API_BASE_URL: app.config.ts
// runs as a standalone Node script at prebuild time and cannot import this
// module (or anything else under src/) there.
const schema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.string().optional().default('http://10.0.2.2:9000'),
  EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN: z.string().optional(),
  EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT: z.string().optional(),
  EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID: z.string().optional(),
  EXPO_PUBLIC_OPENOBSERVE_RUM_ENV: z.string().optional(),
})

// Expo inlines EXPO_PUBLIC_* at build time; read them once, here, so a typo is
// one place to fix and the rest of the app sees a typed object.
const raw = schema.parse({
  EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
  EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN: process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN,
  EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT: process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT,
  EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID:
    process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID,
  EXPO_PUBLIC_OPENOBSERVE_RUM_ENV: process.env.EXPO_PUBLIC_OPENOBSERVE_RUM_ENV,
})

export interface RumConfig {
  clientToken: string
  endpoint: string
  applicationId: string
  env: string
}

export const env: { apiBaseUrl: string; rum: RumConfig | null } = {
  apiBaseUrl: raw.EXPO_PUBLIC_API_BASE_URL,
  rum:
    raw.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN !== undefined &&
    raw.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT !== undefined
      ? {
          clientToken: raw.EXPO_PUBLIC_OPENOBSERVE_RUM_CLIENT_TOKEN,
          endpoint: raw.EXPO_PUBLIC_OPENOBSERVE_RUM_ENDPOINT,
          applicationId: raw.EXPO_PUBLIC_OPENOBSERVE_RUM_APPLICATION_ID ?? 'madrileno-mobile',
          env: raw.EXPO_PUBLIC_OPENOBSERVE_RUM_ENV ?? (__DEV__ ? 'development' : 'production'),
        }
      : null,
}
