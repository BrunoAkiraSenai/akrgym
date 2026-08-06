/**
 * Validação de input no cliente — limites de tamanho e tipo.
 *
 * Defesa em profundidade: o backend (Firestore rules + Cloud Function)
 * também valida. Esta camada existe para:
 *  - dar feedback rápido ao usuário
 *  - evitar queries e escritas desnecessárias
 *  - impedir envio de payloads absurdos
 *
 * NUNCA confiar que o frontend será sempre usado.
 */

const LIMITS = {
  nome: 80,
  horario: 5,           // HH:MM
  texto: 1000,
  textoIA: 500,         // limite da Cloud Function
  carga: 999,
  reps: 999,
  kcal: 9999,
  proteinas: 999,
  carboidratos: 999,
  gorduras: 999,
  peso: 500,
  medidaCm: 200,
  medidaCmPequena: 100,  // braço, coxa
  nota: 500,
  metaReps: 20,
}

/**
 * Trunca uma string em N caracteres. Retorna a string original se for menor.
 * Não adiciona '…' (decisão consciente: evitar poluir dados salvos).
 */
export function truncar(s, max) {
  if (typeof s !== 'string') return s
  return s.length > max ? s.slice(0, max) : s
}

/**
 * Parse seguro de float. Aceita vírgula como separador decimal.
 * Retorna NaN se inválido (deixe o caller decidir o que fazer).
 */
export function parseNumero(v) {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return NaN
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

/**
 * Sanitiza string removendo caracteres de controle (mantém \n e \t).
 * Não é uma sanitização XSS completa (React já escapa). Serve para evitar
 * payloads com bytes nulos ou caracteres invisíveis que poluam logs.
 */
export function sanitizarTexto(s) {
  if (typeof s !== 'string') return ''
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
}

export { LIMITS }
