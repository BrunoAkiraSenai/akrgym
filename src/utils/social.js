// Regras puras do recurso de amigos. O que é compartilhado é só o resultado
// dos dias de dieta (dentro da meta ou não), nunca refeições ou calorias.
import { classificarDiaPorCalorias, DIET_DAY_STATUS } from './dietDiary.js'

// Sem 0/O e 1/I/L: o código é ditado e digitado entre pessoas.
export const CODIGO_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const CODIGO_TAMANHO = 8
export const NOME_PERFIL_MAX = 40
export const FOTO_PERFIL_MAX_CHARS = 60000
export const LIMITE_AMIGOS = 50
export const JANELA_DIAS = 30

export const DIA_SOCIAL = Object.freeze({ OK: 'ok', FORA: 'fora', VAZIO: 'vazio' })

export function gerarCodigoAmizade(bytesAleatorios = tamanho => crypto.getRandomValues(new Uint8Array(tamanho))) {
  const limite = 256 - (256 % CODIGO_ALFABETO.length)
  let codigo = ''
  while (codigo.length < CODIGO_TAMANHO) {
    for (const byte of bytesAleatorios(CODIGO_TAMANHO * 2)) {
      // Descarta o resto para não favorecer as primeiras letras do alfabeto.
      if (byte >= limite) continue
      codigo += CODIGO_ALFABETO[byte % CODIGO_ALFABETO.length]
      if (codigo.length === CODIGO_TAMANHO) break
    }
  }
  return codigo
}

export function normalizarCodigoAmizade(texto) {
  return String(texto ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function codigoAmizadeValido(codigo) {
  return typeof codigo === 'string' && codigo.length === CODIGO_TAMANHO && [...codigo].every(letra => CODIGO_ALFABETO.includes(letra))
}

export function formatarCodigoAmizade(codigo) {
  const limpo = normalizarCodigoAmizade(codigo)
  return limpo.length > 4 ? `${limpo.slice(0, 4)}-${limpo.slice(4)}` : limpo
}

// O mesmo par de pessoas sempre resulta no mesmo documento de amizade.
export function idAmizade(primeiroUid, segundoUid) {
  return primeiroUid < segundoUid ? `${primeiroUid}_${segundoUid}` : `${segundoUid}_${primeiroUid}`
}

export function limparNomePerfil(nome) {
  return Array.from(String(nome ?? ''))
    .filter(letra => letra.codePointAt(0) >= 32 && letra.codePointAt(0) !== 127)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NOME_PERFIL_MAX)
}

export function iniciaisPerfil(nome) {
  const palavras = limparNomePerfil(nome).split(' ').filter(Boolean)
  if (!palavras.length) return '?'
  const letras = palavras.length === 1 ? Array.from(palavras[0]).slice(0, 2) : [Array.from(palavras[0])[0], Array.from(palavras.at(-1))[0]]
  return letras.join('').toLocaleUpperCase('pt-BR')
}

export function dataLocalId(data = new Date()) {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

export function deslocarDia(dataId, dias) {
  const data = new Date(`${dataId}T12:00:00Z`)
  data.setUTCDate(data.getUTCDate() + dias)
  return data.toISOString().slice(0, 10)
}

function statusSocial(dia, plano, metaKcal) {
  const { status } = classificarDiaPorCalorias(dia, plano, metaKcal)
  if (status === DIET_DAY_STATUS.COMPLETE) return DIA_SOCIAL.OK
  return status === DIET_DAY_STATUS.OUT_OF_PLAN ? DIA_SOCIAL.FORA : DIA_SOCIAL.VAZIO
}

/**
 * Resume os últimos 30 dias em números que podem ser mostrados a amigos.
 * `diasPorData` é um objeto { 'YYYY-MM-DD': documento do diário }.
 */
export function resumoDieta(diasPorData, plano, metaKcal, hojeId) {
  const status = dataId => statusSocial(diasPorData?.[dataId], plano, metaKcal)
  let acertos30 = 0
  for (let i = 0; i < JANELA_DIAS; i++) if (status(deslocarDia(hojeId, -i)) === DIA_SOCIAL.OK) acertos30++

  // O dia de hoje ainda está em aberto: sem registro, a sequência conta até ontem.
  let cursor = status(hojeId) === DIA_SOCIAL.OK ? hojeId : deslocarDia(hojeId, -1)
  let sequencia = 0
  while (sequencia < JANELA_DIAS && status(cursor) === DIA_SOCIAL.OK) {
    sequencia++
    cursor = deslocarDia(cursor, -1)
  }

  const ultimos7 = Array.from({ length: 7 }, (_, i) => status(deslocarDia(hojeId, i - 6)))
  return { sequencia, acertos30, ultimos7, ate: hojeId }
}

export function resumoValido(resumo) {
  return Boolean(resumo)
    && Number.isInteger(resumo.sequencia) && resumo.sequencia >= 0 && resumo.sequencia <= JANELA_DIAS
    && Number.isInteger(resumo.acertos30) && resumo.acertos30 >= 0 && resumo.acertos30 <= JANELA_DIAS
    && Array.isArray(resumo.ultimos7) && resumo.ultimos7.length === 7
    && resumo.ultimos7.every(item => Object.values(DIA_SOCIAL).includes(item))
    && /^\d{4}-\d{2}-\d{2}$/.test(String(resumo.ate || ''))
}

// O resumo só muda quando a pessoa abre o app. Se ela sumiu por dois dias ou
// mais, os dias sem registro já quebraram a sequência.
export function sequenciaVigente(resumo, hojeId) {
  if (!resumoValido(resumo)) return 0
  return resumo.ate >= deslocarDia(hojeId, -1) ? resumo.sequencia : 0
}

export function ordenarRanking(pessoas, hojeId) {
  return [...pessoas].sort((a, b) => (
    sequenciaVigente(b.resumo, hojeId) - sequenciaVigente(a.resumo, hojeId)
    || (b.resumo?.acertos30 || 0) - (a.resumo?.acertos30 || 0)
    || String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR')
  ))
}
