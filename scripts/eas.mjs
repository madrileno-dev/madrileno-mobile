#!/usr/bin/env node
// Run eas-cli (via npx, as Expo recommends) with .env.local / .env loaded: app.config.ts
// needs EAS_OWNER and EAS_PROJECT_ID, and eas-cli doesn't read env files. The shell wins.
// Usage: node scripts/eas.mjs <eas args…>
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import process from 'node:process'

for (const file of ['.env.local', '.env']) {
  if (fs.existsSync(file)) process.loadEnvFile(file)
}

const args = process.argv.slice(2)
if (args[0] === '--') args.shift()

const { status, error } = spawnSync('npx', ['--yes', 'eas-cli@latest', ...args], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
if (error) throw error
process.exit(status ?? 1)
