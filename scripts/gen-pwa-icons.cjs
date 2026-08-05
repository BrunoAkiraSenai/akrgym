// Gera PNGs minimalistas para o PWA (pwa-192x192, pwa-512x512, apple-touch-icon 180x180)
// Fundo roxo escuro + barra amarela diagonal (representando gym/energia) + letra A branca
// Implementacao PNG pura (sem dependencias) usando zlib para compressao IDAT
const zlib = require('zlib')
const fs = require('fs')
const path = require('path')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function makePNG(size, bgFill) {
  const W = size, H = size
  const raw = Buffer.alloc(H * (1 + W * 4))
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0
    for (let x = 0; x < W; x++) {
      const o = y * (1 + W * 4) + 1 + x * 4
      let r = bgFill[0], g = bgFill[1], b = bgFill[2]
      // Barra diagonal amarela de energia (gyrokata)
      const t = (x + y) / (W + H)
      const onBar = Math.abs(((t * 6) % 1) - 0.5) < 0.04
      if (onBar) { r = 245; g = 200; b = 80 }
      // Letra A branca central (aproximacao por distance field)
      const cx = W / 2, cy = H / 2
      const nx = (x - cx) / W * 2
      const ny = (y - cy) / H * 2
      const inA = ny > -0.55 && ny < 0.55 &&
        Math.abs(nx) < 0.5 - Math.max(0, Math.abs(ny) - 0.25) * 0.4 &&
        (Math.abs(nx) > 0.28 || ny > 0.25 || (Math.abs(nx) > 0.1 && ny > -0.1))
      if (inA) { r = 255; g = 255; b = 255 }
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = 255
    }
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const out = path.resolve(__dirname, '..', 'public')
const bg = [10, 8, 26] // roxo escuro Aether
fs.writeFileSync(path.join(out, 'pwa-192x192.png'), makePNG(192, bg))
fs.writeFileSync(path.join(out, 'pwa-512x512.png'), makePNG(512, bg))
fs.writeFileSync(path.join(out, 'apple-touch-icon.png'), makePNG(180, bg))
fs.writeFileSync(path.join(out, 'robots.txt'), 'User-agent: *\nAllow: /\n')
console.log('OK: gerados pwa-192x192.png, pwa-512x512.png, apple-touch-icon.png, robots.txt')
