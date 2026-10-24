export function parseMetaTeto(meta) {
  if (!meta) return Infinity
  const parts = String(meta).split('-').map(Number)
  return parts.length === 2 ? Math.max(...parts) : parts[0]
}

export function epley1RM(carga, reps) {
  return Math.round((Number(carga) || 0) * (1 + Math.min(Number(reps) || 0, 12) / 30))
}

export function volumePorTreino(treino) {
  return (treino?.exercicios || []).reduce(
    (total, ex) => total + ((Number(ex.carga_top) || 0) * (Number(ex.reps_top) || 0)),
    0,
  )
}

export function diasDesde(data, agora = new Date()) {
  if (!data) return null
  const inicio = new Date(data)
  inicio.setHours(0, 0, 0, 0)
  const hoje = new Date(agora)
  hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje - inicio) / 86400000))
}

export function formatarVolume(valor) {
  if (valor >= 1000000) return `${(valor / 1000000).toFixed(1).replace('.', ',')} mi`
  if (valor >= 1000) return `${(valor / 1000).toFixed(1).replace('.', ',')} mil`
  return Number(valor || 0).toLocaleString('pt-BR')
}

export function dataTreinoParaDate(valor) {
  if (!valor) return null
  const data = valor?.toDate ? valor.toDate() : new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

function inicioDoDia(valor) {
  const data = new Date(valor)
  data.setHours(0, 0, 0, 0)
  return data
}

function diasAtivos(lista, agora, inicio, fim) {
  const primeiro = inicioDoDia(agora)
  const ultimo = inicioDoDia(agora)
  primeiro.setDate(primeiro.getDate() + inicio)
  ultimo.setDate(ultimo.getDate() + fim)
  const min = primeiro.getTime()
  const max = ultimo.getTime()
  const dias = new Set()
  lista.forEach(treino => {
    const data = dataTreinoParaDate(treino?.data)
    if (!data) return
    const dia = inicioDoDia(data).getTime()
    if (dia >= min && dia <= max) dias.add(dia)
  })
  return dias.size
}

export function calcularSequenciaTreinos(lista = [], agora = new Date(), limiteDias = 90) {
  const dias = new Set()
  lista.forEach(treino => {
    const data = dataTreinoParaDate(treino?.data)
    if (data) dias.add(inicioDoDia(data).getTime())
  })

  const hoje = inicioDoDia(agora)
  if (!dias.has(hoje.getTime())) hoje.setDate(hoje.getDate() - 1)
  if (!dias.has(hoje.getTime())) return 0

  let sequencia = 0
  while (sequencia < limiteDias && dias.has(hoje.getTime())) {
    sequencia++
    hoje.setDate(hoje.getDate() - 1)
  }
  return sequencia
}

export const META_TREINOS_SEMANA_PADRAO = 3

export function normalizarMetaSemanal(valor) {
  const numero = Math.round(Number(valor))
  return Number.isFinite(numero) && numero >= 1 && numero <= 7 ? numero : META_TREINOS_SEMANA_PADRAO
}

function inicioDaSemana(valor) {
  const data = inicioDoDia(valor)
  data.setDate(data.getDate() - data.getDay())
  return data
}

/**
 * Constância de musculação medida em semanas, não em dias seguidos: quem
 * treina segunda, quarta e sexta está em dia mesmo sem dois dias colados.
 * Semana de domingo a sábado, igual à grade "Semana em movimento".
 * A semana atual só entra na contagem quando a meta já foi batida; enquanto
 * estiver em andamento, ela não quebra a sequência das anteriores.
 */
export function resumoSemanalTreinos(lista = [], agora = new Date(), meta = META_TREINOS_SEMANA_PADRAO, limiteSemanas = 52) {
  const alvo = normalizarMetaSemanal(meta)
  const diasPorSemana = new Map()
  lista.forEach(treino => {
    const data = dataTreinoParaDate(treino?.data)
    if (!data) return
    const semana = inicioDaSemana(data).getTime()
    if (!diasPorSemana.has(semana)) diasPorSemana.set(semana, new Set())
    diasPorSemana.get(semana).add(inicioDoDia(data).getTime())
  })
  const treinosNaSemana = inicio => diasPorSemana.get(inicio.getTime())?.size || 0

  const semanaAtual = inicioDaSemana(agora)
  const feitosSemana = treinosNaSemana(semanaAtual)
  let semanasNaMeta = feitosSemana >= alvo ? 1 : 0
  const cursor = new Date(semanaAtual)
  cursor.setDate(cursor.getDate() - 7)
  while (semanasNaMeta < limiteSemanas && treinosNaSemana(cursor) >= alvo) {
    semanasNaMeta++
    cursor.setDate(cursor.getDate() - 7)
  }
  return {
    meta: alvo,
    feitosSemana,
    faltamSemana: Math.max(0, alvo - feitosSemana),
    metaDaSemanaCumprida: feitosSemana >= alvo,
    semanasNaMeta,
    noLimite: semanasNaMeta >= limiteSemanas,
  }
}

export function calcularRitmoTreino(lista = [], agora = new Date(), metaSemanal = 4) {
  // Reaching the weekly goal in a rolling week = 100. Each point uses the same rule.
  // This is an activity indicator, not a training prescription.
  const meta = Math.max(1, Number(metaSemanal) || 4)
  const pontos = Array.from({ length: 14 }, (_, indice) => {
    const fim = indice - 13
    return Math.min(100, Math.round((diasAtivos(lista, agora, fim - 6, fim) / meta) * 100))
  })
  const recentes = diasAtivos(lista, agora, -6, 0)
  return {
    pontos,
    score: pontos.at(-1),
    diasRecentes: recentes,
    // Semana atual até hoje contra o mesmo trecho da semana anterior: numa
    // sexta de manhã, quem treinou segunda e quarta não aparece "caindo".
    variacao: (() => {
      const diaDaSemana = inicioDoDia(agora).getDay()
      const atual = diasAtivos(lista, agora, -diaDaSemana, 0)
      // O dia de hoje só entra na comparação depois que o treino dele foi feito.
      const treinouHoje = diasAtivos(lista, agora, 0, 0) > 0
      const anterior = diasAtivos(lista, agora, -diaDaSemana - 7, treinouHoje ? -7 : -8)
      return Math.round(((atual - anterior) / meta) * 100)
    })(),
  }
}

const regrasSessao = [
  { chave: 'chest', termos: ['peito', 'peitoral', 'chest', 'supino', 'crucifixo', 'push'] },
  { chave: 'back', termos: ['costas', 'dorsal', 'back', 'remada', 'puxada', 'pull'] },
  { chave: 'lower', termos: ['perna', 'pernas', 'lower', 'inferior', 'leg', 'agach', 'stiff', 'panturr', 'glute', 'quadr'] },
  { chave: 'shoulders', termos: ['ombro', 'ombros', 'shoulder', 'deltoid', 'elevacao', 'desenvolvimento'] },
  { chave: 'arms', termos: ['braco', 'bracos', 'arm', 'biceps', 'triceps', 'rosca', 'curl'] },
]

function normalizarTextoTreino(valor) {
  return String(valor || '')
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function classificarSessaoTreino({ rotinaNome = '', exercicios = [] } = {}) {
  const rotina = normalizarTextoTreino(rotinaNome)
  const textoExercicios = exercicios.map(normalizarTextoTreino).join(' ')
  const texto = `${rotina} ${textoExercicios}`
  if (/full\s*body|corpo\s*inteiro|fullbody/.test(rotina)) return 'full'
  if (/\bupper\b|superior/.test(rotina)) return 'upper'
  if (/\blower\b|inferior/.test(rotina)) return 'lower'

  const pontuacoes = regrasSessao.map(regra => ({
    chave: regra.chave,
    pontos: regra.termos.reduce((total, termo) => total + (texto.includes(termo) ? (textoExercicios.includes(termo) ? 2 : 1) : 0), 0),
  }))
  const melhor = pontuacoes.sort((a, b) => b.pontos - a.pontos)[0]
  return melhor?.pontos ? melhor.chave : 'full'
}
