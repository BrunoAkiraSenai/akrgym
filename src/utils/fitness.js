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
  const hoje = inicioDoDia(agora).getTime()
  const min = hoje + inicio * 86400000
  const max = hoje + fim * 86400000
  const dias = new Set()
  lista.forEach(treino => {
    const data = dataTreinoParaDate(treino?.data)
    if (!data) return
    const dia = inicioDoDia(data).getTime()
    if (dia >= min && dia <= max) dias.add(dia)
  })
  return dias.size
}

export function calcularRitmoTreino(lista = [], agora = new Date()) {
  const pontos = Array.from({ length: 7 }, (_, indice) => {
    const fim = indice === 6 ? 0 : -((6 - indice) * 2)
    const inicio = fim - 3
    return Math.min(100, Math.round((diasAtivos(lista, agora, inicio, fim) / 4) * 100))
  })
  const recentes = diasAtivos(lista, agora, -13, 0)
  const anteriores = diasAtivos(lista, agora, -27, -14)
  return {
    pontos,
    score: Math.min(100, Math.round((recentes / 4) * 100)),
    diasRecentes: recentes,
    variacao: recentes - anteriores,
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
