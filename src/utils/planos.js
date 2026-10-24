// Planos do AkrGym. Hoje todos estão no Grátis, com tudo liberado e sem limite.
// Para cobrar no futuro: ajustar recursos/limites aqui e gravar a assinatura em
// users/{uid}/conta/assinatura pelo servidor (o app não consegue escrever lá).

export const PLANO_PADRAO = 'gratis'

// null = sem limite.
export const PLANOS = {
  gratis: {
    id: 'gratis',
    nome: 'Grátis',
    descricao: 'Todos os recursos liberados.',
    recursos: { ia: true, amigos: true, evolucaoAvancada: true },
    limites: { iaPorDia: null, iaPorMes: null },
  },
  pro: {
    id: 'pro',
    nome: 'Pro',
    descricao: 'Plano pago (ainda não disponível).',
    recursos: { ia: true, amigos: true, evolucaoAvancada: true },
    limites: { iaPorDia: null, iaPorMes: null },
  },
}

// Recurso que exige conta de verdade (visitante anônimo não usa).
const SO_COM_CONTA = new Set(['ia', 'amigos'])

function paraData(valor) {
  if (!valor) return null
  if (valor instanceof Date) return valor
  if (typeof valor.toDate === 'function') return valor.toDate()
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

/**
 * Plano em vigor a partir do documento de assinatura (ou da ausência dele).
 * Assinatura vencida, cancelada ou com plano desconhecido volta para o Grátis.
 */
export function planoEmVigor(assinatura, agora = new Date()) {
  const id = assinatura?.plano
  if (!id || !PLANOS[id] || id === PLANO_PADRAO) return PLANOS[PLANO_PADRAO]
  if (assinatura.status !== 'ativa') return PLANOS[PLANO_PADRAO]
  const expira = paraData(assinatura.expiraEm)
  if (expira && expira <= agora) return PLANOS[PLANO_PADRAO]
  return PLANOS[id]
}

/**
 * Pode usar o recurso? Devolve { permitido, motivo } para a tela explicar.
 * motivo: 'conta' (precisa criar conta), 'plano' (fora do plano), 'limite' (acabou a cota).
 */
export function podeUsar(plano, recurso, { anonimo = false, usoHoje = 0, usoMes = 0 } = {}) {
  if (anonimo && SO_COM_CONTA.has(recurso)) return { permitido: false, motivo: 'conta' }
  if (!plano?.recursos?.[recurso]) return { permitido: false, motivo: 'plano' }
  if (recurso === 'ia') {
    const { iaPorDia, iaPorMes } = plano.limites || {}
    if (iaPorDia != null && usoHoje >= iaPorDia) return { permitido: false, motivo: 'limite' }
    if (iaPorMes != null && usoMes >= iaPorMes) return { permitido: false, motivo: 'limite' }
  }
  return { permitido: true, motivo: null }
}

export const MENSAGENS_BLOQUEIO = {
  conta: 'Crie uma conta para usar a análise por IA. Você pode continuar digitando os valores.',
  plano: 'Este recurso não faz parte do seu plano.',
  limite: 'Você usou todas as análises de IA disponíveis por agora.',
}

// O Firebase só exclui a conta de quem entrou há poucos minutos.
const JANELA_LOGIN_RECENTE_MS = 5 * 60 * 1000
export function precisaEntrarDeNovo(user, agora = Date.now()) {
  if (user?.isAnonymous) return false
  const ultimo = Date.parse(user?.metadata?.lastSignInTime || '')
  return !Number.isFinite(ultimo) || agora - ultimo > JANELA_LOGIN_RECENTE_MS
}

// Chave do mês e do dia no horário local, para o contador de uso.
export function chavesDeUso(agora = new Date()) {
  const mes = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const dia = String(agora.getDate()).padStart(2, '0')
  return { mes, dia }
}

export function lerUso(docUso, agora = new Date()) {
  const { dia } = chavesDeUso(agora)
  const total = Number.isInteger(docUso?.total) ? docUso.total : 0
  const hoje = Number.isInteger(docUso?.porDia?.[dia]) ? docUso.porDia[dia] : 0
  return { mes: total, hoje }
}
