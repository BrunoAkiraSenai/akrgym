// Gera icones PWA e splash a partir de fotos/Icone.png usando pngjs
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { PNG } = require('pngjs')

function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii')
  const l = Buffer.alloc(4); l.writeUInt32BE(data.length, 0)
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
  return Buffer.concat([l, t, data, c])
}

function encodePNG(png) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(png.width, 0)
  ihdr.writeUInt32BE(png.height, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const raw = Buffer.alloc(png.height * (1 + png.width * 4))
  for (let y = 0; y < png.height; y++) {
    raw[y * (1 + png.width * 4)] = 0
    for (let x = 0; x < png.width; x++) {
      const src = (y * png.width + x) * 4
      const dst = y * (1 + png.width * 4) + 1 + x * 4
      raw[dst] = png.data[src]
      raw[dst + 1] = png.data[src + 1]
      raw[dst + 2] = png.data[src + 2]
      raw[dst + 3] = png.data[src + 3]
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

/* Redimensiona PNG com filtro bilinear simples.
   fillBg: se definido, preenche pixels transparentes com a cor de fundo. */
function resize(srcPng, dstW, dstH, fillBg) {
  const out = { width: dstW, height: dstH, data: Buffer.alloc(dstW * dstH * 4) }
  const sx = srcPng.width / dstW
  const sy = srcPng.height / dstH
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const srcX = x * sx
      const srcY = y * sy
      const x0 = Math.floor(srcX), y0 = Math.floor(srcY)
      const x1 = Math.min(x0 + 1, srcPng.width - 1)
      const y1 = Math.min(y0 + 1, srcPng.height - 1)
      const fx = srcX - x0, fy = srcY - y0
      const get = (px, py) => {
        const i = (py * srcPng.width + px) * 4
        return [srcPng.data[i], srcPng.data[i + 1], srcPng.data[i + 2], srcPng.data[i + 3]]
      }
      const c00 = get(x0, y0), c10 = get(x1, y0)
      const c01 = get(x0, y1), c11 = get(x1, y1)
      const dst = (y * dstW + x) * 4
      for (let ch = 0; ch < 4; ch++) {
        const v = c00[ch] * (1 - fx) * (1 - fy) + c10[ch] * fx * (1 - fy)
                + c01[ch] * (1 - fx) * fy + c11[ch] * fx * fy
        out.data[dst + ch] = Math.round(v)
      }
      // Se pixel for transparente, preenche com bg
      if (fillBg && out.data[dst + 3] < 128) {
        out.data[dst] = fillBg[0]
        out.data[dst + 1] = fillBg[1]
        out.data[dst + 2] = fillBg[2]
        out.data[dst + 3] = 255
      }
    }
  }
  return out
}

/* Cria splash screen: fundo roxo Aether com icone centralizado */
function makeSplash(srcPng, dstW, dstH, bg) {
  const out = { width: dstW, height: dstH, data: Buffer.alloc(dstW * dstH * 4) }
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const dst = (y * dstW + x) * 4
      // Fundo com gradiente radial sutil
      const cx = dstW / 2, cy = dstH / 2
      const d = Math.hypot(x - cx, y - cy) / Math.hypot(cx, cy)
      out.data[dst] = Math.round(bg[0] * (1 - d * 0.15))
      out.data[dst + 1] = Math.round(bg[1] * (1 - d * 0.15))
      out.data[dst + 2] = Math.round(bg[2] * (1 - d * 0.15))
      out.data[dst + 3] = 255
    }
  }
  // Centraliza icone ocupando ~55% da largura
  const iconSize = Math.round(dstW * 0.55)
  const iconResized = resize(srcPng, iconSize, iconSize)
  const offX = Math.round((dstW - iconSize) / 2)
  const offY = Math.round((dstH - iconSize) / 2)
  for (let y = 0; y < iconSize; y++) {
    for (let x = 0; x < iconSize; x++) {
      const src = (y * iconSize + x) * 4
      if (iconResized.data[src + 3] < 10) continue
      const dst = ((offY + y) * dstW + (offX + x)) * 4
      const a = iconResized.data[src + 3] / 255
      out.data[dst] = Math.round(out.data[dst] * (1 - a) + iconResized.data[src] * a)
      out.data[dst + 1] = Math.round(out.data[dst + 1] * (1 - a) + iconResized.data[src + 1] * a)
      out.data[dst + 2] = Math.round(out.data[dst + 2] * (1 - a) + iconResized.data[src + 2] * a)
    }
  }
  return out
}

const srcPath = path.resolve(__dirname, '..', 'fotos', 'Icone.png')
const outDir = path.resolve(__dirname, '..', 'public')
const srcPng = PNG.sync.read(fs.readFileSync(srcPath))
console.log(`Source: ${srcPng.width}x${srcPng.height}`)

// Fundo roxo Aether (combina com o tema)
const bg = [10, 8, 26]

// Icones PWA (preenchidos com bg para fundo opaco)
const pwa192 = resize(srcPng, 192, 192, bg)
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), encodePNG(pwa192))
console.log('OK: pwa-192x192.png')

const pwa512 = resize(srcPng, 512, 512, bg)
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), encodePNG(pwa512))
console.log('OK: pwa-512x512.png')

const apple180 = resize(srcPng, 180, 180, bg)
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), encodePNG(apple180))
console.log('OK: apple-touch-icon.png')

// Splash screen 1290x2796 (iPhone 14 Pro Max - maior tamanho recomendado pela Apple)
const splash = makeSplash(srcPng, 1290, 2796, bg)
fs.writeFileSync(path.join(outDir, 'splash.png'), encodePNG(splash))
console.log('OK: splash.png (1290x2796)')

console.log('Todos os icones e splash gerados a partir de fotos/Icone.png')
