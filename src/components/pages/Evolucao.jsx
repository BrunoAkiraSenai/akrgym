import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { db } from '../../firebase'
import { Dumbbell, BarChart3, AlertTriangle } from 'lucide-react'

const PAD = { top: 20, right: 16, bottom: 40, left: 52 }
const H = 260

export default function Evolucao() {
  const [todosTreinos, setTodosTreinos] = useState([])
  const [exercicios, setExercicios] = useState([])
  const [selecionado, setSelecionado] = useState('')
  const [tooltip, setTooltip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      if (!db) {
        setErro('Firestore não foi inicializado. Verifique as credenciais no firebase.js.')
        setLoading(false)
        return
      }

      const snap = await getDocs(
        query(collection(db, 'historico_treinos'), orderBy('data', 'asc'))
      )

      const treinos = snap.docs.map(d => {
        const raw = d.data()
        const data = raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date())
        return { ...raw, data }
      })
      setTodosTreinos(treinos)

      const nomes = new Set()
      treinos.forEach(t => {
        if (t.exercicios && Array.isArray(t.exercicios)) {
          t.exercicios.forEach(ex => {
            if (ex.nome) nomes.add(ex.nome)
          })
        }
      })
      setExercicios([...nomes].sort())
    } catch (err) {
      setErro(`Erro ao carregar dados: ${err.message}`)
    }

    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const dados = (() => {
    if (!selecionado) return []
    return todosTreinos
      .filter(t => t.exercicios && Array.isArray(t.exercicios) && t.exercicios.some(ex => ex.nome === selecionado))
      .map(t => {
        const ex = t.exercicios.find(e => e.nome === selecionado)
        if (!ex || !ex.series || ex.series.length === 0) return null
        const cargas = ex.series.map(s => s.carga).filter(v => v != null)
        if (cargas.length === 0) return null
        const maxCarga = Math.max(...cargas)
        return { data: t.data, carga: maxCarga, label: t.rotina_id }
      })
      .filter(Boolean)
  })()

  const chartDims = (() => {
    if (dados.length < 2) return null
    const w = Math.max(window.innerWidth - 32, 280)
    const plotW = w - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const maxCarga = Math.max(...dados.map(d => d.carga))
    const ceiling = Math.ceil(maxCarga / 5) * 5 || 5

    const points = dados.map((d, i) => {
      const x = PAD.left + (i / (dados.length - 1)) * plotW
      const y = PAD.top + plotH - (d.carga / ceiling) * plotH
      return { ...d, x, y }
    })

    const yTicks = []
    const step = Math.max(1, Math.round(ceiling / 4))
    for (let v = 0; v <= ceiling; v += step) {
      const y = PAD.top + plotH - (v / ceiling) * plotH
      yTicks.push({ value: v, y })
    }

    return { w, plotW, plotH, points, yTicks, ceiling }
  })()

  return (
    <div className="flex flex-col gap-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Evolução</h1>
        <BarChart3 size={20} className="text-emerald-400" />
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 text-center py-8">Carregando...</p>
      ) : !exercicios || exercicios.length === 0 ? (
        <p className="text-neutral-500 text-center py-8">
          Nenhum treino registrado ainda.
        </p>
      ) : (
        <>
          <div className="relative">
            <select
              value={selecionado}
              onChange={e => { setSelecionado(e.target.value); setTooltip(null) }}
              className="w-full bg-neutral-800 text-white p-4 rounded-xl text-base appearance-none outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Selecionar exercício</option>
              {exercicios.map(nome => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-400">
              <Dumbbell size={18} />
            </div>
          </div>

          {!selecionado && (
            <p className="text-neutral-500 text-center py-8 text-sm">
              Escolha um exercício para ver sua evolução.
            </p>
          )}

          {selecionado && dados.length < 2 && (
            <div className="bg-neutral-800 rounded-xl p-6 text-center">
              <Dumbbell size={32} className="mx-auto text-neutral-600 mb-3" />
              <p className="text-neutral-400">
                {dados.length === 0
                  ? 'Sem dados de peso para este exercício ainda. Vá treinar!'
                  : 'Faça pelo menos mais um treino com este exercício para gerar o gráfico.'}
              </p>
            </div>
          )}

          {selecionado && dados.length >= 2 && chartDims && (
            <div className="relative bg-neutral-800/40 rounded-xl p-1">
              <svg
                viewBox={`0 0 ${chartDims.w} ${H}`}
                className="w-full h-auto"
                style={{ touchAction: 'manipulation' }}
              >
                {chartDims.yTicks.map(tick => (
                  <g key={tick.value}>
                    <line
                      x1={PAD.left} y1={tick.y}
                      x2={chartDims.w - PAD.right} y2={tick.y}
                      stroke="#404040" strokeWidth="1"
                    />
                    <text
                      x={PAD.left - 8} y={tick.y + 4}
                      textAnchor="end" fill="#a3a3a3" fontSize="11"
                    >
                      {tick.value}
                    </text>
                  </g>
                ))}

                {chartDims.points.map((p, i) => (
                  <text
                    key={`label-${i}`}
                    x={p.x} y={H - 8}
                    textAnchor="middle" fill="#a3a3a3" fontSize="10"
                  >
                    {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </text>
                ))}

                <polyline
                  fill="none"
                  stroke="#34d399"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  points={chartDims.points.map(p => `${p.x},${p.y}`).join(' ')}
                />

                {chartDims.points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x} cy={p.y} r="6"
                    fill="#0f0f0f" stroke="#34d399" strokeWidth="2.5"
                    onClick={() => setTooltip(tooltip === i ? null : i)}
                  />
                ))}
              </svg>

              {tooltip !== null && chartDims.points[tooltip] && (
                <div
                  className="absolute bg-neutral-700 text-white text-sm px-3 py-1.5 rounded-lg shadow-lg pointer-events-none z-10"
                  style={{
                    left: Math.min(
                      chartDims.points[tooltip].x - 40,
                      chartDims.w - 90
                    ),
                    top: Math.max(chartDims.points[tooltip].y - 42, 4),
                  }}
                >
                  <p className="font-bold">{chartDims.points[tooltip].carga} kg</p>
                  <p className="text-neutral-300 text-xs">
                    {chartDims.points[tooltip].data.toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short',
                    })}
                  </p>
                </div>
              )}
            </div>
          )}

          {selecionado && dados.length >= 2 && (
            <div className="bg-neutral-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">
                Últimos registros
              </h3>
              <div className="space-y-1.5">
                {[...dados].reverse().slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-neutral-400">
                      {d.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    </span>
                    <span className="text-white font-semibold">{d.carga} kg</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
