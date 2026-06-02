import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { REFEICOES as REF_BASE, METAS_DIARIAS } from '../../config/dieta'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { Apple, Plus, X, Check, Settings, Sparkles, Loader, Eye, EyeOff, ChevronLeft, ChevronRight, Pencil } from 'lucide-react'

function hojeId() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
}

function formatMesKey(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`
}

function inicioMes(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}-01`
}

function fimMes(ano, mes) {
  const ultimo = new Date(ano, mes, 0).getDate()
  return `${ano}-${String(mes).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}`
}

function diasNoMes(ano, mes) { return new Date(ano, mes, 0).getDate() }

function refeicaoVazia() {
  return { status: 'pendente', substituto: null, extra: [] }
}

function diaVazio(data, refs) {
  const obj = {}
  const base = refs?.length > 0 ? refs : REF_BASE
  base.forEach(r => { obj[r.id] = refeicaoVazia() })
  return { data: data || hojeId(), refeicoes: obj, extras_globais: [] }
}

function calcularTotais(dia, refs) {
  const t = { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  if (!dia?.refeicoes) return t
  refs.forEach(ref => {
    const r = dia.refeicoes[ref.id]
    if (!r || r.status === 'pendente') return
    if (r.status === 'customizado' && r.substituto) {
      t.kcal += (r.substituto.proteinas * 4 + r.substituto.carboidratos * 4 + r.substituto.gorduras * 9)
      t.proteinas += Number(r.substituto.proteinas) || 0
      t.carboidratos += Number(r.substituto.carboidratos) || 0
      t.gorduras += Number(r.substituto.gorduras) || 0
    } else if (r.status === 'limpo' || r.status === 'livre') {
      t.kcal += ref.kcal
      t.proteinas += ref.proteinas
      t.carboidratos += ref.carboidratos
      t.gorduras += ref.gorduras
    }
    ;(r.extra || []).forEach(e => {
      t.kcal += (Number(e.proteinas) * 4 + Number(e.carboidratos) * 4 + Number(e.gorduras) * 9)
      t.proteinas += Number(e.proteinas) || 0
      t.carboidratos += Number(e.carboidratos) || 0
      t.gorduras += Number(e.gorduras) || 0
    })
  })
  ;(dia.extras_globais || []).forEach(e => {
    t.kcal += Number(e.kcal) || 0
    t.proteinas += Number(e.proteinas) || 0
    t.carboidratos += Number(e.carboidratos) || 0
    t.gorduras += Number(e.gorduras) || 0
  })
  return t
}

function clonarRefs(refs) {
  return refs.map(r => ({ ...r }))
}

export default function Dieta({ onIrParaConfig }) {
  const user = useUser()
  const [aba, setAba] = useState('diario')
  const [dataAtiva, setDataAtiva] = useState(hojeId())
  const [hoje, setHoje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formCustom, setFormCustom] = useState({ proteinas: '', carboidratos: '', gorduras: '' })
  const [refs, setRefs] = useState(clonarRefs(REF_BASE))
  const refsRef = useRef(refs)
  useEffect(() => { refsRef.current = refs }, [refs])
  const [extraGlobal, setExtraGlobal] = useState({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
  const [editandoExtraIdx, setEditandoExtraIdx] = useState(null)
  const [mesDocs, setMesDocs] = useState([])
  const [mesAtual, setMesAtual] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 })
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [aiKey, setAiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '')
  const [aiKeyVisible, setAiKeyVisible] = useState(false)
  const [userMetas, setUserMetas] = useState(METAS_DIARIAS)
  const [toast, setToast] = useState(null)

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2000)
    return () => clearTimeout(t)
  }, [toast])

  const showToast = (msg, tipo) => setToast({ msg, tipo })

  const carregarHoje = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'diario_dieta', dataAtiva))
      if (snap.exists()) {
        const data = snap.data()
        if (!data.refeicoes) data.refeicoes = {}
        // Sincroniza refeições que o usuário criou depois deste dia
        refsRef.current.forEach(r => { if (!data.refeicoes[r.id]) data.refeicoes[r.id] = refeicaoVazia() })
        setHoje(data)
      } else setHoje(diaVazio(dataAtiva, refsRef.current))
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setLoading(false)
  }, [dataAtiva])

  const carregarBase = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
      if (snap.exists()) {
        const data = snap.data()
        if (data.refeicoes) setRefs(clonarRefs(data.refeicoes))
        if (data.metas) setUserMetas(data.metas)
      }
    } catch {
      showToast('Erro ao carregar configuração. Usando valores padrão.', 'erro')
    }
  }, [])

  const carregarMes = useCallback(async (ano, mes) => {
    try {
      const ini = inicioMes(ano, mes)
      const fim = fimMes(ano, mes)
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'diario_dieta'), where('data', '>=', ini), where('data', '<=', fim)))
      setMesDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { setErro(`Erro: ${err.message}`) }
  }, [])

  useEffect(() => { carregarBase() }, [carregarBase])
  useEffect(() => { carregarHoje() }, [carregarHoje])

  // Carrega dados do mês ativo no mount para o heatmap
  useEffect(() => { carregarMes(mesAtual.ano, mesAtual.mes) }, [])

  useEffect(() => { setLoading(true) }, [dataAtiva])

  const recarregarMes = useCallback(() => {
    carregarMes(mesAtual.ano, mesAtual.mes)
  }, [mesAtual, carregarMes])

  const salvarHoje = useCallback(async (data, novo) => {
    try {
      await setDoc(doc(db, 'users', user.uid, 'diario_dieta', data), { ...novo, data, updatedAt: serverTimestamp() })
      setHoje(novo)
      showToast('✓ Salvo', 'sucesso')
      recarregarMes()
    } catch (err) {
      setErro(`Erro ao salvar. Verifique sua conexão.`)
      showToast('Erro ao salvar. Verifique sua conexão.', 'erro')
    }
  }, [recarregarMes])

  const confirmar = (id) => {
    const card = document.getElementById(`refeicao-card-${id}`)
    if (card) {
      card.classList.add('card-complete-glow')
      setTimeout(() => card.classList.remove('card-complete-glow'), 500)
    }
    const anterior = hoje?.refeicoes?.[id] || null
    let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
    if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
    const a = n.refeicoes[id]
    n.refeicoes[id] = a.status === 'limpo'
      ? { status: 'pendente', substituto: null, extra: a.extra || [] }
      : { ...a, status: 'limpo', substituto: null }
    salvarHoje(dataAtiva, n)
    if (a.status !== 'limpo') {
      setToast({ msg: 'Refeição concluída!', tipo: 'sucesso', acao: () => {
        const revertido = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
        revertido.refeicoes[id] = a.status === 'limpo'
          ? { status: 'pendente', substituto: null, extra: a.extra || [] }
          : { ...a, status: a.status || 'pendente', substituto: null, extra: a.extra || [] }
        salvarHoje(dataAtiva, revertido)
        setToast({ msg: '✓ Desfeito!', tipo: 'sucesso', acao: null })
      }})
    }
  }

  const pular = (id) => {
    const atual = hoje?.refeicoes?.[id]
    if (atual?.status === 'pendente' && !window.confirm('Tem certeza que deseja pular esta refeição?')) return
    let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
    if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
    const a = n.refeicoes[id]
    n.refeicoes[id] = a.status === 'pulado'
      ? { status: 'pendente', substituto: null, extra: a.extra || [] }
      : { status: 'pulado', substituto: null, extra: a.extra || [] }
    salvarHoje(dataAtiva, n)
  }

  const abrirCustom = (id) => {
    const ref = refs.find(r => r.id === id)
    setEditando(id)
    setFormCustom({ proteinas: String(ref.proteinas), carboidratos: String(ref.carboidratos), gorduras: String(ref.gorduras) })
  }

  function validarNumero(valor, min, max, nome) {
    const v = parseFloat(String(valor || '').replace(',', '.'))
    if (isNaN(v) || v < min || v > max) { setErro(`${nome} inválido — deve ser entre ${min} e ${max}.`); return null }
    return v
  }

  const salvarCustom = (id) => {
    const p = validarNumero(formCustom.proteinas, 0, 9999, 'Proteínas')
    const c = validarNumero(formCustom.carboidratos, 0, 9999, 'Carboidratos')
    const g = validarNumero(formCustom.gorduras, 0, 9999, 'Gorduras')
    if (p === null || c === null || g === null) return
    let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
    if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
    n.refeicoes[id] = {
      ...n.refeicoes[id], status: 'customizado',
      substituto: {
        nome: refs.find(r => r.id === id)?.nome || '',
        proteinas: p,
        carboidratos: c,
        gorduras: g,
      },
    }
    salvarHoje(dataAtiva, n)
    setEditando(null)
    setFormCustom({ proteinas: '', carboidratos: '', gorduras: '' })
  }

  // Extra global: adicionar ou editar
  const adicionarExtraGlobal = () => {
    if (!extraGlobal.nome.trim()) return
    const kcal = validarNumero(extraGlobal.kcal, 0, 99999, 'Kcal')
    const p = validarNumero(extraGlobal.proteinas, 0, 9999, 'Proteínas')
    const c = validarNumero(extraGlobal.carboidratos, 0, 9999, 'Carboidratos')
    const g = validarNumero(extraGlobal.gorduras, 0, 9999, 'Gorduras')
    if (kcal === null || p === null || c === null || g === null) return
    const n = { ...hoje, extras_globais: [...(hoje.extras_globais || [])] }
    const item = { ...extraGlobal, kcal, proteinas: p, carboidratos: c, gorduras: g }
    if (editandoExtraIdx !== null) {
      n.extras_globais[editandoExtraIdx] = item
    } else {
      n.extras_globais.push(item)
    }
    salvarHoje(dataAtiva, n)
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
    setEditandoExtraIdx(null)
  }

  const cancelarExtra = () => {
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
    setEditandoExtraIdx(null)
  }

  const editarExtra = (idx) => {
    const e = hoje?.extras_globais?.[idx]
    if (!e) return
    setExtraGlobal({
      nome: e.nome || '',
      kcal: String(e.kcal || ''),
      proteinas: String(e.proteinas || ''),
      carboidratos: String(e.carboidratos || ''),
      gorduras: String(e.gorduras || ''),
    })
    setEditandoExtraIdx(idx)
  }

  const removerExtraGlobal = (idx) => {
    const n = { ...hoje, extras_globais: (hoje.extras_globais || []).filter((_, i) => i !== idx) }
    salvarHoje(dataAtiva, n)
    if (editandoExtraIdx === idx) cancelarExtra()
  }

  // IA Gemini via SDK direto (Cloud Function requer plano Blaze)
  const analisarComIA = async () => {
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true); setErro(null)
    const parsed = await calcularMacrosIA(aiInput)
    if (parsed._erro) {
      setErro(parsed._erro)
    } else {
      setExtraGlobal({
        nome: parsed.nome || 'Analisado por IA',
        kcal: String(parsed.kcal || 0),
        proteinas: String(parsed.proteinas || 0),
        carboidratos: String(parsed.carboidratos || 0),
        gorduras: String(parsed.gorduras || 0),
      })
      setAiInput('')
      showToast('✓ Campos preenchidos automaticamente', 'sucesso')
    }
    setAiLoading(false)
  }

  const totais = calcularTotais(hoje, refs)

  const corMeta = (atual, meta) => {
    const p = meta > 0 ? (atual / meta) * 100 : 0
    if (p >= 100) return 'from-emerald-500 to-cyan-500'
    if (p >= 75) return 'from-emerald-500/80 to-emerald-400/60'
    if (p >= 50) return 'from-cyan-500/60 to-cyan-400/40'
    return 'from-neutral-600 to-neutral-500'
  }

  const hojeData = new Date()
  const podeAvancar = mesAtual.ano < hojeData.getFullYear() || (mesAtual.ano === hojeData.getFullYear() && mesAtual.mes < hojeData.getMonth() + 1)

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 z-50 flex items-center justify-center pointer-events-none`}>
          <div className={`px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg backdrop-blur-md flex items-center gap-3 ${
            toast.tipo === 'sucesso' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            <span>{toast.msg}</span>
            {toast.acao && (
              <button onClick={() => { toast.acao(); setToast(null) }}
                className="bg-white/10 hover:bg-white/20 text-white font-bold px-3 py-1 rounded-lg text-[10px] transition-all active:scale-90">
                Desfazer
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Dieta</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => onIrParaConfig?.()}
            className="text-neutral-500 hover:text-neutral-300 icon-hover p-2 rounded-xl"><Settings size={16} /></button>
          <Apple size={18} className="text-cyan-400" />
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-1 flex">
        <button onClick={() => setAba('diario')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'diario' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Diário</button>
        <button onClick={() => { setAba('estatisticas'); if (mesDocs.length === 0) carregarMes(mesAtual.ano, mesAtual.mes) }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'estatisticas' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Estatísticas</button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}

      {aba === 'diario' ? (
        loading ? (
          <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
        ) : (
          <>
            {dataAtiva !== hojeId() && (
              <div className="flex items-center justify-between bg-cyan-500/10 backdrop-blur-md border border-cyan-500/20 rounded-2xl px-4 py-3">
                <span className="text-cyan-400 text-xs font-medium">
                  📅 Editando o histórico do dia {new Date(dataAtiva + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <button onClick={() => setDataAtiva(hojeId())}
                  className="text-cyan-400/70 hover:text-cyan-400 text-[11px] font-semibold bg-cyan-500/10 px-3 py-1.5 rounded-lg transition-all active:scale-90">
                  Voltar para Hoje
                </button>
              </div>
            )}
            <div className="card-premium p-4 space-y-3">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Progresso Hoje</span>
              {[
                { key: 'kcal', label: 'Calorias', atual: Math.round(totais.kcal), meta: userMetas.kcal, u: 'kcal' },
                { key: 'proteinas', label: 'Proteínas', atual: Math.round(totais.proteinas), meta: userMetas.proteinas, u: 'g' },
                { key: 'carboidratos', label: 'Carboidratos', atual: Math.round(totais.carboidratos), meta: userMetas.carboidratos, u: 'g' },
                { key: 'gorduras', label: 'Gorduras', atual: Math.round(totais.gorduras), meta: userMetas.gorduras, u: 'g' },
              ].map(item => {
                const pct = Math.min((item.atual / item.meta) * 100, 100)
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-400">{item.label}</span>
                      <span className="text-white font-semibold font-mono">{item.atual} <span className="text-neutral-500 font-normal">/ {item.meta}{item.u}</span></span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full bg-gradient-to-r ${corMeta(item.atual, item.meta)} transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {refs.map(ref => {
              const r = hoje?.refeicoes?.[ref.id] || refeicaoVazia()
              const eLimpo = r.status === 'limpo'
              const eCustom = r.status === 'customizado'
              const ePulado = r.status === 'pulado'

              return (
                <div key={ref.id} id={`refeicao-card-${ref.id}`} className={`card-premium p-4 space-y-2 transition-all ${
                  eLimpo ? 'border-emerald-500/30' : eCustom ? 'border-yellow-500/30' : ePulado ? 'opacity-40' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-semibold text-sm tracking-tight">{ref.nome}</span>
                      <span className="text-neutral-500 text-xs ml-2 font-mono">{ref.horario}</span>
                    </div>
                    <span className={`text-[10px] font-mono ${
                      eLimpo ? 'text-emerald-400' : eCustom ? 'text-yellow-400' : ePulado ? 'text-neutral-500' : 'text-neutral-600'
                    }`}>
                      {eLimpo ? '✓ Concluído' : eCustom ? 'Customizado' : ePulado ? 'Pulado' : 'Pendente'}
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-500 font-mono">{ref.alimentos?.join(' · ') || ref.nome}</div>

                  <div className="flex items-center gap-2 pt-1">
                    <button onClick={() => confirmar(ref.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        eLimpo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-emerald-500/30'
                      }`}>
                      {eLimpo ? <><Check size={14} /> Concluído</> : '◯ Confirmar'}
                    </button>
                    <button onClick={() => eCustom ? setEditando(null) : abrirCustom(ref.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        eCustom ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-yellow-500/30'
                      }`}>
                      ✏️ {eCustom ? 'Editando' : 'Modificar'}
                    </button>
                    <button onClick={() => pular(ref.id)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        ePulado ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-red-500/30'
                      }`}>
                      ❌ {ePulado ? 'Pulado' : 'Pular'}
                    </button>
                  </div>

                  {editando === ref.id && (
                    <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-neutral-400">Customizar Macros</span>
                        <button onClick={() => { setEditando(null); setFormCustom({ proteinas: '', carboidratos: '', gorduras: '' }) }} className="text-neutral-500 hover:text-white" aria-label="Fechar"><X size={14} /></button>
                      </div>
                      {['proteinas', 'carboidratos', 'gorduras'].map(c => (
                        <div key={c}>
                          <label className="text-[8px] text-neutral-600 uppercase block mb-0.5">{c === 'proteinas' ? 'Proteínas (g)' : c === 'carboidratos' ? 'Carboidratos (g)' : 'Gorduras (g)'}</label>
                          <input type="number" inputMode="decimal" value={formCustom[c]}
                            onChange={e => setFormCustom(p => ({ ...p, [c]: e.target.value }))}
                            className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-xs text-center outline-none focus:ring-2 focus:ring-yellow-400/30 [appearance:textfield]" />
                        </div>
                      ))}
                      <button onClick={() => salvarCustom(ref.id)}
                        className="w-full bg-yellow-500/10 text-yellow-400 font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-95 border border-yellow-500/20">Aplicar Macros</button>
                    </div>
                  )}
                </div>
              )
            })}

            <div className="bg-neutral-900/50 backdrop-blur-md border border-cyan-500/20 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">
                {editandoExtraIdx !== null ? '✏️ Editar Alimento' : '+ Alimento Extra / Fora da Dieta'}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" placeholder="Nome" value={extraGlobal.nome}
                  onChange={e => setExtraGlobal(p => ({ ...p, nome: e.target.value }))}
                  className="col-span-2 w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-400/30" />
                {['kcal', 'proteinas', 'carboidratos', 'gorduras'].map(c => (
                  <input key={c} type="number" inputMode="decimal" placeholder={c}
                    value={extraGlobal[c]}
                    onChange={e => setExtraGlobal(p => ({ ...p, [c]: e.target.value }))}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-xs text-center outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                ))}
              </div>
              <div className="flex gap-2">
                {editandoExtraIdx !== null && (
                  <button onClick={cancelarExtra}
                    className="btn-secondary flex-1 py-3 text-xs">Cancelar</button>
                )}
                <button onClick={adicionarExtraGlobal}
                  disabled={!extraGlobal.nome.trim()}
                  className="flex-1 btn-primary w-full py-3 flex items-center justify-center gap-1">
                  <Plus size={14} /> {editandoExtraIdx !== null ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
              {(hoje?.extras_globais || []).map((e, i) => (
                <div key={i} className="flex items-center justify-between bg-cyan-500/5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-cyan-400/80 border border-cyan-500/10">
                  <span>+ {e.nome} — {e.kcal || 0} kcal · P: {e.proteinas || 0} · C: {e.carboidratos || 0} · G: {e.gorduras || 0}</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => editarExtra(i)} className="icon-hover text-amber-400/70"><Pencil size={13} /></button>
                    <button onClick={() => removerExtraGlobal(i)} className="text-red-400/60 hover:text-red-400 transition-all active:scale-90"><X size={13} /></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-purple-500/20 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={13} /> Destrinchar Refeição com IA
              </span>
              <textarea rows={2} placeholder="Ex: Comi uma parmegiana de frango com arroz no almoço..."
                value={aiInput} onChange={e => setAiInput(e.target.value)}
                className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-400/30 resize-none" />
              <button onClick={analisarComIA} disabled={!aiInput.trim() || aiLoading}
                className="w-full flex items-center justify-center gap-2 bg-purple-500/10 text-purple-400 font-semibold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30 border border-purple-500/20">
                {aiLoading ? <><Loader size={14} className="animate-spin" /> Analisando...</> : <><Sparkles size={14} /> Analisar Prato 🚀</>}
              </button>
            </div>

            <div className="card-premium p-4">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Total do Dia</span>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[
                  { label: 'Calorias', v: Math.round(totais.kcal), m: userMetas.kcal, u: 'kcal' },
                  { label: 'Proteínas', v: Math.round(totais.proteinas), m: userMetas.proteinas, u: 'g' },
                  { label: 'Carbo', v: Math.round(totais.carboidratos), m: userMetas.carboidratos, u: 'g' },
                  { label: 'Gorduras', v: Math.round(totais.gorduras), m: userMetas.gorduras, u: 'g' },
                ].map(item => (
                  <div key={item.label} className="bg-black/30 rounded-xl p-2 text-center border border-white/5">
                    <div className="text-[9px] text-neutral-500 font-mono">{item.label}</div>
                    <div className="text-sm font-bold text-white">{item.v}</div>
                    <div className="text-[9px] text-neutral-600">{item.m}{item.u}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )
      ) : (
        <PainelEstatisticas
          mesDocs={mesDocs}
          carregarMes={carregarMes}
          userMetas={userMetas}
          refs={refs}
          mesAtual={mesAtual}
          setMesAtual={setMesAtual}
          podeAvancar={podeAvancar}
          onDayClick={(data) => { setDataAtiva(data); setAba('diario') }}
        />
      )}
    </div>
  )
}

function PainelEstatisticas({ mesDocs, carregarMes, userMetas, refs, mesAtual, setMesAtual, podeAvancar, onDayClick }) {
  useEffect(() => {
    carregarMes(mesAtual.ano, mesAtual.mes)
  }, [mesAtual])

  const { ano, mes } = mesAtual
  const totalDias = diasNoMes(ano, mes)
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^(\w)/, l => l.toUpperCase())

  function corDia(dataStr) {
    const doc = diasMap[dataStr]
    if (!doc) return { backgroundColor: 'rgb(38 38 38 / 0.4)' }
    const kcal = kcalDoDia(doc)
    if (kcal === 0) return { backgroundColor: 'rgb(38 38 38 / 0.4)' }
    if (kcal <= 2000) return { backgroundColor: 'rgb(34 197 94 / 0.4)' }
    if (kcal <= 2250) return { backgroundColor: 'rgb(245 158 11 / 0.4)' }
    return { backgroundColor: 'rgb(239 68 68 / 0.4)' }
  }

  function kcalDoDia(doc) {
    if (!doc?.refeicoes) return 0
    let total = 0
    Object.entries(doc.refeicoes).forEach(([id, r]) => {
      if (!r || r.status === 'pendente' || r.status === 'pulado') return
      const ref = refs.find(m => m.id === id)
      if (r.status === 'customizado' && r.substituto) {
        total += (Number(r.substituto.proteinas) * 4 + Number(r.substituto.carboidratos) * 4 + Number(r.substituto.gorduras) * 9)
      } else if ((r.status === 'limpo' || r.status === 'livre') && ref) {
        total += ref.kcal
      }
      ;(r.extra || []).forEach(e => {
        total += (Number(e.proteinas) * 4 + Number(e.carboidratos) * 4 + Number(e.gorduras) * 9)
      })
    })
    ;(doc.extras_globais || []).forEach(e => { total += Number(e.kcal) || 0 })
    return total
  }

  let greenDays = 0; let yellowDays = 0; let redDays = 0; let totalDiasComDado = 0
  const diasMap = {}

  mesDocs.forEach(d => {
    diasMap[d.data] = d
    if (!d.refeicoes) return
    const refs = Object.values(d.refeicoes)
    const todosPendentes = refs.every(r => !r || r.status === 'pendente')
    if (todosPendentes) return
    totalDiasComDado++
    const temLivre = refs.some(r => r?.status === 'livre')
    const temPuladoMaisDeUm = refs.filter(r => r?.status === 'pulado').length > 1
    const temCustom = refs.some(r => r?.status === 'customizado') || (d.extras_globais || []).length > 0
    const temPulado = refs.some(r => r?.status === 'pulado')
    if (temLivre || temPuladoMaisDeUm) redDays++
    else if (temCustom || temPulado) yellowDays++
    else greenDays++
  })

  

  const aderencia = totalDiasComDado > 0 ? Math.round((greenDays / totalDiasComDado) * 100) : 0

  const diasArray = []
  for (let d = 1; d <= totalDias; d++) {
    diasArray.push({ dia: d, data: `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  const hoje = new Date()
  const voltarMes = () => {
    if (mes === 1) setMesAtual({ ano: ano - 1, mes: 12 })
    else setMesAtual({ ano, mes: mes - 1 })
  }

  const avancarMes = () => {
    if (!podeAvancar) return
    if (mes === 12) setMesAtual({ ano: ano + 1, mes: 1 })
    else setMesAtual({ ano, mes: mes + 1 })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="card-premium p-4 text-center">
          <span className="text-2xl font-bold text-white">{totalDiasComDado}</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Dias no mês</span>
        </div>
        <div className="card-premium p-4 text-center">
          <span className="text-2xl font-bold text-emerald-400">{aderencia}%</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Aderência</span>
        </div>
      </div>

      <div className="card-premium p-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-400 font-medium">{greenDays} Dias 🟢</span>
          <span className="text-yellow-400 font-medium">{yellowDays} Dias 🟡</span>
          <span className="text-red-400 font-medium">{redDays} Dias 🔴</span>
        </div>
        <div className="h-2 bg-neutral-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-emerald-500/60" style={{ width: `${totalDiasComDado > 0 ? (greenDays / totalDiasComDado) * 100 : 0}%` }} />
          <div className="h-full bg-yellow-500/60" style={{ width: `${totalDiasComDado > 0 ? (yellowDays / totalDiasComDado) * 100 : 0}%` }} />
          <div className="h-full bg-red-500/60" style={{ width: `${totalDiasComDado > 0 ? (redDays / totalDiasComDado) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={voltarMes}
            className="border border-white/10 rounded-xl p-2 text-white/60 hover:text-white transition-all active:scale-90">
            <ChevronLeft size={16} />
          </button>
          <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">{nomeMes}</span>
          <button onClick={avancarMes} disabled={!podeAvancar}
            className={`border rounded-xl p-2 transition-all active:scale-90 ${podeAvancar ? 'border-white/10 text-white/60 hover:text-white' : 'border-transparent text-neutral-700 cursor-not-allowed'}`}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {diasSemana.map(d => <div key={d} className="text-[8px] text-neutral-600 text-center font-medium py-1">{d}</div>)}
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
          {diasArray.map(({ dia, data }) => (
            <button key={data} onClick={() => onDayClick?.(data)}
              className={`aspect-square rounded-md flex items-center justify-center transition-all active:scale-90`}
              style={corDia(data)}>
              <span className="text-[9px] text-neutral-400 font-mono">{dia}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-neutral-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> ≤2000</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/40" /> 2001-2250</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40" /> &gt;2250</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-800" /> Sem dados</span>
        </div>
      </div>
    </div>
  )
}
