import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')

test('frontend não contém SDK nem referências à chave Gemini', () => {
  const cliente = read('src/utils/gemini.js')
  const vite = read('vite.config.js')

  assert.doesNotMatch(cliente, /GoogleGenerativeAI|VITE_GEMINI_API_KEY|gemini_api_key/)
  assert.doesNotMatch(vite, /VITE_GEMINI_API_KEY|generative-ai/)
  assert.match(cliente, /X-Firebase-AppCheck/)
  assert.match(cliente, /Authorization: `Bearer/)
  assert.match(cliente, /fibras: Number\(payload\.fibras/)
})

test('produção exige site key do App Check e bloqueia token de debug', () => {
  const script = read('scripts/verify-production-env.mjs')
  assert.match(script, /VITE_RECAPTCHA_ENTERPRISE_SITE_KEY/)
  assert.match(script, /VITE_FIREBASE_APPCHECK_DEBUG/)
})

test('backend mantém o segredo Gemini fora do código do cliente', () => {
  const funcao = read('functions/index.js')
  assert.match(funcao, /defineSecret\('GEMINI_API_KEY'\)/)
  assert.match(funcao, /verifyToken\(appCheckToken/)
  assert.match(funcao, /Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-AppCheck'/)
  assert.match(funcao, /"fibras": number/)
})
