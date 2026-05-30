import { useState, useEffect, useCallback } from 'react'
import {
  collection, getDocs, query, orderBy, limit, where,
} from 'firebase/firestore'
import { db } from '../../firebase'
import { Dumbbell, Calendar, Zap, AlertTriangle } from 'lucide-react'
import PROTOCOLO_BASE from '../../config/protocolo'

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

function formatarData(data) {
  try {
    return data.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).replace(/^(\w)/, l => l.toUpperCase())
  } catch {
    return ''
  }
}

function tempoRelativo(data) {
  try {
    const agora = new Date()
    const diff = agora - data
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (dias === 0) return 'Hoje'
    if (dias === 1) return 'Ontem'
    if (dias < 7) return `há ${dias} dias`
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  } catch {
    return ''
  }
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
  const [ultimoTreino, setUltimoTreino] = useState(null)
  const [totalTreinos, setTotalTreinos] = useState(0)
  const [diasComTreino, setDiasComTreino] = useState([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const hoje = new Date()

  const carregarDados = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      if (!db) {
        setErro('Firestore não foi inicializado. Verifique as credenciais no firebase.js.')
        setLoading(false)
        return
      }

      const historicoRef = collection(db, 'historico_treinos')

      const [ultimoSnap, totalSnap, semanalSnap] = await Promise.all([
        getDocs(query(historicoRef, orderBy('data', 'desc'), limit(1))),
        getDocs(historicoRef),
        getDocs(
          query(
            historicoRef,
            where('data', '>=', inicioSemana(hoje)),
            where('data', '<=', fimSemana(hoje)),
          )
        ),
      ])

      if (!ultimoSnap.empty) {
        const doc = ultimoSnap.docs[0]
        setUltimoTreino({ id: doc.id, ...doc.data() })
      } else {
        setUltimoTreino(null)
      }

      setTotalTreinos(totalSnap.size)

      const dias = new Set()
      semanalSnap.docs.forEach(d => {
        const t = d.data().data?.toDate?.() || new Date(d.data().data)
        dias.add(t.getDay())
      })
      setDiasComTreino([...dias])
    } catch (err) {
      setErro(`Erro ao carregar dados: ${err.message}`)
    }

    setLoading(false)
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  const dataTreino = ultimoTreino?.data?.toDate?.() || (ultimoTreino?.data ? new Date(ultimoTreino.data) : null)

  return (
    <div className="flex flex-col gap-5 pt-4 pb-6">
      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-white">Bora treinar!</h1>
        <p className="text-neutral-400 text-sm mt-0.5">{formatarData(hoje)}</p>
      </div>

      <button
        onClick={onStartWorkout}
        className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-lg py-5 rounded-xl transition-colors"
      >
        <Zap size={24} />
        Iniciar Treino do Dia
      </button>

      <section className="bg-neutral-800 rounded-xl p-4">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Calendar size={14} /> Última Atividade
        </h2>
        {loading ? (
          <p className="text-neutral-500 text-sm">Carregando...</p>
        ) : ultimoTreino ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white font-semibold">
                {PROTOCOLO_BASE[ultimoTreino.rotina_id]?.nome || ultimoTreino.rotina_id || 'Treino'}
              </p>
              <p className="text-neutral-400 text-sm">{tempoRelativo(dataTreino)}</p>
            </div>
            <Dumbbell size={22} className="text-emerald-400" />
          </div>
        ) : (
          <p className="text-neutral-500 text-sm">
            Nenhum treino registrado ainda. Que tal começar hoje?
          </p>
        )}
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <Dumbbell size={20} className="text-emerald-400" />
          <span className="text-2xl font-bold text-white">{loading ? '—' : totalTreinos}</span>
          <span className="text-neutral-400 text-xs">Total de treinos</span>
        </div>
        <div className="bg-neutral-800 rounded-xl p-4 flex flex-col items-center justify-center gap-1">
          <Calendar size={20} className="text-emerald-400" />
          <span className="text-2xl font-bold text-white">Semana</span>
          <div className="flex gap-1.5 mt-1">
            {DIAS_SEMANA.map((label, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className={`w-3 h-3 rounded-full ${
                  diasComTreino.includes(i) ? 'bg-emerald-400' : 'bg-neutral-600'
                }`} />
                <span className="text-[9px] text-neutral-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
