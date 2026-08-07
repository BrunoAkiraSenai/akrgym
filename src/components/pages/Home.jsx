import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection, getDocs, query, orderBy, limit, where,
} from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import { useUser } from '../../context/UserContext'
import { CalendarDays, CheckCircle2, ChevronRight, Dumbbell, Flame, Play } from 'lucide-react'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarData(data) {
  try {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).replace(/^(\w)/, l => l.toUpperCase())
  } catch { return '' }
}

function tempoRelativo(data) {
  try {
    const diff = Date.now() - data
    const dias = Math.floor(diff / 86400000)
    if (dias === 0) return 'Hoje'
    if (dias === 1) return 'Ontem'
    if (dias < 7) return `há ${dias} dias`
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch { return '' }
}

function inicioSemana(data) {
  const d = new Date(data)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function fimSemana(data) {
  const d = inicioSemana(data)
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

export default function Home({ onStartWorkout }) {
  const user = useUser()
  const [ultimoTreino, setUltimoTreino] = useState(null)
  const [totalTreinos, setTotalTreinos] = useState(0)
  const [diasComTreino, setDiasComTreino] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [treinos, setTreinos] = useState([])

  const hoje = useMemo(() => new Date(), [])

  const calcularStreak = (listaTreinos) => {
    if (!listaTreinos || listaTreinos.length === 0) return 0
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
    const datas = new Set()
    for (const t of listaTreinos) {
      let d = t.data?.toDate ? t.data.toDate() : new Date(t.data)
      d.setHours(0, 0, 0, 0)
      datas.add(d.getTime())
    }
    let streak = 0
    let dia = hoje.getTime()
    while (datas.has(dia)) {
      streak++
      dia -= 86400000
    }
    return streak
  }

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      if (!db) { setErro('Firestore não inicializado.'); setLoading(false); return }
      const ref = collection(db, 'users', user.uid, 'historico_treinos')
      const [ultimoSnap, totalSnap, semanalSnap] = await Promise.all([
        getDocs(query(ref, orderBy('data', 'desc'), limit(1))),
        getDocs(ref),
        getDocs(query(ref, where('data', '>=', inicioSemana(hoje)), where('data', '<=', fimSemana(hoje)))),
      ])
      if (!ultimoSnap.empty) setUltimoTreino({ id: ultimoSnap.docs[0].id, ...ultimoSnap.docs[0].data() })
      else setUltimoTreino(null)
      setTotalTreinos(totalSnap.size)
      const dias = new Set()
      semanalSnap.docs.forEach(d => {
        const t = d.data().data?.toDate?.() || new Date(d.data().data)
        dias.add(t.getDay())
      })
      setDiasComTreino([...dias])
      setTreinos(totalSnap.docs.map(d => d.data()))
    } catch (err) { setErro(err.message) }
    setLoading(false)
  }, [user.uid, hoje])

  // Carrega o resumo ao entrar na Home e sincroniza os dados do usuário.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarDados() }, [carregarDados])

  const dataTreino = ultimoTreino?.data?.toDate?.() || (ultimoTreino?.data ? new Date(ultimoTreino.data) : null)
  const streak = calcularStreak(treinos)
  const sessoesNaSemana = diasComTreino.length

  return (
    <div className="home-page flex flex-col gap-4 pt-2 pb-4">
      <header className="home-hero">
        <div>
          <p className="home-kicker">Painel de hoje</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Seu treino começa aqui</h1>
          <p className="home-date">{formatarData(hoje)}</p>
        </div>
        <div className="home-hero-mark" aria-hidden="true"><Dumbbell size={20} /></div>
      </header>

      {erro && (
        <div className="home-feedback" role="alert">
          <span className="text-red-400 text-xs">{erro}</span>
        </div>
      )}

      <button
        type="button"
        onClick={onStartWorkout}
        className="home-start-card"
      >
        <span className="home-start-icon"><Play size={18} fill="currentColor" aria-hidden="true" /></span>
        <span className="home-start-copy"><strong>Começar treino</strong><small>Escolha sua divisão e registre as séries</small></span>
        <span className="home-start-action">Treinar <ChevronRight size={17} aria-hidden="true" /></span>
      </button>

      <section className="home-summary" aria-label="Resumo do seu ritmo">
        <article className="home-stat home-stat-feature">
          <div className="home-stat-label"><Flame size={14} /> Ritmo atual</div>
          <strong>{loading ? '...' : streak}</strong>
          <span>{streak === 1 ? 'dia seguido' : 'dias seguidos'}</span>
        </article>
        <article className="home-stat">
          <div className="home-stat-label"><Dumbbell size={14} /> Histórico</div>
          <strong>{loading ? '...' : totalTreinos}</strong>
          <span>treinos registrados</span>
        </article>
        <article className="home-stat home-stat-wide">
          <div className="home-stat-label"><CalendarDays size={14} /> Última sessão</div>
          {loading ? <strong>...</strong> : ultimoTreino ? (
            <><strong className="home-stat-session">{PROTOCOLO_BASE[ultimoTreino.rotina_id]?.nome || ultimoTreino.rotina_id || 'Treino'}</strong><span>{tempoRelativo(dataTreino)}</span></>
          ) : <><strong className="home-stat-session">Ainda não registrada</strong><span>Sua primeira sessão começa hoje</span></>}
        </article>
      </section>

      <section className="home-panel card-premium" aria-labelledby="home-week-title">
        <div className="home-panel-head">
          <div><p className="home-kicker">Constância</p><h2 id="home-week-title">Semana em movimento</h2></div>
          <span className="home-week-count">{sessoesNaSemana}/7 dias</span>
        </div>
        <div className="home-week-grid">
          {DIAS_SEMANA.map((label, i) => {
            const ativo = diasComTreino.includes(i)
            return (
              <div key={i} className={`home-day ${ativo ? 'home-day-active' : ''}`}>
                <span className="home-day-track"><span className="home-day-fill" /></span>
                <span className="home-day-label">{label}</span>
              </div>
            )
          })}
        </div>
        <div className="home-panel-foot">
          <span>{sessoesNaSemana === 0 ? 'Nenhuma sessão registrada nesta semana' : `${sessoesNaSemana} ${sessoesNaSemana === 1 ? 'sessão registrada' : 'sessões registradas'} nesta semana`}</span>
          {sessoesNaSemana > 0 && <span className="home-status"><CheckCircle2 size={13} /> Você está mantendo o ritmo</span>}
        </div>
      </section>

      <section className="home-next card-premium">
        <div className="home-next-icon"><Dumbbell size={17} /></div>
        <div><h2>{ultimoTreino ? 'Pronto para a próxima?' : 'Monte seu primeiro registro'}</h2><p>{ultimoTreino ? 'Entre em Treinar quando quiser continuar sua evolução.' : 'Comece uma sessão para criar seu histórico e acompanhar sua evolução.'}</p></div>
      </section>
    </div>
  )
}
