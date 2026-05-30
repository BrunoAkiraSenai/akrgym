import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, query, where, orderBy, limit, addDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import {
  Play, CheckCircle, Loader, ChevronLeft, AlertTriangle,
  Flame, Thermometer, Zap, RefreshCw, Info,
} from 'lucide-react'

export default function Execucao({ onFinish }) {
  const [step, setStep] = useState('select')
  const [rotinaKey, setRotinaKey] = useState(null)
  const [topSetData, setTopSetData] = useState([])
  const [saving, setSaving] = useState(false)
  const [loadingHistorico, setLoadingHistorico] = useState(false)
  const [erro, setErro] = useState(null)

  const keys = Object.keys(PROTOCOLO_BASE)

  const iniciarTreino = useCallback(async (key) => {
    if (loadingHistorico) return
    setRotinaKey(key)
    setStep('active')
    setLoadingHistorico(true)
    setErro(null)

    const protocolo = PROTOCOLO_BASE[key]
    if (!protocolo) {
      setErro('Rotina não encontrada no protocolo.')
      setLoadingHistorico(false)
      return
    }

    try {
      const q = query(
        collection(db, 'historico_treinos'),
        where('rotina_id', '==', key),
        orderBy('data', 'desc'),
        limit(1)
      )
      const snap = await getDocs(q)
      const ultimo = !snap.empty ? snap.docs[0].data() : null

      setTopSetData(
        protocolo.exercicios.map(ex => {
          const anterior = ultimo?.exercicios?.find(e => e.nome === ex.nome)
          const ref = anterior?.carga_top ?? ex.base_top
          return {
            nome: ex.nome,
            meta_reps: ex.meta_reps,
            carga: '',
            reps: '',
            ref,
            repsAnterior: anterior?.reps_top ?? null,
            tem_aquecimento: ex.tem_aquecimento ?? false,
            IsAgachamento: ex.IsAgachamento ?? false,
            nota: ex.nota ?? null,
          }
        })
      )
    } catch (err) {
      setErro(`Erro ao buscar histórico: ${err.message}`)
    }

    setLoadingHistorico(false)
  }, [loadingHistorico])

  const atualizar = (exIdx, campo, valor) => {
    setTopSetData(prev => prev.map((ex, i) => i === exIdx ? { ...ex, [campo]: valor } : { ...ex }))
  }

  const finalizarTreino = async () => {
    setSaving(true)
    setErro(null)

    try {
      const data = {
        rotina_id: rotinaKey,
        data: new Date(),
        exercicios: topSetData.map(ex => ({
          nome: ex.nome,
          carga_top: Number(ex.carga),
          reps_top: Number(ex.reps),
        })),
      }
      await addDoc(collection(db, 'historico_treinos'), data)
      onFinish()
    } catch (err) {
      setErro(`Erro ao salvar treino: ${err.message}`)
      setSaving(false)
    }
  }

  const podeFinalizar = topSetData.length > 0 && topSetData.every(ex =>
    ex.carga !== '' && ex.reps !== ''
  )

  if (step === 'select') {
    return (
      <div className="flex flex-col gap-4 pt-4 pb-6">
        <h1 className="text-xl font-bold text-white">Qual treino de hoje?</h1>

        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-300 text-sm">{erro}</p>
          </div>
        )}

        {keys.map(key => {
          const rotina = PROTOCOLO_BASE[key]
          return (
            <button
              key={key}
              onClick={() => iniciarTreino(key)}
              className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 p-5 rounded-xl transition-colors text-left"
            >
              <div>
                <span className="text-white font-bold text-lg">{rotina.nome}</span>
                <span className="text-neutral-400 text-sm block">
                  {rotina.exercicios.length} exercícios
                </span>
              </div>
              <Play size={24} className="text-emerald-400 shrink-0" />
            </button>
          )
        })}
      </div>
    )
  }

  const rotina = PROTOCOLO_BASE[rotinaKey]

  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setStep('select'); setRotinaKey(null); setErro(null) }}
          className="text-neutral-400 hover:text-white p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">{rotina?.nome}</h1>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {loadingHistorico ? (
        <p className="text-neutral-500 text-center py-8">Carregando...</p>
      ) : topSetData.length === 0 ? (
        <p className="text-neutral-500 text-center py-4">Nenhum exercício nesta rotina.</p>
      ) : (
        topSetData.map((ex, exIdx) => {
          const aqPeso = ex.tem_aquecimento
            ? Math.round(ex.ref * 0.6)
            : null
          const prepPeso = Math.round(ex.ref * 0.85)
          const cargaHoje = Number(ex.carga)
          const backoffPeso = cargaHoje > 0
            ? (ex.IsAgachamento ? Math.round(cargaHoje * 0.9) : Math.round(cargaHoje * 0.85))
            : null

          return (
            <div key={ex.nome} className="bg-neutral-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-white font-bold text-base">{ex.nome}</h2>
                <span className="text-neutral-500 text-xs">Meta: {ex.meta_reps} reps</span>
              </div>

              <p className="text-emerald-400/80 text-xs bg-emerald-500/10 rounded-lg px-3 py-2">
                Referência: <span className="font-bold">{ex.ref}kg</span>
                {ex.repsAnterior ? ` — último treino: ${ex.repsAnterior} reps` : ''}
              </p>

              {ex.nota && (
                <p className="text-orange-400 text-xs bg-orange-500/10 rounded-lg px-3 py-2 flex items-start gap-1.5">
                  <Info size={13} className="shrink-0 mt-0.5" />
                  {ex.nota}
                </p>
              )}

              <div className="bg-neutral-900/60 rounded-xl p-3 space-y-2 border border-neutral-700">
                <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide flex items-center gap-1">
                  <Thermometer size={12} /> Protocolo
                </p>

                {ex.tem_aquecimento && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <RefreshCw size={13} className="text-blue-400" /> Aquecimento
                    </span>
                    <span className="text-neutral-300 font-mono">
                      {ex.IsAgachamento
                        ? 'Barra Olímpica x 10'
                        : `${aqPeso}kg x 10`
                      }
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400 flex items-center gap-1.5">
                    <Zap size={13} className="text-yellow-400" /> Preparatória (85%)
                  </span>
                  <span className="text-neutral-300 font-mono">{prepPeso}kg x 6</span>
                </div>

                <div className="border-t border-neutral-700 pt-2">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                      <Flame size={14} /> TOP SET (100%)
                    </span>
                    <span className="text-neutral-500 text-xs">
                      Superar {ex.ref}kg
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="kg"
                      value={ex.carga}
                      onChange={e => atualizar(exIdx, 'carga', e.target.value)}
                      className="w-full bg-neutral-700 text-white placeholder-neutral-500 p-4 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={ex.reps}
                      onChange={e => atualizar(exIdx, 'reps', e.target.value)}
                      className="w-full bg-neutral-700 text-white placeholder-neutral-500 p-4 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>

                {backoffPeso && (
                  <div className="flex items-center justify-between text-sm pt-1 border-t border-neutral-700">
                    <span className="text-neutral-400 flex items-center gap-1.5">
                      <RefreshCw size={13} className="text-purple-400" /> Back-Off
                    </span>
                    <span className="text-purple-300 font-mono font-semibold">
                      {ex.IsAgachamento
                        ? `-10%: ${backoffPeso}kg x 6-8`
                        : `${backoffPeso}kg x 8-10`
                      }
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
        className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-xl transition-colors mt-2"
      >
        {saving ? (
          <><Loader size={22} className="animate-spin" /> Salvando...</>
        ) : (
          <><CheckCircle size={22} /> Finalizar Treino</>
        )}
      </button>
    </div>
  )
}
