// Generates the app icons as PNG files, with no image library.
// Run: node scripts/make-icons.mjs
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'public')

// --- tiny PNG writer -------------------------------------------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crc])
}

function writePng(file, size, pixelAt) {
  const raw = Buffer.alloc((size * 3 + 1) * size)
  let p = 0
  for (let y = 0; y < size; y++) {
    raw[p++] = 0 // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size)
      raw[p++] = r
      raw[p++] = g
      raw[p++] = b
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour RGB
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(file, png)
  return png.length
}

// --- the mark: a white "K" on a dark blue square ---------------------------
const BG = [15, 23, 42] // #0f172a
const FG = [248, 250, 252] // #f8fafc
const ACCENT = [56, 189, 248] // #38bdf8

// distance from point to a line segment, in a 0..1 coordinate space
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / len2
  t = Math.max(0, Math.min(1, t))
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

/**
 * @param {boolean} maskable - maskable icons must keep the mark inside the
 *   middle 80%, because the system may crop the edges into a circle.
 */
function makePixel(maskable) {
  const scale = maskable ? 0.62 : 0.78 // how much of the square the K fills
  return (x, y, size) => {
    const u = (x + 0.5) / size
    const v = (y + 0.5) / size

    // put the K in a centred box of side `scale`
    const half = scale / 2
    const kx = (u - (0.5 - half)) / scale
    const ky = (v - (0.5 - half)) / scale

    const thick = 0.14
    let on = false
    if (kx >= -0.2 && kx <= 1.2 && ky >= -0.2 && ky <= 1.2) {
      const stem = distToSegment(kx, ky, 0.14, 0.03, 0.14, 0.97)
      const up = distToSegment(kx, ky, 0.2, 0.52, 0.86, 0.03)
      const down = distToSegment(kx, ky, 0.22, 0.48, 0.9, 0.97)
      on = stem < thick / 2 || up < thick / 2 || down < thick / 2
      if (on) {
        // the lower diagonal gets the accent colour
        if (down < thick / 2 && stem >= thick / 2 && up >= thick / 2) return ACCENT
        return FG
      }
    }

    // No rounded corners drawn here on purpose: iOS and Android apply their
    // own mask to the icon. A corner we draw would show as a dark edge.
    return BG
  }
}

fs.mkdirSync(OUT, { recursive: true })
const jobs = [
  ['apple-touch-icon.png', 180, false],
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
]
for (const [name, size, maskable] of jobs) {
  const bytes = writePng(path.join(OUT, name), size, makePixel(maskable))
  console.log(`wrote public/${name} (${size}x${size}, ${bytes} bytes)`)
}
