import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection, getDocs, query, orderBy, limit, where,
} from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import { useUser } from '../../context/UserContext'
import { Dumbbell, Calendar, Zap, TrendingUp, Clock } from 'lucide-react'

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
  const streak = useMemo(() => calcularStreak(treinos), [treinos])

  const hoje = new Date()

  const calcularStreak = (listaTreinos) => {
    if (!listaTreinos || listaTreinos.length === 0) return 0
    const hojeInicio = new Date(); hojeInicio.setHours(0, 0, 0, 0)
    const datas = listaTreinos.map(t => {
      let d = t.data?.toDate ? t.data.toDate() : new Date(t.data)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })
    let streak = 0, dia = hojeInicio.getTime()
    while (datas.includes(dia)) { streak++; dia -= 86400000 }
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
  }, [])

  useEffect(() => { carregarDados() }, [carregarDados])

  const dataTreino = ultimoTreino?.data?.toDate?.() || (ultimoTreino?.data ? new Date(ultimoTreino.data) : null)

  return (
    <div className="flex flex-col gap-4 pt-2 pb-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Bora treinar</h1>
          <p className="text-neutral-500 text-sm mt-0.5">{formatarData(hoje)}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-neutral-900/50 border border-white/5 flex items-center justify-center">
          <Dumbbell size={18} className="text-cyan-400" />
        </div>
      </div>

      {erro && (
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 flex items-start gap-2">
          <span className="text-red-400 text-xs">{erro}</span>
        </div>
      )}

      <button
        onClick={onStartWorkout}
        className="w-full btn-primary w-full text-lg py-5 flex items-center justify-center gap-3"
      >
        <Zap size={22} />
        Iniciar Treino do Dia
      </button>

      <div className="grid grid-cols-2 gap-3">
        <div className="card-premium p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-cyan-400" />
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Último</span>
          </div>
          {loading ? (
            <p className="text-neutral-600 text-sm">—</p>
          ) : ultimoTreino ? (
            <div>
              <p className="text-white font-semibold text-sm tracking-tight">
                {PROTOCOLO_BASE[ultimoTreino.rotina_id]?.nome || ultimoTreino.rotina_id || 'Treino'}
              </p>
              <p className="text-neutral-500 text-xs mt-0.5">{tempoRelativo(dataTreino)}</p>
            </div>
          ) : (
            <p className="text-neutral-600 text-xs">Nenhum ainda</p>
          )}
        </div>

        <div className="card-premium p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-cyan-400" />
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Total</span>
          </div>
          <p className="text-3xl font-bold text-white tracking-tight">{loading ? '—' : totalTreinos}</p>
          <p className="text-neutral-500 text-xs mt-0.5">treinos</p>
        </div>
      </div>

      <div className="card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={14} className="text-cyan-400" />
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Esta Semana</span>
        </div>
        <div className="flex justify-between">
          {DIAS_SEMANA.map((label, i) => {
            const ativo = diasComTreino.includes(i)
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className={`w-3 h-3 rounded-full transition-all duration-500 ${
                  ativo
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] glow-dot'
                    : 'bg-neutral-800'
                }`} />
                <span className={`text-[9px] font-medium ${
                  ativo ? 'text-emerald-400' : 'text-neutral-600'
                }`}>{label}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card-premium p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-neutral-400 flex items-center gap-1">🔥 Sequência atual</span>
          <span className="text-emerald-400 font-bold text-lg">{streak} {streak === 1 ? 'dia' : 'dias'}</span>
        </div>
        <div className="h-2 bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full transition-all duration-500"
               style={{ width: `${Math.min((streak / 7) * 100, 100)}%` }} />
        </div>
        <p className="text-neutral-500 text-xs mt-2">
          {streak >= 7 ? '🔥 Incrível! Uma semana completa!' : 'Treine hoje para manter a sequência'}
        </p>
      </div>
    </div>
  )
}
