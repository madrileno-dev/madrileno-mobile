#!/usr/bin/env node
// Rasterize assets/icon.svg and assets/splash.svg into the PNGs app.config.ts references.
// The PNGs are committed: EAS Build runs its npm hooks after `expo prebuild`, so nothing
// can generate them in time on a clean remote build. Re-run after editing the SVGs.
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const out = path.join('assets', 'generated')
fs.mkdirSync(out, { recursive: true })

const icon = fs.readFileSync(path.join('assets', 'icon.svg'), 'utf8')
const splash = fs.readFileSync(path.join('assets', 'splash.svg'))
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

// Android composites the adaptive icon's foreground over adaptiveIcon.backgroundColor
// (the same crimson as the tile), so it needs the glyph with no tile behind it — strip
// icon.svg's background rect.
const iconGlyphOnly = Buffer.from(icon.replace(/<rect[^>]*\/>\s*/, ''))

const jobs = [
  ['icon.png', Buffer.from(icon), 1024, { fit: 'contain' }],
  [
    'adaptive-icon-foreground.png',
    iconGlyphOnly,
    1024,
    { fit: 'contain', background: transparent },
  ],
  ['splash-icon.png', splash, 400, { fit: 'contain', background: transparent }],
]
for (const [name, src, size, opts] of jobs) {
  await sharp(src).resize(size, size, opts).png().toFile(path.join(out, name))
  console.log(`wrote ${path.join(out, name)}`)
}
