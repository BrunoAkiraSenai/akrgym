export const DEFAULT_DESCANSO_SEGUNDOS = 90
export const DESCANSO_PRESETS = [30, 60, 90, 120, 180, 300]

export function normalizarDescansoSegundos(valor, fallback = DEFAULT_DESCANSO_SEGUNDOS) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return fallback
  return Math.min(600, Math.max(15, Math.round(numero)))
}

export function formatarDescanso(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0))
  const minutos = String(Math.floor(total / 60)).padStart(2, '0')
  const restante = String(total % 60).padStart(2, '0')
  return `${minutos}:${restante}`
}
