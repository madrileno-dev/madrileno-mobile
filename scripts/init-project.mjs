#!/usr/bin/env node
// Remove the wine-auction demo and leave a runnable shell (login + home + settings).
// Usage: node scripts/init-project.mjs [name]
import fs from 'node:fs'
import path from 'node:path'

const name = process.argv[2]

const removals = [
  path.join('src', 'features', 'auctions'),
  path.join('app', '(app)', 'auctions'),
  path.join('test', 'features', 'auctions'),
  path.join('.maestro', 'auctions.yml'),
]
for (const p of removals) if (fs.existsSync(p)) fs.rmSync(p, { recursive: true })

const licenseDeleted = fs.existsSync('LICENSE')
if (licenseDeleted) fs.rmSync('LICENSE')
if (fs.existsSync('README.md')) {
  const readme = fs.readFileSync('README.md', 'utf-8')
  const stripped = readme.replace(/\n?^## License[ \t]*\r?\n[\s\S]*?(?=^## |(?![\s\S]))/m, '')
  if (stripped !== readme) fs.writeFileSync('README.md', stripped)
}

// The demo list route becomes the plain home screen.
fs.writeFileSync(
  path.join('app', '(app)', 'index.tsx'),
  "export { HomeScreen as default } from '@/features/home/screens/HomeScreen'\n",
)

const blockRe = /^.*mobile:auction-block-start[\s\S]*?mobile:auction-block-end.*(?:\n|$)/gm
const leftoverImportRe = /^import .* from '.*features\/auctions.*'\r?\n/gm

function* walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'contracts' || entry.name === 'node_modules') continue
      yield* walk(p)
    } else if (/\.(tsx?|css)$/.test(entry.name)) {
      yield p
    }
  }
}

let stripped = 0
for (const file of [...walk('app'), ...walk('src'), ...walk('test')]) {
  const original = fs.readFileSync(file, 'utf-8')
  const transformed = original.replace(blockRe, '').replace(leftoverImportRe, '')
  if (transformed !== original) {
    fs.writeFileSync(file, transformed)
    stripped += 1
  }
}

// The (app) layout's index title came from the auction namespace; restore the home title.
const layoutPath = path.join('app', '(app)', '_layout.tsx')
const layout = fs.readFileSync(layoutPath, 'utf-8')
if (!layout.includes('const indexTitle')) {
  fs.writeFileSync(
    layoutPath,
    layout.replace(
      /^(\s*)const tNav = useTranslations\('nav'\)$/m,
      "$1const tNav = useTranslations('nav')\n$1const indexTitle = tNav('home')",
    ),
  )
}

const messagesPath = path.join('src', 'i18n', 'messages', 'en.json')
const catalog = JSON.parse(fs.readFileSync(messagesPath, 'utf-8'))
if ('auction' in catalog) {
  delete catalog.auction
  fs.writeFileSync(messagesPath, JSON.stringify(catalog, null, 2) + '\n')
}

if (name) {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'))
  pkg.name = `${name}-mobile`
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')

  // app.config.ts derives the bundle id from the name; keep the Maestro flows in step.
  const scheme = name.replace(/[^a-z0-9]/gi, '').toLowerCase()
  const maestroDir = '.maestro'
  if (fs.existsSync(maestroDir)) {
    for (const f of fs.readdirSync(maestroDir).filter((f) => f.endsWith('.yml'))) {
      const p = path.join(maestroDir, f)
      const flow = fs.readFileSync(p, 'utf-8')
      fs.writeFileSync(p, flow.replace(/^appId: .*$/m, `appId: dev.${scheme}.mobile`))
    }
  }
}

console.log('Deleted the auction demo (feature, routes, tests, Maestro flow)')
if (licenseDeleted) console.log('Deleted LICENSE (generated projects may relicense freely)')
console.log(`Stripped auction blocks from ${stripped} file(s)`)
if (name)
  console.log(
    `Renamed package to ${name}-mobile (app name, slug, scheme, bundle id and Maestro appId follow)`,
  )
console.log()
console.log('Next:')
console.log('  pnpm run typecheck && pnpm run lint && pnpm run test')
console.log('  pnpm run native:prebuild   # bundle ids changed with the name')
console.log('  (after backend init-project + sbt test): pnpm run sync-contracts')
