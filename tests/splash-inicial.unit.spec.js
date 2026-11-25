import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { THEMES } from '../src/utils/themes.js'

const html = readFileSync(new URL('../app.html', import.meta.url), 'utf8')

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
}

test('cores da abertura em app.html acompanham os temas do app', () => {
  const match = html.match(/var cores = (\{.*?\});/)
  assert.ok(match, 'app.html deve declarar o mapa de cores da abertura')
  const cores = JSON.parse(match[1])
  assert.deepEqual(Object.keys(cores).sort(), THEMES.map((t) => t.id).sort())
  for (const tema of THEMES) {
    assert.deepEqual(
      cores[tema.id],
      [tema.bgDeep, tema.textPrimary || '#ffffff', tema.textSecondary || '#a89db5', rgb(tema.brand[500])],
      `cores do tema ${tema.id}`,
    )
  }
})

test('abertura aparece no HTML antes do JavaScript', () => {
  const root = html.match(/<div id="root">([\s\S]*?)<\/div>\s*<(?:script|noscript)>/)
  assert.ok(root, 'app.html deve ter #root antes dos scripts finais')
  assert.match(root[1], /class="startup-splash"/)
  assert.match(root[1], /__akrSplashT0/)
  assert.doesNotMatch(html, /fonts\.googleapis\.com/, 'fontes vêm do próprio site')
  // Se o app não carregar, a abertura do HTML oferece recarregar.
  assert.match(root[1], /data-estatico="true"/)
  assert.match(html, /Não foi possível abrir o AkrGym[\s\S]*location\.reload\(\)/)
})
