import test from 'node:test'
import assert from 'node:assert/strict'
import { callGemini } from '../cloudflare-worker/analisar-refeicao/src/index.js'

// Google falso: devolve, em ordem, os status pedidos e registra o modelo de cada chamada.
function googleFalso(respostas) {
  const modelos = []
  const fetcher = async (url) => {
    modelos.push(url.match(/models\/([^:]+):/)[1])
    const r = respostas.shift()
    if (r === 'rede') throw new TypeError('fetch failed')
    const ok = r === 200
    return { ok, status: r, json: async () => ({ candidates: [{ content: { parts: [{ text: '{"itens":[]}' }] } }] }) }
  }
  return { fetcher, modelos }
}
const semEspera = async () => {}
const quieto = () => { const w = console.warn; console.warn = () => {}; return () => { console.warn = w } }

test('sobrecarga (503) seguida de sucesso: tenta de novo e responde', async () => {
  const volta = quieto()
  const g = googleFalso([503, 200])
  assert.equal(await callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), '{"itens":[]}')
  volta()
  assert.deepEqual(g.modelos, ['gemini-2.5-flash-lite', 'gemini-2.5-flash-lite'])
})

test('principal sobrecarregado duas vezes: usa o modelo reserva', async () => {
  const volta = quieto()
  const g = googleFalso([503, 503, 200])
  assert.equal(await callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), '{"itens":[]}')
  volta()
  assert.deepEqual(g.modelos, ['gemini-2.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'])
})

test('tudo sobrecarregado: desiste depois de 3 tentativas com o erro do Google', async () => {
  const volta = quieto()
  const g = googleFalso([503, 503, 503, 200])
  await assert.rejects(callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), e => e.status === 503)
  volta()
  assert.equal(g.modelos.length, 3)
})

test('sem cota (429): não repete o mesmo modelo, vai direto ao reserva', async () => {
  const volta = quieto()
  const g = googleFalso([429, 200])
  assert.equal(await callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), '{"itens":[]}')
  volta()
  assert.deepEqual(g.modelos, ['gemini-2.5-flash-lite', 'gemini-2.5-flash'])
})

test('erro do pedido (400) não se repete', async () => {
  const volta = quieto()
  const g = googleFalso([400, 200])
  await assert.rejects(callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), e => e.status === 400)
  volta()
  assert.equal(g.modelos.length, 1)
})

test('falha de rede também tenta de novo', async () => {
  const volta = quieto()
  const g = googleFalso(['rede', 200])
  assert.equal(await callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: semEspera }), '{"itens":[]}')
  volta()
  assert.equal(g.modelos.length, 2)
})

test('espera um pouco antes de repetir o mesmo modelo', async () => {
  const volta = quieto()
  const pausas = []
  const g = googleFalso([503, 503, 200])
  await callGemini('arroz', 'k', { fetcher: g.fetcher, aguardar: async ms => { pausas.push(ms) } })
  volta()
  assert.deepEqual(pausas, [700])
})
