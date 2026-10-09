#!/usr/bin/env node
// Rasterizes the icon/splash SVGs. The PNGs are committed: EAS runs npm hooks
// after prebuild, too late to generate them. Re-run after editing the SVGs.
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const out = path.join('assets', 'generated')
fs.mkdirSync(out, { recursive: true })

const icon = fs.readFileSync(path.join('assets', 'icon.svg'), 'utf8')
const splash = fs.readFileSync(path.join('assets', 'splash.svg'))
const transparent = { r: 0, g: 0, b: 0, alpha: 0 }

// Glyph only (the tile is adaptiveIcon.backgroundColor), shrunk into the
// launcher's ~66% safe zone.
const iconGlyphOnly = Buffer.from(
  icon
    .replace(/<rect[^>]*\/>\s*/, '')
    .replace(
      /(<svg[^>]*>)([\s\S]*)(<\/svg>)/,
      '$1<g transform="translate(256 256) scale(0.8) translate(-256 -256)">$2</g>$3',
    ),
)

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
