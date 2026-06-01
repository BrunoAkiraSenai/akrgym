import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import {
  Dumbbell, BarChart3, AlertTriangle, Trophy, Target, Flame,
  Activity, Save, ChevronDown, ChevronUp, Minus, Weight,
} from 'lucide-react'

const PAD = { top: 24, right: 16, bottom: 44, left: 56 }
const H = 280

function encontrarMeta(nome) {
  for (const rotina of Object.values(PROTOCOLO_BASE)) {
    const ex = (rotina.exercicios || []).find(e => e.nome === nome)
    if (ex) return ex.meta_reps
  }
  return null
}

function parseMetaTeto(meta) {
  if (!meta) return Infinity
  const parts = meta.split('-').map(Number)
  return parts.length === 2 ? Math.max(...parts) : parts[0]
}

const CAMPOS_MEDIDA = [
  { key: 'peso', label: 'Peso', unidade: 'kg', lowerBetter: false },
  { key: 'cintura', label: 'Cintura', unidade: 'cm', lowerBetter: true },
  { key: 'abdomen', label: 'Abdômen', unidade: 'cm', lowerBetter: true },
  { key: 'braco_dir', label: 'Braço', unidade: 'cm', lowerBetter: false },
  { key: 'peito', label: 'Peito', unidade: 'cm', lowerBetter: false },
  { key: 'coxa_dir', label: 'Coxa', unidade: 'cm', lowerBetter: false },
]

export default function Evolucao({ user }) {
  const [aba, setAba] = useState('treino')

  const [todosTreinos, setTodosTreinos] = useState([])
  const [exercicios, setExercicios] = useState([])
  const [selecionado, setSelecionado] = useState('')
  const [tooltip, setTooltip] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  const [medidas, setMedidas] = useState([])
  const [medidaData, setMedidaData] = useState(new Date().toISOString().split('T')[0])
  const [novaMedida, setNovaMedida] = useState({ peso: '', cintura: '', abdomen: '', braco_dir: '', peito: '', coxa_dir: '' })
  const [savingMedida, setSavingMedida] = useState(false)
  const [medidaGrafico, setMedidaGrafico] = useState('peso')

  const carregarTreinos = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      if (!db) { setErro('Firestore não inicializado.'); setLoading(false); return }
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'historico_treinos'), orderBy('data', 'asc')))
      const treinos = snap.docs.map(d => {
        const raw = d.data()
        return { ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      })
      setTodosTreinos(treinos)
      const nomes = new Set()
      treinos.forEach(t => { if (t.exercicios) t.exercicios.forEach(ex => { if (ex.nome) nomes.add(ex.nome) }) })
      setExercicios([...nomes].sort())
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setLoading(false)
  }, [])

  const carregarMedidas = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'historico_corporal'), orderBy('data', 'desc')))
      setMedidas(snap.docs.map(d => {
        const raw = d.data()
        return { id: d.id, ...raw, data: raw.data?.toDate?.() || (raw.data ? new Date(raw.data) : new Date()) }
      }))
    } catch (err) { setErro(`Erro ao carregar medidas: ${err.message}`) }
  }, [])

  useEffect(() => { carregarTreinos() }, [carregarTreinos])

  const registrarMedida = async () => {
    const camposPreenchidos = CAMPOS_MEDIDA.every(c => novaMedida[c.key] !== '')
    if (!camposPreenchidos) return
    setSavingMedida(true); setErro(null)
    try {
      const registro = { data: new Date(medidaData + 'T12:00:00') }
      CAMPOS_MEDIDA.forEach(c => { registro[c.key] = Number(novaMedida[c.key]) })
      await addDoc(collection(db, 'users', user.uid, 'historico_corporal'), registro)
      setNovaMedida({ peso: '', cintura: '', abdomen: '', braco_dir: '', peito: '', coxa_dir: '' })
      await carregarMedidas()
    } catch (err) { setErro(`Erro ao salvar: ${err.message}`) }
    setSavingMedida(false)
  }

  const dadosTreino = (() => {
    if (!selecionado) return []
    return todosTreinos
      .filter(t => t.exercicios?.some(ex => ex.nome === selecionado))
      .map(t => {
        const ex = t.exercicios.find(e => e.nome === selecionado)
        if (!ex || ex.carga_top == null) return null
        return { data: t.data, carga: ex.carga_top, reps: ex.reps_top }
      })
      .filter(Boolean)
  })()

  const ultimoTreino = dadosTreino.length > 0 ? dadosTreino[dadosTreino.length - 1] : null
  const recorde = dadosTreino.length > 0 ? Math.max(...dadosTreino.map(d => d.carga)) : null
  const metaReps = encontrarMeta(selecionado)
  const tetoMeta = parseMetaTeto(metaReps)
  const atingiuMeta = ultimoTreino && tetoMeta !== Infinity ? ultimoTreino.reps >= tetoMeta : false

  const chartDims = (() => {
    if (dadosTreino.length < 2) return null
    const w = Math.max(window.innerWidth - 32, 280)
    const plotW = w - PAD.left - PAD.right
    const plotH = H - PAD.top - PAD.bottom
    const maxCarga = Math.max(...dadosTreino.map(d => d.carga))
    const ceiling = Math.ceil(maxCarga / 5) * 5 || 5

    const points = dadosTreino.map((d, i) => ({
      ...d,
      x: PAD.left + (i / (dadosTreino.length - 1)) * plotW,
      y: PAD.top + plotH - (d.carga / ceiling) * plotH,
    }))

    const step = Math.max(1, Math.round(ceiling / 4))
    const yTicks = []
    for (let v = 0; v <= ceiling; v += step) {
      yTicks.push({ value: v, y: PAD.top + plotH - (v / ceiling) * plotH })
    }

    return { w, points, yTicks }
  })()

  const ultimaMedida = medidas[0]
  const medidaAnterior = medidas[1]

  function diffValor(atual, anterior) {
    if (atual == null || anterior == null) return null
    return (atual - anterior).toFixed(1)
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Evolução</h1>
        <BarChart3 size={18} className="text-cyan-400" />
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-1 flex">
        <button
          onClick={() => setAba('treino')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            aba === 'treino' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Gráficos de Treino
        </button>
        <button
          onClick={() => { setAba('corporal'); if (medidas.length === 0) carregarMedidas() }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${
            aba === 'corporal' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Medidas Corporais
        </button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}

      {aba === 'treino' ? (
        <>
          {loading ? (
            <p className="text-neutral-600 text-center py-8 text-sm">Carregando...</p>
          ) : !exercicios.length ? (
            <p className="text-neutral-600 text-center py-8 text-sm">Nenhum treino registrado ainda.</p>
          ) : (
            <>
              <div className="relative">
                <select value={selecionado} onChange={e => { setSelecionado(e.target.value); setTooltip(null) }}
                  className="w-full bg-neutral-900/50 backdrop-blur-md border border-white/5 text-white p-4 rounded-2xl text-sm appearance-none outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all">
                  <option value="">Selecionar exercício</option>
                  {exercicios.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-neutral-500">
                  <Dumbbell size={16} />
                </div>
              </div>

              {selecionado && dadosTreino.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1">
                    <Trophy size={16} className="text-cyan-400" />
                    <span className="text-lg font-bold text-white tracking-tight">{recorde} <span className="text-xs font-normal text-neutral-400">kg</span></span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Recorde Absoluto</span>
                  </div>

                  <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1">
                    <Flame size={16} className="text-emerald-400" />
                    <span className="text-lg font-bold text-white tracking-tight">
                      {ultimoTreino.carga} <span className="text-xs font-normal text-neutral-400">kg</span>
                      <span className="text-base text-neutral-300 font-normal"> × </span>
                      {ultimoTreino.reps}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Última Top Set</span>
                  </div>

                  <div className={`rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1 border ${
                    atingiuMeta ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'
                  }`}>
                    <Target size={16} className={atingiuMeta ? 'text-emerald-400' : 'text-cyan-400'} />
                    <span className={`text-sm font-bold tracking-tight ${atingiuMeta ? 'text-emerald-400' : 'text-cyan-400'}`}>
                      {atingiuMeta ? 'Subir Carga! 🔥' : 'Buscar +1 Rep 🎯'}
                    </span>
                    <span className="text-[9px] text-neutral-500 uppercase tracking-wider">Próximo Objetivo</span>
                  </div>
                </div>
              )}

              {!selecionado && <p className="text-neutral-600 text-center py-8 text-sm">Escolha um exercício.</p>}

              {selecionado && dadosTreino.length < 2 && (
                <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 text-center">
                  <Dumbbell size={28} className="mx-auto text-neutral-700 mb-3" />
                  <p className="text-neutral-500 text-sm">
                    {dadosTreino.length === 0 ? 'Sem dados ainda. Vá treinar!' : 'Mais um treino para gerar o gráfico.'}
                  </p>
                </div>
              )}

              {selecionado && dadosTreino.length >= 2 && chartDims && (
                <div className="relative bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-2">
                  <svg viewBox={`0 0 ${chartDims.w} ${H}`} className="w-full h-auto" style={{ touchAction: 'manipulation' }}>
                    <defs>
                      <filter id="line-glow">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {chartDims.yTicks.map(t => (
                      <g key={t.value}>
                        <line x1={PAD.left} y1={t.y} x2={chartDims.w - PAD.right} y2={t.y} stroke="#1a1a1a" strokeWidth="1" />
                        <text x={PAD.left - 8} y={t.y + 3} textAnchor="end" fill="#525252" fontSize="10" fontFamily="Inter, sans-serif">{t.value}</text>
                      </g>
                    ))}
                    {chartDims.points.map((p, i) => (
                      <text key={`l-${i}`} x={p.x} y={H - 8} textAnchor="middle" fill="#525252" fontSize="9" fontFamily="Inter, sans-serif">
                        {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </text>
                    ))}
                    <polyline fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
                      filter="url(#line-glow)" points={chartDims.points.map(p => `${p.x},${p.y}`).join(' ')} />
                    {chartDims.points.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="5" fill="#050505" stroke="#34d399" strokeWidth="2.5"
                        className="cursor-pointer transition-all" style={{ filter: 'drop-shadow(0 0 4px rgba(52,211,153,0.4))' }}
                        onClick={() => setTooltip(tooltip === i ? null : i)} />
                    ))}
                  </svg>
                  {tooltip !== null && chartDims.points[tooltip] && (
                    <div className="absolute bg-neutral-800 text-white text-xs px-3 py-1.5 rounded-xl shadow-lg z-10 border border-white/10 backdrop-blur-md"
                      style={{ left: Math.min(chartDims.points[tooltip].x - 35, chartDims.w - 85), top: Math.max(chartDims.points[tooltip].y - 40, 4) }}>
                      <p className="font-bold text-emerald-400">{chartDims.points[tooltip].carga} kg</p>
                      <p className="text-neutral-400 text-[10px]">
                        {chartDims.points[tooltip].data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {selecionado && dadosTreino.length >= 2 && (
                <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
                  <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Últimos registros</span>
                  <div className="space-y-1 mt-2">
                    {[...dadosTreino].reverse().slice(0, 5).map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-1">
                        <span className="text-neutral-500 font-mono text-xs">{d.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        <span className="text-white font-semibold text-sm">{d.carga} kg</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Activity size={12} className="text-cyan-400" /> Novo Registro
            </span>
            <div className="mb-2">
              <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-0.5">Data</label>
              <input type="date" value={medidaData} onChange={e => setMedidaData(e.target.value)}
                className="w-full bg-neutral-800 text-white p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CAMPOS_MEDIDA.map(c => (
                <div key={c.key}>
                  <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-0.5">{c.label} ({c.unidade})</label>
                  <input type="number" inputMode="decimal" placeholder="0"
                    value={novaMedida[c.key]}
                    onChange={e => setNovaMedida(p => ({ ...p, [c.key]: e.target.value }))}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-700 p-3 rounded-xl text-sm text-center outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              ))}
            </div>
            <button onClick={registrarMedida} disabled={savingMedida || CAMPOS_MEDIDA.some(c => novaMedida[c.key] === '')}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-3 rounded-xl text-sm transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed">
              {savingMedida ? <><Save size={16} className="animate-spin" /> Salvando...</> : <><Save size={16} /> Registrar Medidas</>}
            </button>
          </div>

          {medidas.length > 0 && ultimaMedida && (
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                <Weight size={12} className="text-cyan-400" /> Último Registro
              </span>
              <div className="grid grid-cols-3 gap-2">
                {CAMPOS_MEDIDA.map(c => {
                  const atual = ultimaMedida[c.key]
                  const ant = medidaAnterior ? medidaAnterior[c.key] : null
                  const diff = diffValor(atual, ant)
                  const melhorou = c.lowerBetter ? diff < 0 : diff > 0

                  return (
                    <div key={c.key} className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                      <div className="text-xs text-neutral-500 font-mono mb-0.5">{c.label}</div>
                      <div className="text-base font-bold text-white tracking-tight">
                        {atual} <span className="text-[10px] font-normal text-neutral-500">{c.unidade}</span>
                      </div>
                      {diff !== null && (
                        <div className={`flex items-center justify-center gap-0.5 text-[10px] font-mono mt-0.5 ${
                          diff === 0 ? 'text-neutral-500' : melhorou ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {diff === 0 ? <Minus size={10} /> : diff > 0 ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                          {Math.abs(diff).toFixed(1)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {medidas.length >= 2 && (
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-cyan-400" /> Evolução Gráfica
              </span>
              <div className="relative mb-2">
                <select value={medidaGrafico} onChange={e => setMedidaGrafico(e.target.value)}
                  className="w-full bg-neutral-800 text-white p-3 rounded-xl text-xs appearance-none outline-none focus:ring-2 focus:ring-cyan-400/30 transition-all">
                  {CAMPOS_MEDIDA.map(c => <option key={c.key} value={c.key}>{c.label} ({c.unidade})</option>)}
                </select>
              </div>
              {(() => {
                const sorted = [...medidas].sort((a, b) => a.data - b.data)
                const valores = sorted.map(m => m[medidaGrafico]).filter(v => v != null)
                if (valores.length < 2) return <p className="text-neutral-600 text-xs text-center py-4">Mais registros para gerar gráfico.</p>
                const maxVal = Math.max(...valores)
                const minVal = Math.min(...valores)
                const margem = (maxVal - minVal) * 0.15 || maxVal * 0.15 || 5
                const ceiling = Math.ceil((maxVal + margem) / 5) * 5
                const floor = Math.floor(Math.max(minVal - margem, 0) / 5) * 5
                const gH = 200
                const gPad = { top: 16, right: 12, bottom: 32, left: 40 }
                const gW = Math.max(window.innerWidth - 64, 240)
                const plotW = gW - gPad.left - gPad.right
                const plotH = gH - gPad.top - gPad.bottom
                const amplitude = ceiling - floor || 1

                const pontos = sorted.filter(m => m[medidaGrafico] != null).map((m, i, arr) => ({
                  valor: m[medidaGrafico],
                  data: m.data,
                  x: gPad.left + (i / (arr.length - 1)) * plotW,
                  y: gPad.top + plotH - ((m[medidaGrafico] - floor) / amplitude) * plotH,
                }))

                const yTicks = []
                const step = Math.max(1, Math.round((ceiling - floor) / 4))
                for (let v = floor; v <= ceiling; v += step) {
                  yTicks.push({ valor: v, y: gPad.top + plotH - ((v - floor) / amplitude) * plotH })
                }

                const campo = CAMPOS_MEDIDA.find(c => c.key === medidaGrafico)
                return (
                  <svg viewBox={`0 0 ${gW} ${gH}`} className="w-full h-auto" style={{ touchAction: 'manipulation' }}>
                    <defs>
                      <filter id="m-glow">
                        <feGaussianBlur stdDeviation="2.5" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>
                    {yTicks.map(t => (
                      <g key={t.valor}>
                        <line x1={gPad.left} y1={t.y} x2={gW - gPad.right} y2={t.y} stroke="#1a1a1a" strokeWidth="1" />
                        <text x={gPad.left - 6} y={t.y + 3} textAnchor="end" fill="#525252" fontSize="9" fontFamily="Inter, sans-serif">{t.valor}</text>
                      </g>
                    ))}
                    {pontos.map((p, i) => (
                      <text key={`xl-${i}`} x={p.x} y={gH - 6} textAnchor="middle" fill="#525252" fontSize="8" fontFamily="Inter, sans-serif">
                        {p.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </text>
                    ))}
                    <polyline fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                      filter="url(#m-glow)" points={pontos.map(p => `${p.x},${p.y}`).join(' ')} />
                    {pontos.map((p, i) => (
                      <circle key={i} cx={p.x} cy={p.y} r="4" fill="#050505" stroke="#22d3ee" strokeWidth="2"
                        style={{ filter: 'drop-shadow(0 0 3px rgba(34,211,238,0.4))' }} />
                    ))}
                  </svg>
                )
              })()}
            </div>
          )}

          {medidas.length > 1 && (
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Activity size={12} className="text-cyan-400" /> Histórico
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-neutral-600 border-b border-white/5">
                      <th className="text-left py-2 pr-2 font-medium">Data</th>
                      {CAMPOS_MEDIDA.map(c => <th key={c.key} className="text-center py-2 px-1 font-medium">{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {medidas.map((m, i) => (
                      <tr key={m.id || i} className="border-b border-white/5 last:border-0">
                        <td className="text-neutral-500 font-mono py-2 pr-2 whitespace-nowrap">
                          {m.data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </td>
                        {CAMPOS_MEDIDA.map(c => (
                          <td key={c.key} className="text-center text-white font-mono py-2 px-1">{m[c.key]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {medidas.length === 0 && !loading && (
            <p className="text-neutral-600 text-center py-8 text-sm">Nenhuma medida registrada ainda.</p>
          )}
        </>
      )}
    </div>
  )
}
