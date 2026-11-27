// Roda o primeiro script de cada página como o navegador rodaria, com
// endereço e armazenamento falsos, e confere para onde a pessoa vai.
import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import { readFileSync } from 'node:fs'

const ler = arquivo => readFileSync(new URL(`../${arquivo}`, import.meta.url), 'utf8')

function destino(arquivo, host, dados = {}, caminho = '/') {
  const script = ler(arquivo).match(/<script>([\s\S]*?)<\/script>/)[1]
  let indo = null
  const localStorage = { getItem: k => dados[k] ?? null }
  // Object.keys(localStorage) no navegador lista as chaves guardadas.
  for (const [k, v] of Object.entries(dados)) Object.defineProperty(localStorage, k, { value: v, enumerable: true })
  Object.defineProperty(localStorage, 'getItem', { enumerable: false })
  vm.runInNewContext(script, { localStorage, location: { hostname: host, pathname: caminho, search: '', hash: '', replace: u => { indo = u } } })
  return indo
}

const RASCUNHO = { 'rascunho_treino_abc': '{}' }

for (const host of ['akrgym.web.app', 'akrgym.firebaseapp.com']) {
  test(`${host}: app e página inicial vão para akrgym.com, com ou sem uso anterior`, () => {
    assert.equal(destino('app.html', host, {}, '/app'), 'https://akrgym.com/app')
    assert.equal(destino('app.html', host, { 'akrgym-app': '1' }, '/app'), 'https://akrgym.com/app')
    assert.equal(destino('index.html', host), 'https://akrgym.com/')
    assert.equal(destino('index.html', host, { 'akrgym-app': '1' }), 'https://akrgym.com/')
  })

  test(`${host}: treino em andamento segura a pessoa no endereço antigo`, () => {
    assert.equal(destino('app.html', host, { ...RASCUNHO, 'akrgym-app': '1' }, '/app'), null)
    assert.equal(destino('index.html', host, { ...RASCUNHO, 'akrgym-app': '1' }), '/app')
  })
}

test('no domínio novo e no localhost nada é redirecionado para fora', () => {
  for (const host of ['akrgym.com', 'www.akrgym.com', '127.0.0.1', 'localhost']) {
    assert.equal(destino('app.html', host, {}, '/app'), null)
    assert.equal(destino('index.html', host), null)
    assert.equal(destino('index.html', host, { 'akrgym-theme': 'lava' }), '/app')
  }
})
