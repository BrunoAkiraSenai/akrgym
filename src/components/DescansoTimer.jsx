import { useEffect, useReducer, useState } from 'react'
import {
  Check, Clock3, Minus, Pause, Play, Plus, RotateCcw, Settings2, SkipForward, X,
} from 'lucide-react'
import {
  DEFAULT_DESCANSO_SEGUNDOS,
  DESCANSO_PRESETS,
  formatarDescanso,
  normalizarDescansoSegundos,
  resolverDescansoSalvo,
  timerReducer,
} from '../utils/restTimer'

function lerPreferencia(storageKey, fallback) {
  if (!storageKey || typeof window === 'undefined') return normalizarDescansoSegundos(fallback)
  try {
    return resolverDescansoSalvo(localStorage.getItem(storageKey), fallback)
  } catch {
    return normalizarDescansoSegundos(fallback)
  }
}

function criarEstadoInicial({ defaultSeconds, storageKey }) {
  const configurado = lerPreferencia(storageKey, defaultSeconds)
  return { configurado, restante: configurado, rodando: false, concluido: false, terminaEm: null }
}

export default function DescansoTimer({
  defaultSeconds = DEFAULT_DESCANSO_SEGUNDOS,
  storageKey = null,
  label = 'Descanso rápido',
  exerciseName = '',
  compact = false,
}) {
  const [timer, dispatch] = useReducer(timerReducer, { defaultSeconds, storageKey }, criarEstadoInicial)
  const [aberto, setAberto] = useState(false)
  const { configurado, restante, rodando, concluido } = timer

  useEffect(() => {
    if (!storageKey) return
    try { localStorage.setItem(storageKey, String(timer.configurado)) } catch { /* A preferência continua apenas nesta sessão. */ }
  }, [storageKey, timer.configurado])

  useEffect(() => {
    if (!rodando) return undefined
    const atualizar = () => dispatch({ type: 'tick', now: Date.now() })
    const interval = window.setInterval(atualizar, 1000)
    window.addEventListener('visibilitychange', atualizar)
    window.addEventListener('focus', atualizar)
    window.addEventListener('pageshow', atualizar)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('visibilitychange', atualizar)
      window.removeEventListener('focus', atualizar)
      window.removeEventListener('pageshow', atualizar)
    }
  }, [rodando])

  useEffect(() => {
    if (!concluido) return
    try { navigator.vibrate?.([100, 60, 100]) } catch { /* Vibração não existe em todos os dispositivos. */ }
  }, [concluido])

  const selecionarTempo = valor => {
    dispatch({ type: 'select', seconds: valor })
  }

  const iniciar = () => dispatch({ type: 'start', now: Date.now() })

  const pausar = () => dispatch({ type: 'pause', now: Date.now() })

  const reiniciar = () => dispatch({ type: 'reset' })

  const ajustar = delta => dispatch({ type: 'select', seconds: configurado + delta })
  const progresso = Math.max(0, Math.min(1, restante / configurado))

  return (
    <div className={`rest-timer${compact ? ' rest-timer-compact' : ''}${aberto ? ' is-open' : ''}`}>
      <button
        type="button"
        className="rest-timer-trigger"
        onClick={() => setAberto(prev => !prev)}
        aria-expanded={aberto}
      >
        <span className="rest-timer-trigger-icon"><Clock3 size={compact ? 15 : 17} aria-hidden="true" /></span>
        <span className="rest-timer-trigger-copy">
          <strong>{rodando ? formatarDescanso(restante) : concluido ? 'Descanso concluído' : label}</strong>
          <small>{rodando ? 'Descanso em andamento' : concluido ? 'Hora da próxima série' : `${formatarDescanso(configurado)} configurado`}</small>
        </span>
        <Settings2 size={14} className="rest-timer-trigger-settings" aria-hidden="true" />
      </button>

      {concluido && (
        <div className="rest-timer-notification" role="status" aria-live="polite">
          <Check size={13} aria-hidden="true" /> <span>Descanso concluído. Hora da próxima série.</span>
        </div>
      )}

      {aberto && (
        <div className="rest-timer-panel">
          <div className="rest-timer-panel-head">
            <div>
              <span className="rest-timer-eyebrow">Cronômetro de descanso</span>
              <strong>{exerciseName || 'Configure sem sair da tela'}</strong>
            </div>
            <button type="button" onClick={() => setAberto(false)} aria-label="Fechar cronômetro"><X size={15} /></button>
          </div>

          <div className={`rest-timer-display${concluido ? ' is-complete' : ''}`}>
            <div className="rest-timer-ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="rest-timer-ring-track" cx="60" cy="60" r="50" pathLength="100" />
                <circle
                  className="rest-timer-ring-progress"
                  cx="60"
                  cy="60"
                  r="50"
                  pathLength="100"
                  style={{ strokeDashoffset: `${(1 - progresso) * 100}` }}
                />
              </svg>
              <div className="rest-timer-ring-inner">
                <strong key={restante} className="rest-timer-countdown" aria-live="polite">{formatarDescanso(restante)}</strong>
                <span>{concluido ? 'Concluído' : rodando ? 'Respire e recupere' : 'Pronto para começar'}</span>
              </div>
            </div>
            {concluido && <div className="rest-timer-complete"><Check size={13} /> Hora da próxima série</div>}
          </div>

          <div className="rest-timer-presets" aria-label="Escolher tempo de descanso">
            {DESCANSO_PRESETS.map(preset => (
              <button
                type="button"
                key={preset}
                onClick={() => selecionarTempo(preset)}
                className={configurado === preset ? 'is-selected' : ''}
              >
                {formatarDescanso(preset)}
              </button>
            ))}
          </div>

          <div className="rest-timer-adjust">
            <button type="button" onClick={() => ajustar(-15)} disabled={configurado <= 15} aria-label="Diminuir 15 segundos"><Minus size={13} /> 15s</button>
            <span>Ajuste rápido</span>
            <button type="button" onClick={() => ajustar(15)} disabled={configurado >= 600} aria-label="Adicionar 15 segundos">+15s <Plus size={13} /></button>
          </div>

          <div className="rest-timer-actions">
            <button type="button" className="rest-timer-main-action" onClick={rodando ? pausar : iniciar}>
              {rodando ? <><Pause size={15} /> Pausar</> : <><Play size={15} fill="currentColor" /> {concluido ? 'Começar de novo' : 'Começar descanso'}</>}
            </button>
            <button type="button" className="rest-timer-icon-action" onClick={reiniciar} aria-label="Reiniciar descanso"><RotateCcw size={15} /></button>
            {rodando && <button type="button" className="rest-timer-icon-action" onClick={() => dispatch({ type: 'skip' })} aria-label="Pular descanso"><SkipForward size={15} /></button>}
          </div>
        </div>
      )}
    </div>
  )
}
