export const DEFAULT_DESCANSO_SEGUNDOS = 90
export const DESCANSO_PRESETS = [30, 60, 90, 120, 180, 300]

export function normalizarDescansoSegundos(valor, fallback = DEFAULT_DESCANSO_SEGUNDOS) {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return fallback
  return Math.min(600, Math.max(15, Math.round(numero)))
}

export function resolverDescansoSalvo(valorSalvo, fallback = DEFAULT_DESCANSO_SEGUNDOS) {
  if (valorSalvo == null || String(valorSalvo).trim() === '') return normalizarDescansoSegundos(fallback)
  return normalizarDescansoSegundos(valorSalvo, fallback)
}

export function calcularRestante(terminaEm, agora = Date.now()) {
  if (!Number.isFinite(terminaEm)) return 0
  return Math.max(0, Math.ceil((terminaEm - agora) / 1000))
}

export function timerReducer(state, action) {
  switch (action.type) {
    case 'select': {
      const configurado = normalizarDescansoSegundos(action.seconds)
      return { configurado, restante: configurado, rodando: false, concluido: false, terminaEm: null }
    }
    case 'start': {
      const restante = state.restante <= 0 || state.concluido ? state.configurado : state.restante
      return { ...state, restante, rodando: true, concluido: false, terminaEm: action.now + restante * 1000 }
    }
    case 'pause': {
      if (!state.rodando) return state
      const restante = calcularRestante(state.terminaEm, action.now)
      return { ...state, restante, rodando: false, concluido: restante === 0, terminaEm: null }
    }
    case 'tick': {
      if (!state.rodando) return state
      const restante = calcularRestante(state.terminaEm, action.now)
      // Focus/visibility events can arrive in the same second. Keep React idle.
      if (restante === state.restante) return state
      return restante === 0
        ? { ...state, restante: 0, rodando: false, concluido: true, terminaEm: null }
        : { ...state, restante }
    }
    case 'reset':
      return { ...state, restante: state.configurado, rodando: false, concluido: false, terminaEm: null }
    case 'skip':
      return { ...state, restante: 0, rodando: false, concluido: false, terminaEm: null }
    default:
      return state
  }
}

// Estado guardado ao sair da aba. Descanso que acabou com a tela fechada há
// até 1 minuto volta como concluído (avisa); depois disso volta parado.
export function restaurarDescanso(texto, configuradoPadrao, agora = Date.now()) {
  let salvo
  try { salvo = JSON.parse(texto) } catch { return null }
  if (!salvo || typeof salvo !== 'object') return null
  const configurado = normalizarDescansoSegundos(salvo.configurado, normalizarDescansoSegundos(configuradoPadrao))
  const parado = { configurado, restante: configurado, rodando: false, concluido: false, terminaEm: null }
  if (salvo.rodando && Number.isFinite(salvo.terminaEm)) {
    if (salvo.terminaEm > agora) return { ...parado, restante: calcularRestante(salvo.terminaEm, agora), rodando: true, terminaEm: salvo.terminaEm }
    return agora - salvo.terminaEm <= 60000 ? { ...parado, restante: 0, concluido: true } : parado
  }
  const restante = Math.round(Number(salvo.restante))
  return Number.isFinite(restante) && restante > 0 && restante < configurado ? { ...parado, restante } : parado
}

// Only the visible page needs second-by-second text updates. In the background,
// keep one deadline alarm; resync with the wall clock when the page returns.
export function acompanharDescanso(terminaEm, atualizar, ambiente = { window, document, now: Date.now }) {
  const { window: janela, document: documento, now } = ambiente
  let timeout
  let encerrado = false
  const sincronizar = () => {
    if (encerrado) return
    janela.clearTimeout(timeout)
    const agora = now()
    atualizar(agora)
    const faltamMs = terminaEm - agora
    if (faltamMs <= 0) return
    const atraso = documento.hidden ? faltamMs : (faltamMs % 1000 || 1000)
    timeout = janela.setTimeout(sincronizar, atraso)
  }
  documento.addEventListener('visibilitychange', sincronizar)
  janela.addEventListener('focus', sincronizar)
  janela.addEventListener('pageshow', sincronizar)
  sincronizar()
  return () => {
    encerrado = true
    janela.clearTimeout(timeout)
    documento.removeEventListener('visibilitychange', sincronizar)
    janela.removeEventListener('focus', sincronizar)
    janela.removeEventListener('pageshow', sincronizar)
  }
}

export function formatarDescanso(segundos) {
  const total = Math.max(0, Math.round(Number(segundos) || 0))
  const minutos = String(Math.floor(total / 60)).padStart(2, '0')
  const restante = String(total % 60).padStart(2, '0')
  return `${minutos}:${restante}`
}
