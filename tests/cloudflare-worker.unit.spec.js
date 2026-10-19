import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('Worker mantém a chave Gemini no ambiente e valida os tokens Firebase', () => {
  const worker = read('cloudflare-worker/analisar-refeicao/src/index.js')
  assert.match(worker, /env\.GEMINI_API_KEY/)
  assert.match(worker, /securetoken@system\.gserviceaccount\.com/)
  assert.match(worker, /firebaseappcheck\.googleapis\.com\/v1\/jwks/)
  assert.match(worker, /verifyAuthToken/)
  assert.match(worker, /verifyAppCheckToken/)
  assert.match(worker, /RATE_LIMIT_PER_MINUTE = 10/)
  assert.doesNotMatch(worker, /AIzaSy[A-Za-z0-9_-]{20,}/)
  assert.match(worker, /responseSchema: RESPONSE_SCHEMA/)
  assert.match(worker, /resolverItens\(parsed, indice\)/)
  assert.match(worker, /JWKS_TIMEOUT_MS = 8_000/)
})

test('Worker devolve totais no formato antigo e o detalhe por item', async () => {
  const { sanitizeModelResponse } = await import('../cloudflare-worker/analisar-refeicao/src/index.js')
  const resposta = JSON.stringify({ valido: true, itens: [{ alimento: 'feijao carioca', estado: 'cozido', estado_informado: true, gramas: 100, gramas_estimadas: false, kcal: 90, p: 6, c: 15, g: 1, fibras: 7 }] })
  const { result } = sanitizeModelResponse(resposta, '100g de feijão cozido')
  assert.equal(result.nome, '100g de feijão cozido')
  assert.deepEqual([result.kcal, result.proteinas, result.carboidratos, result.gorduras, result.fibras], [76, 5, 14, 1, 9])
  assert.equal(result.itens[0].fonte, 'taco')
  assert.deepEqual(sanitizeModelResponse('texto sem json', 'x'), { motivo: 'formato' })
})

test('frontend aceita o Worker sem remover o fallback da Cloud Function', () => {
  const cliente = read('src/utils/gemini.js')
  assert.match(cliente, /VITE_AI_BACKEND_URL/)
  assert.match(cliente, /VITE_FIREBASE_FUNCTIONS_URL/)
  assert.match(cliente, /X-Firebase-AppCheck/)
})

test('Worker estima alimentos estrangeiros e de restaurante e explica cada recusa', () => {
  const worker = read('cloudflare-worker/analisar-refeicao/src/index.js')
  assert.doesNotMatch(worker, /estritamente em alimentos do Brasil/)
  assert.match(worker, /brasileiros ou internacionais/)
  // O estado escrito pela pessoa manda (era o erro da fraldinha crua lida como cozida).
  assert.match(worker, /O estado escrito pela pessoa é obrigatório/)
  assert.match(worker, /NÃO é motivo para rejeitar/)
  const nutricao = read('cloudflare-worker/analisar-refeicao/src/nutricao.js')
  for (const motivo of ['nao_alimento', 'formato', 'limite']) {
    assert.match(worker, new RegExp(`${motivo}: '`))
    assert.match(nutricao, new RegExp(`motivo: '${motivo}'`))
  }
  // A descrição da refeição não vai para o log, só o motivo.
  assert.match(worker, /console\.warn\('analisarRefeicao recusado:', motivo\)/)
  assert.match(read('src/utils/gemini.js'), /response\.status === 422/)
})
