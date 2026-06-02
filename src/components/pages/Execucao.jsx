import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, query, where, orderBy, limit, addDoc, doc, getDoc, setDoc, serverTimestamp,
} from 'firebase/firestore'
import { useUser } from '../../context/UserContext'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import {
  Play, CheckCircle, Loader, ChevronLeft, AlertTriangle, X,
  Flame, Thermometer, Zap, RefreshCw, Info,
} from 'lucide-react'

export default function Execucao({ onFinish }) {
  const user = useUser()
  const STORAGE_KEY = `rascunho_treino_${user.uid}`
  const [step, setStep] = useState('select')
  const [rotinaKey, setRotinaKey] = useState(null)
  const [topSetData, setTopSetData] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [erro, setErro] = useState(null)
  const [recuperado, setRecuperado] = useState(false)
  const [sucesso, setSucesso] = useState(null)
  const [treinosState, setTreinosState] = useState(null)

  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
        if (snap.exists() && snap.data().treinos) {
          setTreinosState(snap.data().treinos)
        } else {
          await setDoc(doc(db, 'users', user.uid, 'config', 'data'), { treinos: PROTOCOLO_BASE }, { merge: true })
          setTreinosState(PROTOCOLO_BASE)
        }
      } catch (err) {
        setTreinosState(PROTOCOLO_BASE)
        setErro('Erro ao carregar treinos. Usando protocolo padrão.')
      }
    })()
  }, [])

  useEffect(() => {
    if (!treinosState) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const draft = JSON.parse(raw)
      if (!draft?.rotinaKey || !draft?.topSetData?.length) return
      if (!treinosState[draft.rotinaKey]) {
        localStorage.removeItem(STORAGE_KEY)
        return
      }
      setRotinaKey(draft.rotinaKey)
      setTopSetData(draft.topSetData)
      setStep('active')
      setRecuperado(true)
    } catch {}
  }, [treinosState])

  const keys = treinosState ? Object.keys(treinosState) : []

  useEffect(() => {
    const timer = setTimeout(() => {
      if (step === 'active' && rotinaKey && topSetData.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ rotinaKey, topSetData }))
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [rotinaKey, topSetData, step])

  const iniciarTreino = useCallback(async (key) => {
    if (loadingHistorico) return
    if (!treinosState?.[key]) {
      if (PROTOCOLO_BASE[key]) {
        await setDoc(doc(db, 'users', user.uid, 'config', 'data'), { treinos: PROTOCOLO_BASE }, { merge: true })
        setTreinosState(PROTOCOLO_BASE)
      }
      setErro('Rotina não encontrada.')
      return
    }
    const protocolo = treinosState[key]
    setRotinaKey(key)
    setStep('active')
    setLoadingHistorico(true)
    setErro(null); setSucesso(null)

    try {
      const snap = await getDocs(
        query(collection(db, 'users', user.uid, 'historico_treinos'), where('rotina_id', '==', key), orderBy('data', 'desc'), limit(1))
      )
      const ultimo = !snap.empty ? snap.docs[0].data() : null

      setTopSetData(
        protocolo.exercicios.map(ex => {
          const anterior = ultimo?.exercicios?.find(e => e.nome === ex.nome)
          return {
            nome: ex.nome,
            meta_reps: ex.meta_reps,
            carga: '', reps: '',
            ref: anterior?.carga_top ?? ex.base_top,
            repsAnterior: anterior?.reps_top ?? null,
            tem_aquecimento: ex.tem_aquecimento ?? false,
            IsAgachamento: ex.IsAgachamento ?? false,
            nota: ex.nota ?? null,
          }
        })
      )
    } catch (err) { setErro(`Erro ao buscar histórico: ${err.message}`) }
    setLoadingHistorico(false)
  }, [loadingHistorico, treinosState, user.uid])

  const atualizar = (exIdx, campo, valor) => {
    setTopSetData(prev => prev.map((ex, i) => i === exIdx ? { ...ex, [campo]: valor } : { ...ex }))
  }

  const finalizarTreino = async () => {
    const container = document.querySelector('.treino-container')
    if (container) {
      container.classList.add('card-complete-glow')
      setTimeout(() => container.classList.remove('card-complete-glow'), 400)
    }
    setSaving(true); setErro(null); setSucesso(null)
    for (const ex of topSetData) {
      const carga = Number(ex.carga)
      const reps = Number(ex.reps)
      if (isNaN(carga) || isNaN(reps) || carga <= 0 || reps <= 0) {
        setErro('Carga e repetições devem ser números válidos e maiores que zero.')
        setSaving(false)
        return
      }
    }
    try {
      await addDoc(collection(db, 'users', user.uid, 'historico_treinos'), {
        rotina_id: rotinaKey,
        data: new Date(),
        createdAt: serverTimestamp(),
        exercicios: topSetData.map(ex => ({ nome: ex.nome, carga_top: Number(ex.carga), reps_top: Number(ex.reps) })),
      })
      localStorage.removeItem(STORAGE_KEY)
      setSucesso('✓ Treino salvo!')
      setSaving(false)
      await new Promise(r => setTimeout(r, 1000))
      onFinish()
    } catch (err) { setErro(`Erro ao salvar: ${err.message}`); setSaving(false) }
  }

  const podeFinalizar = topSetData.length > 0 && topSetData.every(ex => Number(ex.carga) > 0 && Number(ex.reps) > 0)

  if (step === 'select') {
    return (
      <div className="flex flex-col gap-3 pt-2 pb-4">
        <h1 className="text-xl font-bold tracking-tight text-white mb-1">Qual treino de hoje?</h1>
        {erro && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>
        )}
        {keys.map(key => {
          const r = treinosState[key]
          return (
            <button
              key={key}
              onClick={() => iniciarTreino(key)}
              className="w-full flex items-center justify-between card-premium p-5 transition-all active:scale-[0.97] hover:border-white/10 text-left"
            >
              <div>
                <span className="text-white font-semibold text-base tracking-tight">{r?.nome || key}</span>
                <span className="text-neutral-500 text-sm block">{r?.exercicios?.length || 0} exercícios</span>
              </div>
              <Play size={22} className="text-emerald-400 shrink-0 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]" />
            </button>
          )
        })}
      </div>
    )
  }

  const rotina = treinosState?.[rotinaKey]

  return (
    <div className="flex flex-col gap-3 pt-1 pb-4 treino-container">
      <div className="flex items-center gap-2 mb-1">
        <button onClick={() => { setStep('select'); setRotinaKey(null); setErro(null); setRecuperado(false); setSucesso(null) }}
          className="text-neutral-500 hover:text-white p-1 transition-all active:scale-90">
          <ChevronLeft size={22} />
        </button>
        <h1 className="text-lg font-bold tracking-tight text-white">{rotina?.nome}</h1>
      </div>

      {recuperado && (
        <div className="flex items-center justify-between bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl px-4 py-3">
          <span className="text-cyan-400 text-xs font-medium">⚡ Rascunho de treino recuperado!</span>
          <button onClick={() => {
            localStorage.removeItem(STORAGE_KEY)
            setRecuperado(false)
            setStep('select')
            setRotinaKey(null)
            setTopSetData([])
            setErro(null); setSucesso(null)
          }} className="btn-secondary text-[11px] px-3 py-1.5">Descartar</button>
        </div>
      )}

      {erro && (
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs flex items-start gap-2">
          <span className="flex-1">{erro}</span>
          <button onClick={() => setErro(null)} className="text-red-400 hover:text-red-300 shrink-0 transition-all active:scale-90">
            <X size={14} />
          </button>
        </div>
      )}

      {sucesso && (
        <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle size={14} /> {sucesso}
        </div>
      )}

      {loadingHistorico ? (
        <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
      ) : topSetData.length === 0 ? (
        <p className="text-neutral-600 text-center py-4 text-sm">Nenhum exercício.</p>
      ) : (
        topSetData.map((ex, exIdx) => {
          const isAgachamento = ex.IsAgachamento || ex.nome?.toLowerCase().includes('agachamento')
          const aqPeso = ex.tem_aquecimento && !isAgachamento ? Math.round(ex.ref * 0.6) : null
          const prepPeso = Math.round(ex.ref * 0.85)
          const cargaHoje = Number(ex.carga)
          const backoffPeso = cargaHoje > 0
            ? (isAgachamento ? Math.round(cargaHoje * 0.9) : Math.round(cargaHoje * 0.85))
            : null

          return (
            <div key={ex.nome} className="card-premium p-4 space-y-3 transition-all">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm tracking-tight">{ex.nome}</h2>
                <span className="text-neutral-500 text-[11px] font-mono">meta {ex.meta_reps}</span>
              </div>

              <div className="flex items-center gap-2 text-emerald-400/80 text-[11px] font-mono bg-emerald-500/5 rounded-xl px-3 py-2 border border-emerald-500/10">
                <Flame size={12} className="shrink-0" />
                <span>Referência: <strong className="text-emerald-300">{ex.ref}kg</strong>
                  {ex.repsAnterior ? ` · últ. ${ex.repsAnterior} reps` : ''}
                </span>
              </div>

              {ex.nota && (
                <div className="flex items-start gap-1.5 text-orange-400/80 text-[11px] bg-orange-500/5 rounded-xl px-3 py-2 border border-orange-500/10">
                  <Info size={12} className="shrink-0 mt-0.5" />
                  <span>{ex.nota}</span>
                </div>
              )}

              <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider mb-1.5">Protocolo</div>

                {ex.tem_aquecimento && (
                  <div className="flex items-center justify-between text-[12px]">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <RefreshCw size={11} className="text-blue-400/70" /> Aquec.
                    </span>
                    <span className="text-neutral-400 font-mono">
                      {isAgachamento ? 'Barra Olímpica × 10' : `${aqPeso}kg × 10`}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                    <Zap size={11} className="text-yellow-400/70" /> Preparatória
                  </span>
                  <span className="text-neutral-400 font-mono">{prepPeso}kg × 6</span>
                </div>

                <div className="border-t border-white/5 pt-2 mt-2">
                  <div className="flex items-center justify-between text-[12px] mb-2">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5 tracking-tight">
                      <Flame size={13} /> TOP SET
                    </span>
                    <span className="text-neutral-500 text-[11px] font-mono">superar {ex.ref}kg</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number" inputMode="numeric" placeholder="kg"
                      value={ex.carga}
                      onChange={e => atualizar(exIdx, 'carga', e.target.value)}
                      className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-4 rounded-xl text-lg text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 focus:shadow-[0_0_15px_rgba(52,211,153,0.1)] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="number" inputMode="numeric" placeholder="reps"
                      value={ex.reps}
                      onChange={e => atualizar(exIdx, 'reps', e.target.value)}
                      className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-4 rounded-xl text-lg text-center font-bold outline-none focus:ring-2 focus:ring-emerald-500/50 focus:shadow-[0_0_15px_rgba(52,211,153,0.1)] transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {backoffPeso && (
                  <div className="flex items-center justify-between text-[12px] pt-1.5 border-t border-white/5">
                    <span className="text-neutral-500 font-mono flex items-center gap-1.5">
                      <RefreshCw size={11} className="text-purple-400/70" /> Back-Off
                    </span>
                    <span className="text-purple-300/80 font-mono font-semibold">
                      {isAgachamento ? `-10%: ${backoffPeso}kg × 6-8` : `${backoffPeso}kg × 8-10`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })
      )}

      <button
        onClick={finalizarTreino}
        disabled={!podeFinalizar || saving}
        className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-2 mt-1">
        {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</>
        : <><CheckCircle size={20} /> Finalizar Treino</>}
      </button>
    </div>
  )
}
