import { getToken } from 'firebase/app-check'
import { auth, appCheck } from '../firebase'
import { NUTRITION_RESULT_ERROR, validarResultadoMacros, validarTextoAlimento } from './nutrition.js'

/**
 * calcularMacrosIA — análise de macros via backend seguro.
 *
 * A chave Gemini nunca é enviada ao navegador. O cliente envia apenas o
 * texto, o ID token do Firebase Auth e o token App Check para o backend.
 */

const FALLBACK = { nome: '', kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0, _erro: null }
const DEFAULT_WORKER_URL = 'https://akrgym-analisar-refeicao.akrgym-analisar-refeicao-worker.workers.dev'
const CLIENT_REQUEST_TIMEOUT_MS = 55_000

function functionUrl() {
  const workerUrl = String(import.meta.env.VITE_AI_BACKEND_URL || '').trim().replace(/\/$/, '')
  if (workerUrl) return workerUrl
  const configured = String(import.meta.env.VITE_FIREBASE_FUNCTIONS_URL || '').trim().replace(/\/$/, '')
  if (!configured) return DEFAULT_WORKER_URL
  return configured.endsWith('/analisarRefeicao') ? configured : `${configured}/analisarRefeicao`
}

export async function calcularMacrosIA(textoAlimentos) {
  const texto = typeof textoAlimentos === 'string' ? textoAlimentos.trim() : ''
  const erroDeEntrada = validarTextoAlimento(texto)
  if (erroDeEntrada) return { ...FALLBACK, nome: texto, _erro: erroDeEntrada }

  const usuario = auth.currentUser
  if (!usuario) return { ...FALLBACK, nome: texto, _erro: 'Sua sessão expirou. Entre novamente para usar a análise por IA.' }
  if (!appCheck) return { ...FALLBACK, nome: texto, _erro: 'A proteção da IA ainda não está configurada neste ambiente.' }

  try {
    const [idToken, appCheckToken] = await Promise.all([
      usuario.getIdToken(),
      getToken(appCheck, false),
    ])
    if (!appCheckToken?.token) throw new Error('Token App Check ausente')

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), CLIENT_REQUEST_TIMEOUT_MS)
    let response
    try {
      response = await fetch(functionUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
          'X-Firebase-AppCheck': appCheckToken.token,
        },
        body: JSON.stringify({ textoAlimentos: texto }),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }
    const payload = await response.json().catch(() => ({}))
    if (response.status === 429) {
      return {
        ...FALLBACK,
        nome: texto,
        _erro: payload._erro || 'Limite da API de IA atingido. Aguarde a renovação da cota e tente novamente.',
      }
    }
    if (!response.ok) throw new Error(payload._erro || `Serviço de IA indisponível (${response.status})`)

    const parsed = {
      valido: true,
      kcal: Number(payload.kcal),
      p: Number(payload.proteinas),
      c: Number(payload.carboidratos),
      g: Number(payload.gorduras),
      fibras: Number(payload.fibras ?? 0),
    }
    const erroNutricional = validarResultadoMacros(parsed)
    if (erroNutricional) return { ...FALLBACK, nome: texto, _erro: erroNutricional }

    return {
      nome: texto,
      kcal: Math.round(parsed.kcal),
      proteinas: Math.round(parsed.p),
      carboidratos: Math.round(parsed.c),
      gorduras: Math.round(parsed.g),
      fibras: Math.round(parsed.fibras),
    }
  } catch (err) {
    if (err instanceof TypeError && /Failed to fetch|NetworkError|Load failed/i.test(err.message || '')) {
      return {
        ...FALLBACK,
        nome: texto,
        _erro: 'Não foi possível conectar ao backend da IA. Verifique se a Cloud Function ou o Worker está publicado e configurado para este ambiente.',
      }
    }
    if (err?.code?.startsWith('appCheck/') || /App Check|app check/i.test(err?.message || '')) {
      const detalhe = import.meta.env.DEV
        ? ' Confirme que a API Firebase App Check está ativada no projeto e que o token de debug está cadastrado no app Web.'
        : ' Confirme a configuração do App Check no projeto Firebase.'
      return { ...FALLBACK, nome: texto, _erro: `A proteção da IA não autorizou este ambiente.${detalhe}` }
    }
    const mensagem = err.message === NUTRITION_RESULT_ERROR
      ? err.message
      : `IA indisponível: ${err.message}. Use o formulário manual.`
    return { ...FALLBACK, nome: texto, _erro: mensagem }
  }
}
