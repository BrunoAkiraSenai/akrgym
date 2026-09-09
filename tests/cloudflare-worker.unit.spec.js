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
  assert.match(worker, /parsed\.fibras/)
  assert.match(worker, /typeof value === 'number'/)
  assert.match(worker, /JWKS_TIMEOUT_MS = 8_000/)
})

test('frontend aceita o Worker sem remover o fallback da Cloud Function', () => {
  const cliente = read('src/utils/gemini.js')
  assert.match(cliente, /VITE_AI_BACKEND_URL/)
  assert.match(cliente, /VITE_FIREBASE_FUNCTIONS_URL/)
  assert.match(cliente, /X-Firebase-AppCheck/)
})
