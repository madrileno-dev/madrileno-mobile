---
role: mobile
summary: React Native app (Expo Router, TanStack Query, oRPC client); reaches the backend on port 9000
---

- run on the Android emulator: `(cd {dir} && pnpm run android)`; it runs until
  stopped, and the emulator reaches the backend at `10.0.2.2:9000`
- consumes the API contract: `(cd {dir} && pnpm run sync-contracts ../{backend}/target/baklava/views/client/orpc/src)`,
  then `pnpm run typecheck`
- rules: `{dir}/AGENTS.md`
