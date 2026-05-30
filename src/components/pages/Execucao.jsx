import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, query, where, orderBy, limit, addDoc,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { Play, CheckCircle, Loader, ChevronLeft, AlertTriangle } from 'lucide-react'

export default function Execucao({ onFinish }) {
  const [step, setStep] = useState('select')
  const [rotinas, setRotinas] = useState([])
  const [rotinaAtiva, setRotinaAtiva] = useState(null)
  const [seriesData, setSeriesData] = useState([])
  const [historico, setHistorico] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadingRotinas, setLoadingRotinas] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    ;(async () => {
      setLoadingRotinas(true)
      setErro(null)

      try {
        if (!db) {
          setErro('Firestore não foi inicializado. Verifique as credenciais no firebase.js.')
          setLoadingRotinas(false)
          return
        }

        const snap = await getDocs(collection(db, 'rotinas'))
        setRotinas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      } catch (err) {
        setErro(`Erro ao carregar rotinas: ${err.message}`)
      }

      setLoadingRotinas(false)
    })()
  }, [])

  const [loadingHistorico, setLoadingHistorico] = useState(false)

  const iniciarTreino = useCallback(async (rotina) => {
    if (loadingHistorico) return
    setRotinaAtiva(rotina)
    setStep('active')
    setLoadingHistorico(true)
    setErro(null)

    setSeriesData(
      (rotina.exercicios || []).map(ex => ({
        nome: ex.nome,
        series: Array.from({ length: ex.metas_series || 0 }, () => ({ carga: '', reps: '' })),
      }))
    )

    try {
      const q = query(
        collection(db, 'historico_treinos'),
        where('rotina_id', '==', rotina.id),
        orderBy('data', 'desc'),
        limit(1)
      )
      const snap = await getDocs(q)
      if (!snap.empty) {
        setHistorico(snap.docs[0].data())
      } else {
        setHistorico(null)
      }
    } catch (err) {
      setHistorico(null)
      setErro(`Erro ao buscar histórico: ${err.message}`)
    }

    setLoadingHistorico(false)
  }, [loadingHistorico])

  const atualizarSerie = (exIdx, serieIdx, campo, valor) => {
    setSeriesData(prev => {
      const next = prev.map(ex => ({ ...ex, series: ex.series.map(s => ({ ...s })) }))
      next[exIdx].series[serieIdx][campo] = valor
      return next
    })
  }

  const formatarAnterior = (exercicioNome) => {
    if (!historico) return null
    const ex = historico.exercicios?.find(e => e.nome === exercicioNome)
    if (!ex || !ex.series) return null
    return ex.series.map((s, i) => {
      const carga = s.carga ?? '?'
      const reps = s.reps ?? '?'
      return `${i + 1}ªS: ${carga}kg x ${reps}`
    }).join(' | ')
  }

  const finalizarTreino = async () => {
    setSaving(true)
    setErro(null)

    try {
      const data = {
        rotina_id: rotinaAtiva.id,
        data: new Date(),
        exercicios: seriesData.map(ex => ({
          nome: ex.nome,
          series: ex.series.map(s => ({
            carga: Number(s.carga),
            reps: Number(s.reps),
          })),
        })),
      }
      await addDoc(collection(db, 'historico_treinos'), data)
      onFinish()
    } catch (err) {
      setErro(`Erro ao salvar treino: ${err.message}`)
      setSaving(false)
    }
  }

  const podeFinalizar = seriesData.length > 0 && seriesData.every(ex =>
    ex.series.every(s => s.carga !== '' && s.reps !== '')
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

        {loadingRotinas ? (
          <p className="text-neutral-500 text-center py-8">Carregando...</p>
        ) : !rotinas || rotinas.length === 0 ? (
          <p className="text-neutral-500 text-center py-8">
            Nenhuma rotina cadastrada. Vá em Configurar e crie uma.
          </p>
        ) : (
          rotinas.map(rotina => (
            <button
              key={rotina.id}
              onClick={() => iniciarTreino(rotina)}
              className="w-full flex items-center justify-between bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 p-5 rounded-xl transition-colors text-left"
            >
              <div>
                <span className="text-white font-bold text-lg">{rotina.nome}</span>
                <span className="text-neutral-400 text-sm block">
                  {rotina.exercicios?.length || 0} exercícios
                </span>
              </div>
              <Play size={24} className="text-emerald-400 shrink-0" />
            </button>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 pt-2 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setStep('select'); setRotinaAtiva(null); setHistorico(null); setErro(null) }}
          className="text-neutral-400 hover:text-white p-1"
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">{rotinaAtiva?.nome}</h1>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {seriesData && seriesData.length > 0 ? (
        seriesData.map((ex, exIdx) => (
          <div key={ex.nome} className="bg-neutral-800 rounded-xl p-4 space-y-3">
            <h2 className="text-white font-semibold text-base">{ex.nome}</h2>

            {(() => {
              const anterior = formatarAnterior(ex.nome)
              return anterior ? (
                <p className="text-emerald-400/80 text-xs leading-relaxed bg-emerald-500/10 rounded-lg px-3 py-2">
                  Anterior: {anterior}
                </p>
              ) : (
                <p className="text-neutral-500 text-xs italic">Primeira vez fazendo este exercício</p>
              )
            })()}

              {ex.series && ex.series.length > 0 ? (
              ex.series.map((serie, sIdx) => (
                <div key={sIdx} className="grid grid-cols-[1.5rem_1fr_auto_1fr] gap-2 items-center">
                  <span className="text-neutral-400 text-sm font-mono text-center">{sIdx + 1}ª</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="kg"
                    value={serie.carga}
                    onChange={e => atualizarSerie(exIdx, sIdx, 'carga', e.target.value)}
                    className="w-full bg-neutral-700 text-white placeholder-neutral-500 p-4 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-neutral-400 text-sm font-semibold">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="reps"
                    value={serie.reps}
                    onChange={e => atualizarSerie(exIdx, sIdx, 'reps', e.target.value)}
                    className="w-full bg-neutral-700 text-white placeholder-neutral-500 p-4 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                  />
                </div>
              ))
            ) : (
              <p className="text-neutral-500 text-xs">Nenhuma série definida para este exercício.</p>
            )}
          </div>
        ))
      ) : (
        <p className="text-neutral-500 text-center py-4">Nenhum exercício encontrado nesta rotina.</p>
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
