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
