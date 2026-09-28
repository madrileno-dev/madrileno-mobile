import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(__dirname, '..', '..')
const COPIED = ['app', 'src', 'test', 'scripts', '.maestro', 'package.json', 'README.md', 'LICENSE']

function copyRepo(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'init-project-'))
  for (const entry of COPIED) {
    const from = path.join(ROOT, entry)
    if (fs.existsSync(from)) fs.cpSync(from, path.join(dir, entry), { recursive: true })
  }
  return dir
}

function grepMarkers(dir: string): string {
  try {
    return execFileSync('grep', ['-rl', 'auction-block', path.join(dir, 'app'), path.join(dir, 'src')], {
      encoding: 'utf-8',
    })
  } catch {
    return '' // grep exits 1 when nothing matches
  }
}

describe('init-project', () => {
  it('strips the auction demo and renames the package', () => {
    const dir = copyRepo()
    execFileSync('node', [path.join(dir, 'scripts', 'init-project.mjs'), 'acme'], { cwd: dir })

    expect(fs.existsSync(path.join(dir, 'src', 'features', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'app', '(app)', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'test', 'features', 'auctions'))).toBe(false)
    expect(fs.existsSync(path.join(dir, '.maestro', 'auctions.yml'))).toBe(false)
    expect(fs.existsSync(path.join(dir, 'LICENSE'))).toBe(false)

    const index = fs.readFileSync(path.join(dir, 'app', '(app)', 'index.tsx'), 'utf-8')
    expect(index).toContain('HomeScreen')
    expect(index).not.toContain('auction')

    const layout = fs.readFileSync(path.join(dir, 'app', '(app)', '_layout.tsx'), 'utf-8')
    expect(layout).not.toContain('auction')
    expect(layout).toContain("const indexTitle = tNav('home')")

    // The bundle id follows the name (app.config.ts), so the flows must too.
    const smoke = fs.readFileSync(path.join(dir, '.maestro', 'smoke.yml'), 'utf-8')
    expect(smoke).toContain('appId: dev.acme.mobile')

    const messages = JSON.parse(
      fs.readFileSync(path.join(dir, 'src', 'i18n', 'messages', 'en.json'), 'utf-8'),
    ) as Record<string, unknown>
    expect(messages).not.toHaveProperty('auction')

    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as {
      name: string
    }
    expect(pkg.name).toBe('acme-mobile')

    expect(grepMarkers(dir)).toBe('')
  })
})
