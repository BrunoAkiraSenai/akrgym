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

// ===== Calendário compartilhado =====
// Um documento por mês: { 'DD': 'ok' } para dia dentro da meta ou
// { 'DD': diferença em kcal } para dia fora (positivo = acima). Dia sem
// registro não é gravado. Refeições e totais continuam privados.
export const DELTA_KCAL_MAX = 20000

export function mesId(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

export function deslocarMes(ano, mes, delta) {
  const indice = ano * 12 + (mes - 1) + delta
  return { ano: Math.floor(indice / 12), mes: (indice % 12 + 12) % 12 + 1 }
}

function ultimoDia(ano, mes) {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate()
}

export function calendarioMes(diasPorData, plano, metaKcal, ano, mes, hojeId) {
  const dias = {}
  for (let dia = 1; dia <= ultimoDia(ano, mes); dia++) {
    const chave = String(dia).padStart(2, '0')
    const dataId = `${mesId(ano, mes)}-${chave}`
    if (dataId > hojeId) break
    const { status, kcal, metaKcal: meta } = classificarDiaPorCalorias(diasPorData?.[dataId], plano, metaKcal)
    if (status === DIET_DAY_STATUS.COMPLETE) dias[chave] = 'ok'
    else if (status === DIET_DAY_STATUS.OUT_OF_PLAN) {
      // Mesmo arredondamento do calendário pessoal: nunca volta para dentro da tolerância.
      const diferenca = Math.min(DELTA_KCAL_MAX, Math.max(1, Math.ceil(Math.abs(kcal - meta))))
      dias[chave] = kcal > meta ? diferenca : -diferenca
    }
  }
  return dias
}

export function calendarioValido(dias) {
  return Boolean(dias) && typeof dias === 'object' && !Array.isArray(dias)
    && Object.entries(dias).every(([chave, valor]) => /^(0[1-9]|[12][0-9]|3[01])$/.test(chave)
      && (valor === 'ok' || (Number.isInteger(valor) && valor !== 0 && Math.abs(valor) <= DELTA_KCAL_MAX)))
}

// Linhas prontas para desenhar o mês, com os mesmos textos do calendário pessoal.
export function diasDoCalendario(dias, ano, mes, hojeId) {
  const seguro = calendarioValido(dias) ? dias : {}
  return Array.from({ length: ultimoDia(ano, mes) }, (_, indice) => {
    const dia = indice + 1
    const data = `${mesId(ano, mes)}-${String(dia).padStart(2, '0')}`
    const valor = seguro[String(dia).padStart(2, '0')]
    if (data > hojeId) return { dia, data, futuro: true, status: 'futuro', comentario: '', comentarioCompacto: '', detalhe: 'Dia futuro' }
    if (valor === 'ok') return { dia, data, futuro: false, status: DIET_DAY_STATUS.COMPLETE, comentario: 'Dentro do plano', comentarioCompacto: 'No plano', detalhe: 'Dentro do plano' }
    if (Number.isInteger(valor)) {
      const texto = `${Math.abs(valor).toLocaleString('pt-BR')} kcal ${valor > 0 ? 'acima' : 'abaixo'}`
      return { dia, data, futuro: false, status: DIET_DAY_STATUS.OUT_OF_PLAN, comentario: texto, comentarioCompacto: texto, detalhe: `${texto} da meta` }
    }
    return { dia, data, futuro: false, status: DIET_DAY_STATUS.EMPTY, comentario: 'Sem registro', comentarioCompacto: 'Sem dados', detalhe: 'Sem registro' }
  })
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
