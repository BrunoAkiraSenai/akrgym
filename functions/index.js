/**
 * analisarRefeicao — Cloud Function HTTPS.
 *
 * Faz proxy da chamada à API Gemini. A chave nunca é exposta ao frontend.
 *
 * Proteções implementadas (conforme spec de segurança do AkrGym):
 *  - Autenticação obrigatória (Firebase Auth)
 *  - Verificação do UID contra o token (sem injeção de UID arbitrário)
 *  - App Check (reCAPTCHA Enterprise) — bloqueia tráfego de origem não confiável
 *  - Validação rigorosa do payload (apenas { textoAlimentos: string })
 *  - Limites de tamanho do texto
 *  - Rate limit em memória: 10 req/min por UID, 1 req ativa por UID
 *  - Timeout da chamada ao Gemini (15s)
 *  - Sanitização da resposta (apenas os 5 campos esperados)
 *  - Erros genéricos para o cliente; detalhes apenas em log do servidor
 *  - CORS restrito a https://akrgym.web.app (e domínios de preview/hosting)
 *
 * Segredo (chave Gemini) é lido via Firebase Functions Secrets:
 *   firebase functions:secrets:set GEMINI_API_KEY
 * (NÃO colocar em .env nem em functions.config(). — SecretsManager + runtime
 *  em memória, com criptografia em repouso e auditoria no IAM.)
 *
 * Deploy:
 *   firebase deploy --only functions
 *
 * Pré-requisitos manuais (uma vez, no Console do Firebase):
 *  1. Plano Blaze ativado (pay-as-you-go — uso pessoal é ~$0)
 *  2. App Check ativado com provedor reCAPTCHA Enterprise
 *  3. Domínio akrgym.web.app registrado no reCAPTCHA
 *  4. functions:secrets:set GEMINI_API_KEY="..."
 *  5. functions:secrets:set ALLOWED_ORIGINS='["https://akrgym.web.app"]'
 *     (opcional — defaults abaixo cobrem o caso comum)
 */

const { onRequest } = require('firebase-functions/v2/https')
const { setGlobalOptions } = require('firebase-functions/v2')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getAppCheck } = require('firebase-admin/app-check')

try {
  initializeApp()
} catch (_) {
  // já inicializado em hot-reload
}

// Limites por região / runtime
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
  timeoutSeconds: 30,
  memory: '256MiB',
})

// Segredos (carregados do Secret Manager e expostos como env em runtime)
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY')
const ALLOWED_ORIGINS = defineSecret('ALLOWED_ORIGINS') // JSON array como string

// Constantes de proteção
const MODEL_NAME = 'gemini-2.5-flash'
const TEXT_MAX_CHARS = 500
const TEXT_MIN_CHARS = 3
const RATE_LIMIT_PER_MIN = 10
const ACTIVE_REQUEST_TIMEOUT_MS = 15_000

// Rate limit em memória (por UID). Simples e suficiente para um app pessoal.
// Em escala, migrar para Firestore com TTL ou Cloud Memorystore.
const buckets = new Map() // uid -> { windowStart, count, active }
const activeRequests = new Map() // uid -> timestamp

function checkAndIncrementRate(uid) {
  const now = Date.now()
  const bucket = buckets.get(uid) || { windowStart: now, count: 0, active: false }
  if (now - bucket.windowStart > 60_000) {
    bucket.windowStart = now
    bucket.count = 0
  }
  if (bucket.active) return { ok: false, reason: 'Já existe uma requisição em andamento para este usuário.' }
  if (bucket.count >= RATE_LIMIT_PER_MIN) return { ok: false, reason: 'Limite de requisições por minuto atingido.' }
  bucket.count += 1
  buckets.set(uid, bucket)
  return { ok: true }
}

function markActive(uid) {
  const bucket = buckets.get(uid)
  if (bucket) bucket.active = true
}
function markInactive(uid) {
  const bucket = buckets.get(uid)
  if (bucket) bucket.active = false
}

function corsHeaders(origin) {
  const headers = {
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Firebase-AppCheck',
    'Access-Control-Max-Age': '3600',
  }
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  return headers
}

function getAllowedOrigin(req) {
  // Lista padrão segura; pode ser sobrescrita via secret ALLOWED_ORIGINS
  let allowed = ['https://akrgym.web.app', 'https://akrgym--dev-*.web.app']
  try {
    const raw = ALLOWED_ORIGINS.value()
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) allowed = parsed
    }
  } catch (_) { /* usa default */ }

  const origin = req.headers.origin || ''
  if (allowed.includes(origin)) return origin
  // Casa de teste local (desenvolvimento) — sem origin ou localhost
  if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
    return origin || '*'
  }
  return null
}

const PROMPT = `Você é um assistente de nutrição focado estritamente em alimentos do Brasil.
Use como referência prioritária as tabelas TACO (Unicamp) e TBCA (USP).
Estime porções típicas de restaurantes brasileiros quando relevante.
Responda SOMENTE com um objeto JSON puro (sem markdown, sem texto extra), exatamente neste formato:
{ "kcal": number, "p": number, "c": number, "g": number }
Todos os valores devem ser inteiros.`

const FALLBACK = { nome: '', kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
const FALLBACK_ERR = { ...FALLBACK, _erro: 'Não foi possível analisar a refeição agora. Tente novamente em alguns minutos.' }

function clientError(res, status, msg, origin) {
  res.set(corsHeaders(origin))
  res.status(status).json({ _erro: msg })
}

function validarPayload(body) {
  if (!body || typeof body !== 'object') return 'Corpo da requisição inválido.'
  const keys = Object.keys(body)
  // aceita SOMENTE { textoAlimentos }. Bloqueia qualquer campo extra (XSS, injecção de config).
  if (keys.length !== 1 || keys[0] !== 'textoAlimentos') return 'Campo "textoAlimentos" ausente ou inválido.'
  const t = body.textoAlimentos
  if (typeof t !== 'string') return '"textoAlimentos" deve ser uma string.'
  const trimmed = t.trim()
  if (trimmed.length < TEXT_MIN_CHARS) return `Descrição muito curta (mínimo ${TEXT_MIN_CHARS} caracteres).`
  if (trimmed.length > TEXT_MAX_CHARS) return `Descrição muito longa (máximo ${TEXT_MAX_CHARS} caracteres).`
  return null
}

function sanitize(parsed, originalText) {
  // Aceita APENAS os 4 campos numéricos esperados. Tudo mais é descartado.
  const k = Number(parsed.kcal)
  const p = Number(parsed.p)
  const c = Number(parsed.c)
  const g = Number(parsed.g)
  if (![k, p, c, g].every(Number.isFinite)) return null
  if (k < 0 || p < 0 || c < 0 || g < 0) return null
  if (k > 9999 || p > 999 || c > 999 || g > 999) return null
  return {
    nome: originalText.trim(),
    kcal: Math.round(k),
    proteinas: Math.round(p),
    carboidratos: Math.round(c),
    gorduras: Math.round(g),
  }
}

exports.analisarRefeicao = onRequest(
  {
    secrets: [GEMINI_API_KEY, ALLOWED_ORIGINS],
    cors: false, // controlado manualmente
    timeoutSeconds: 30,
  },
  async (req, res) => {
    const origin = getAllowedOrigin(req)
    const allowedOrigin = corsHeaders(origin)

    // CORS preflight
    if (req.method === 'OPTIONS') {
      res.set(allowedOrigin)
      res.status(204).send('')
      return
    }

    if (req.method !== 'POST') {
      res.set(allowedOrigin)
      res.status(405).json({ _erro: 'Método não permitido.' })
      return
    }

    res.set(allowedOrigin)

    // 1. Autenticação
    const authHeader = req.headers.authorization || ''
    const match = /^Bearer (.+)$/.exec(authHeader)
    if (!match) {
      clientError(res, 401, 'Autenticação obrigatória.', origin)
      return
    }
    const idToken = match[1]
    let decoded
    try {
      decoded = await getAuth().verifyIdToken(idToken, true)
    } catch (e) {
      // Loga apenas o código de erro, não o token
      console.warn('Falha ao verificar ID token:', e?.code || 'unknown')
      clientError(res, 401, 'Sessão inválida.', origin)
      return
    }
    const uid = decoded.uid
    if (!uid) {
      clientError(res, 401, 'UID ausente no token.', origin)
      return
    }

    // 2. App Check (reCAPTCHA Enterprise) — em modo strict, token ausente = bloqueia
    const appCheckToken = req.headers['x-firebase-appcheck']
    if (!appCheckToken) {
      clientError(res, 403, 'App Check ausente. Recarregue a página.', origin)
      return
    }
    try {
      await getAppCheck().verifyToken(appCheckToken, { ttlMillis: 60_000 })
    } catch (e) {
      console.warn('App Check falhou:', e?.code || 'unknown', 'uid:', uid)
      clientError(res, 403, 'Verificação de origem falhou.', origin)
      return
    }

    // 3. Validação de payload
    const payloadErr = validarPayload(req.body)
    if (payloadErr) {
      clientError(res, 400, payloadErr, origin)
      return
    }
    const texto = req.body.textoAlimentos.trim()

    // 4. Rate limit
    const rl = checkAndIncrementRate(uid)
    if (!rl.ok) {
      res.set(allowedOrigin)
      res.status(429).json({ _erro: rl.reason })
      return
    }
    markActive(uid)

    // 5. Timeout da chamada externa
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), ACTIVE_REQUEST_TIMEOUT_MS)

    try {
      const apiKey = GEMINI_API_KEY.value()
      if (!apiKey) {
        console.error('GEMINI_API_KEY não configurada (functions:secrets:set GEMINI_API_KEY)')
        clientError(res, 503, 'Serviço de IA temporariamente indisponível.', origin)
        return
      }

      // Import dinâmico para evitar que o cold start falhe se a dep não estiver instalada
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({
        model: MODEL_NAME,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 200,
        },
      })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nRefeição: "${texto}"` }] }],
      }, { signal: controller.signal })

      clearTimeout(timer)

      const raw = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text
      if (!raw) throw new Error('Resposta vazia da IA.')

      // Extrai JSON da resposta (caso venha com texto extra ou code fences)
      const matchJson = raw.match(/\{[\s\S]*\}/)
      if (!matchJson) throw new Error('Resposta sem JSON válido.')
      const parsed = JSON.parse(matchJson[0])
      const sanitized = sanitize(parsed, texto)
      if (!sanitized) throw new Error('Resposta fora do formato esperado.')

      res.set(allowedOrigin)
      res.status(200).json(sanitized)
    } catch (err) {
      clearTimeout(timer)
      // Log mínimo do servidor (sem texto do usuário, sem chave)
      const isAbort = err?.name === 'AbortError'
      console.warn('analisarRefeicao erro:', isAbort ? 'timeout' : (err?.message || 'unknown'), 'uid:', uid)
      res.set(allowedOrigin)
      res.status(isAbort ? 504 : 502).json(FALLBACK_ERR)
    } finally {
      markInactive(uid)
    }
  }
)
