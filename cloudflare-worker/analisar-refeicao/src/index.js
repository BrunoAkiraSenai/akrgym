const DEFAULT_PROJECT_ID = 'akrgym'
const DEFAULT_PROJECT_NUMBER = '272661727889'
const DEFAULT_APP_ID = '1:272661727889:web:532c4b51c35afa28d64d30'
const MODEL_NAME = 'gemini-2.5-flash'
const AUTH_JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
const APP_CHECK_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks'
const MAX_TEXT_CHARS = 500
const MIN_TEXT_CHARS = 3
const MAX_BODY_BYTES = 8_192
const RATE_LIMIT_PER_MINUTE = 10
const RATE_BUCKET_TTL_MS = 10 * 60 * 1_000
const MAX_RATE_BUCKETS = 5_000
const REQUEST_TIMEOUT_MS = 45_000
const JWKS_TIMEOUT_MS = 8_000

const NON_FOOD_TERMS = [
  'cadeira', 'gamer', 'mesa', 'computador', 'notebook', 'celular', 'telefone',
  'teclado', 'mouse', 'monitor', 'televisao', 'sofa', 'cama', 'carro', 'moto',
  'academia', 'treino', 'exercicio',
]
const FOOD_CONTEXT_TERMS = [
  'arroz', 'feijao', 'frango', 'carne', 'peixe', 'banana', 'sal', 'pao', 'aveia',
  'ovo', 'leite', 'queijo', 'iogurte', 'fruta', 'legume', 'verdura', 'comida',
  'refeicao', 'almoco', 'jantar', 'cafe', 'bebida', 'suco', 'creme', 'milho',
  'brocolis', 'batata', 'azeite', 'macarrao', 'prato',
]

const PROMPT = `Você é um assistente de nutrição focado estritamente em alimentos do Brasil.
Use como referência prioritária as tabelas TACO (Unicamp) e TBCA (USP).
Estime porções típicas de restaurantes brasileiros quando relevante.
Analise somente alimentos, bebidas ou ingredientes consumíveis. Objetos, móveis, eletrônicos, exercícios, serviços, pessoas e textos sem relação com alimentação devem ser rejeitados.
Responda SOMENTE com um objeto JSON puro (sem markdown, sem texto extra), exatamente neste formato:
Para entrada alimentar válida: { "valido": true, "kcal": number, "p": number, "c": number, "g": number, "fibras": number }
Para entrada inválida: { "valido": false, "kcal": 0, "p": 0, "c": 0, "g": 0, "fibras": 0 }
Todos os valores devem ser inteiros. "fibras" representa gramas de fibra alimentar estimadas. Nunca invente macros para entradas inválidas.`

const FALLBACK_ERROR = 'Não foi possível analisar a refeição agora. Tente novamente em alguns minutos.'
const rateBuckets = new Map()
const jwksCache = new Map()

function getConfig(env) {
  return {
    projectId: String(env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID),
    projectNumber: String(env.FIREBASE_PROJECT_NUMBER || DEFAULT_PROJECT_NUMBER),
    appId: String(env.FIREBASE_APP_ID || DEFAULT_APP_ID),
  }
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function decodeJsonPart(value) {
  return JSON.parse(new TextDecoder().decode(base64UrlToBytes(value)))
}

function parseJwt(token) {
  if (typeof token !== 'string' || token.length > 16_000) throw new Error('token inválido')
  const parts = token.split('.')
  if (parts.length !== 3) throw new Error('token inválido')
  const header = decodeJsonPart(parts[0])
  const payload = decodeJsonPart(parts[1])
  if (header.typ !== 'JWT' || header.alg !== 'RS256' || !header.kid) throw new Error('token inválido')
  return { header, payload, signingInput: new TextEncoder().encode(`${parts[0]}.${parts[1]}`), signature: base64UrlToBytes(parts[2]) }
}

async function loadJwks(url, forceRefresh = false) {
  const cached = jwksCache.get(url)
  if (!forceRefresh && cached && cached.expiresAt > Date.now()) return cached.keys

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), JWKS_TIMEOUT_MS)
  let response
  try {
    response = await fetch(url, { cf: { cacheTtl: 21_600, cacheEverything: true }, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
  if (!response.ok) throw new Error('chaves públicas indisponíveis')
  const body = await response.json()
  if (!Array.isArray(body.keys) || body.keys.length === 0) throw new Error('chaves públicas inválidas')
  jwksCache.set(url, { keys: body.keys, expiresAt: Date.now() + 6 * 60 * 60 * 1000 })
  return body.keys
}

async function verifyJwt(token, jwksUrl, claimsValidator) {
  const parsed = parseJwt(token)
  let keys = await loadJwks(jwksUrl)
  let jwk = keys.find((key) => key.kid === parsed.header.kid)
  if (!jwk) {
    keys = await loadJwks(jwksUrl, true)
    jwk = keys.find((key) => key.kid === parsed.header.kid)
  }
  if (!jwk) throw new Error('chave do token não encontrada')

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  )
  const validSignature = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    cryptoKey,
    parsed.signature,
    parsed.signingInput,
  )
  if (!validSignature || !claimsValidator(parsed.payload)) throw new Error('token inválido')
  return parsed.payload
}

function isFresh(payload) {
  const now = Math.floor(Date.now() / 1000)
  return Number.isFinite(payload.exp) && payload.exp > now && (!payload.iat || payload.iat <= now + 300)
}

function verifyAuthToken(token, projectId) {
  return verifyJwt(token, AUTH_JWKS_URL, (payload) => (
    payload.aud === projectId
    && payload.iss === `https://securetoken.google.com/${projectId}`
    && typeof payload.sub === 'string'
    && payload.sub.length > 0
    && isFresh(payload)
  ))
}

function verifyAppCheckToken(token, projectNumber, appId) {
  return verifyJwt(token, APP_CHECK_JWKS_URL, (payload) => (
    payload.iss === `https://firebaseappcheck.googleapis.com/${projectNumber}`
    && Array.isArray(payload.aud)
    && payload.aud.includes(`projects/${projectNumber}`)
    && payload.sub === appId
    && isFresh(payload)
  ))
}

function allowedOrigins(env) {
  return String(env.ALLOWED_ORIGINS || 'https://akrgym.web.app,https://akrgym.firebaseapp.com')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function getOrigin(request, env) {
  const origin = request.headers.get('Origin') || ''
  if (allowedOrigins(env).includes(origin)) return origin
  if (env.ALLOW_LOCAL_ORIGIN === 'true' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return origin
  return null
}

function corsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': origin || 'null',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Firebase-AppCheck',
    'Access-Control-Max-Age': '3600',
    Vary: 'Origin',
  }
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(origin),
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
    },
  })
}

async function readBodyText(request) {
  const contentLength = Number(request.headers.get('Content-Length'))
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    const error = new Error('payload muito grande')
    error.code = 'PAYLOAD_TOO_LARGE'
    throw error
  }

  const reader = request.body?.getReader()
  if (!reader) return request.text()

  const chunks = []
  let total = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > MAX_BODY_BYTES) {
        await reader.cancel()
        const error = new Error('payload muito grande')
        error.code = 'PAYLOAD_TOO_LARGE'
        throw error
      }
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(body)
}

function validateText(value) {
  if (typeof value !== 'string') return 'Descrição inválida.'
  const text = value.trim()
  if (text.length < MIN_TEXT_CHARS) return `Descrição muito curta (mínimo ${MIN_TEXT_CHARS} caracteres).`
  if (text.length > MAX_TEXT_CHARS) return `Descrição muito longa (máximo ${MAX_TEXT_CHARS} caracteres).`
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const hasFoodContext = FOOD_CONTEXT_TERMS.some((term) => normalized.includes(term))
  if (!hasFoodContext && NON_FOOD_TERMS.some((term) => new RegExp(`(^|[^a-z])${term}(?=[^a-z]|$)`).test(normalized))) {
    return 'Digite alimentos ou bebidas para calcular os macros.'
  }
  return null
}

function rateLimit(uid) {
  const now = Date.now()
  if (rateBuckets.size >= MAX_RATE_BUCKETS) {
    for (const [key, bucket] of rateBuckets) {
      if (!bucket.active && now - bucket.startedAt > RATE_BUCKET_TTL_MS) rateBuckets.delete(key)
      if (rateBuckets.size < MAX_RATE_BUCKETS) break
    }
  }
  if (rateBuckets.size >= MAX_RATE_BUCKETS && !rateBuckets.has(uid)) {
    return 'Serviço temporariamente ocupado. Tente novamente em instantes.'
  }
  const current = rateBuckets.get(uid) || { startedAt: now, count: 0, active: false }
  if (now - current.startedAt >= 60_000) {
    current.startedAt = now
    current.count = 0
  }
  if (current.active) return 'Já existe uma requisição em andamento para este usuário.'
  if (current.count >= RATE_LIMIT_PER_MINUTE) return 'Limite de requisições por minuto atingido.'
  current.count += 1
  current.active = true
  rateBuckets.set(uid, current)
  return null
}

function releaseRateLimit(uid) {
  const current = rateBuckets.get(uid)
  if (current) current.active = false
}

function sanitizeModelResponse(raw, originalText) {
  const match = String(raw || '').match(/\{[\s\S]*\}/)
  if (!match) return null
  let parsed
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return null
  }
  if (parsed?.valido !== true) return null
  const fields = [parsed.kcal, parsed.p, parsed.c, parsed.g, parsed.fibras]
  if (!fields.every((value) => typeof value === 'number' && Number.isFinite(value))) return null
  const values = fields
  if (!values.every(Number.isFinite) || values.some((value) => value < 0) || values.every((value) => value === 0)) return null
  if (values[0] > 9999 || values.slice(1).some((value) => value > 999)) return null
  return {
    nome: originalText,
    kcal: Math.round(values[0]),
    proteinas: Math.round(values[1]),
    carboidratos: Math.round(values[2]),
    gorduras: Math.round(values[3]),
    fibras: Math.round(values[4]),
  }
}

async function callGemini(text, apiKey) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nRefeição: "${text}"` }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 200,
          // A tarefa é uma extração curta; desativar o raciocínio evita que o
          // orçamento de saída seja consumido antes do JSON nutricional.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Gemini HTTP ${response.status}`)
    const body = await response.json()
    return body?.candidates?.[0]?.content?.parts?.[0]?.text
  } finally {
    clearTimeout(timeout)
  }
}

export default {
  async fetch(request, env) {
    const config = getConfig(env)
    const origin = getOrigin(request, env)
    if (request.method === 'OPTIONS') return new Response(null, { status: origin ? 204 : 403, headers: corsHeaders(origin) })
    if (!origin || request.method !== 'POST') return json({ _erro: 'Requisição não permitida.' }, origin ? 405 : 403, origin)

    const authMatch = /^Bearer\s+(.+)$/.exec(request.headers.get('Authorization') || '')
    const appCheckToken = request.headers.get('X-Firebase-AppCheck')
    if (!authMatch || !appCheckToken) return json({ _erro: 'Autenticação obrigatória.' }, 401, origin)

    let authPayload
    try {
      authPayload = await verifyAuthToken(authMatch[1], config.projectId)
      await verifyAppCheckToken(appCheckToken, config.projectNumber, config.appId)
    } catch {
      return json({ _erro: 'Sessão ou origem inválida.' }, 401, origin)
    }

    let body
    try {
      const contentType = request.headers.get('Content-Type') || ''
      if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
        return json({ _erro: 'Content-Type deve ser application/json.' }, 415, origin)
      }
      body = JSON.parse(await readBodyText(request))
    } catch (error) {
      if (error?.code === 'PAYLOAD_TOO_LARGE') return json({ _erro: 'Corpo da requisição muito grande.' }, 413, origin)
      return json({ _erro: 'Corpo da requisição inválido.' }, 400, origin)
    }
    if (!body || Object.keys(body).length !== 1 || !Object.prototype.hasOwnProperty.call(body, 'textoAlimentos')) {
      return json({ _erro: 'Campo "textoAlimentos" ausente ou inválido.' }, 400, origin)
    }
    const text = typeof body.textoAlimentos === 'string' ? body.textoAlimentos.trim() : ''
    const validationError = validateText(text)
    if (validationError) return json({ _erro: validationError }, 400, origin)
    if (!env.GEMINI_API_KEY) return json({ _erro: 'Serviço de IA temporariamente indisponível.' }, 503, origin)

    const rateError = rateLimit(authPayload.sub)
    if (rateError) return json({ _erro: rateError }, 429, origin)
    try {
      const result = sanitizeModelResponse(await callGemini(text, env.GEMINI_API_KEY), text)
      if (!result) return json({ _erro: 'Não reconheci alimentos nessa descrição. Revise o texto e tente novamente.' }, 422, origin)
      return json(result, 200, origin)
    } catch (error) {
      const detalheErro = error?.name === 'AbortError'
        ? 'timeout'
        : String(error?.message || 'upstream').slice(0, 160)
      console.warn('analisarRefeicao erro:', detalheErro)
      if (/^Gemini HTTP 429$/.test(String(error?.message || ''))) {
        return json({ _erro: 'Limite da API de IA atingido. Aguarde a renovação da cota e tente novamente.' }, 429, origin)
      }
      return json({ _erro: FALLBACK_ERROR }, error?.name === 'AbortError' ? 504 : 502, origin)
    } finally {
      releaseRateLimit(authPayload.sub)
    }
  },
}
