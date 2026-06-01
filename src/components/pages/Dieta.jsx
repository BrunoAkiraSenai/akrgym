import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, getDocs, collection, query, where } from 'firebase/firestore'
import { db } from '../../firebase'
import { REFEICOES as REF_BASE, METAS_DIARIAS } from '../../config/dieta'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { Apple, Plus, X, Check, Settings, Sparkles, Loader, Eye, EyeOff } from 'lucide-react'

function hojeId() { return new Date().toISOString().split('T')[0] }

function inicioMes() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function diasNoMes(ano, mes) { return new Date(ano, mes, 0).getDate() }

function refeicaoVazia() {
  return { status: 'pendente', substituto: null, extra: [] }
}

function diaVazio(data) {
  const obj = {}
  REF_BASE.forEach(r => { obj[r.id] = refeicaoVazia() })
  return { data: data || hojeId(), refeicoes: obj, extras_globais: [] }
}

function calcularTotais(dia, refs) {
  const t = { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }
  if (!dia?.refeicoes) return t

  refs.forEach(ref => {
    const r = dia.refeicoes[ref.id]
    if (!r || r.status === 'pendente' || r.status === 'pulado') return

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

export default function Dieta({ user }) {
  const [aba, setAba] = useState('diario')
  const [dataAtiva, setDataAtiva] = useState(hojeId())
  const [hoje, setHoje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [editando, setEditando] = useState(null)
  const [formCustom, setFormCustom] = useState({ proteinas: '', carboidratos: '', gorduras: '' })
  const [refs, setRefs] = useState(clonarRefs(REF_BASE))
  const [confAberto, setConfAberto] = useState(false)
  const [extraGlobal, setExtraGlobal] = useState({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
  const [mesDocs, setMesDocs] = useState([])
  const [aiKey, setAiKey] = useState(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '')
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState(null)
  const [userMetas, setUserMetas] = useState(METAS_DIARIAS)
  const [aiKeyVisible, setAiKeyVisible] = useState(false)

  const carregarHoje = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'diario_dieta', dataAtiva))
      if (snap.exists()) {
        const data = snap.data()
        if (!data.refeicoes) data.refeicoes = {}
        REF_BASE.forEach(r => { if (!data.refeicoes[r.id]) data.refeicoes[r.id] = refeicaoVazia() })
        setHoje(data)
      } else setHoje(diaVazio(dataAtiva))
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
    } catch {}
  }, [])

  const carregarMes = useCallback(async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'diario_dieta'), where('data', '>=', inicioMes()), where('data', '<=', hojeId())))
      setMesDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { setErro(`Erro: ${err.message}`) }
  }, [])

  useEffect(() => { carregarHoje(); carregarBase() }, [carregarHoje, carregarBase])

  useEffect(() => { setLoading(true) }, [dataAtiva])

  const salvarHoje = useCallback(async (data, novo) => {
    try { await setDoc(doc(db, 'users', user.uid, 'diario_dieta', data), { ...novo, data }); setHoje(novo) }
    catch (err) { setErro(`Erro: ${err.message}`) }
  }, [])

  const salvarBase = async (novasRefs) => {
    try {
      await setDoc(doc(db, 'users', user.uid, 'config', 'data'), { refeicoes: novasRefs, metas: userMetas }, { merge: true })
      setRefs(novasRefs); setConfAberto(false)
    } catch (err) { setErro(`Erro: ${err.message}`) }
  }

  const confirmar = (id) => {
    let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
    if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
    const a = n.refeicoes[id]
    n.refeicoes[id] = a.status === 'limpo'
      ? { status: 'pendente', substituto: null, extra: a.extra || [] }
      : { ...a, status: 'limpo', substituto: null }
    salvarHoje(dataAtiva, n)
  }

  const pular = (id) => {
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

  const salvarCustom = (id) => {
    if (!formCustom.proteinas && !formCustom.carboidratos && !formCustom.gorduras) return
    let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
    if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
    n.refeicoes[id] = {
      ...n.refeicoes[id], status: 'customizado',
      substituto: {
        nome: refs.find(r => r.id === id)?.nome || '',
        proteinas: Number(formCustom.proteinas),
        carboidratos: Number(formCustom.carboidratos),
        gorduras: Number(formCustom.gorduras),
      },
    }
    salvarHoje(dataAtiva, n)
    setEditando(null)
  }

  const adicionarExtraGlobal = () => {
    if (!extraGlobal.nome.trim() || (!extraGlobal.kcal && !extraGlobal.proteinas && !extraGlobal.carboidratos && !extraGlobal.gorduras)) return
    const n = { ...hoje, extras_globais: [...(hoje.extras_globais || []), { ...extraGlobal, kcal: Number(extraGlobal.kcal), proteinas: Number(extraGlobal.proteinas), carboidratos: Number(extraGlobal.carboidratos), gorduras: Number(extraGlobal.gorduras) }] }
    salvarHoje(dataAtiva, n)
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
  }

  const removerExtraGlobal = (idx) => {
    const n = { ...hoje, extras_globais: (hoje.extras_globais || []).filter((_, i) => i !== idx) }
    salvarHoje(dataAtiva, n)
  }

  const analisarComIA = async () => {
    if (!aiInput.trim() || aiLoading) return
    setAiLoading(true); setAiResult(null); setErro(null)

    try {
      const key = localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY
      if (!key) { setErro('Configure sua chave da API Gemini nas configurações.'); setAiLoading(false); return }

      const genAI = new GoogleGenerativeAI(key)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

      const prompt = `Você é um assistente de nutrição de alta precisão focado estritamente no mercado de alimentação do BRASIL.
Ao analisar a refeição descrita pelo usuário, siga estas diretrizes estritas:
1. Priorize como fontes de dados a tabela TACO (Unicamp), TBCA (USP) e os menus nutricionais oficiais das filiais brasileiras de marcas de fast-food (ex: McDonald's Brasil, Burger King Brasil, Subway Brasil).
2. Se o usuário mencionar pratos regionais ou estabelecimentos locais (ex: 'parmegiana do Omatutinho'), estime o peso e os macros com base no modo de preparo e tamanho de porção tradicional de restaurantes brasileiros.
3. Retorne OBRIGATORIAMENTE apenas um objeto JSON puro, sem formatação markdown (sem \`\`\`json e sem \`\`\` no final), contendo as chaves:
{
  nome: string,
  kcal: number,
  p: number,
  c: number,
  g: number
}
Não adicione nenhum texto explicativo fora do JSON.

Refeição do usuário: "${aiInput}"`

      const result = await model.generateContent(prompt)
      const text = result.response.text().trim()
      const parsed = JSON.parse(text)

      if (parsed.kcal != null && parsed.p != null) {
        setAiResult(parsed)
        setExtraGlobal({
          nome: parsed.nome || 'Analisado por IA',
          kcal: String(parsed.kcal || 0),
          proteinas: String(parsed.p || 0),
          carboidratos: String(parsed.c || 0),
          gorduras: String(parsed.g || 0),
        })
      } else {
        setErro('Resposta inválida da IA. Tente novamente.')
      }
    } catch (err) {
      setErro(`Erro na análise: ${err.message}`)
    }

    setAiLoading(false)
  }

  const aplicarResultadoIA = () => {
    if (!aiResult) return
    adicionarExtraGlobal()
    setAiInput('')
    setAiResult(null)
  }

  const totais = calcularTotais(hoje, refs)

  const corMeta = (atual, meta) => {
    const p = meta > 0 ? (atual / meta) * 100 : 0
    if (p >= 100) return 'from-emerald-500 to-cyan-500'
    if (p >= 75) return 'from-emerald-500/80 to-emerald-400/60'
    if (p >= 50) return 'from-cyan-500/60 to-cyan-400/40'
    return 'from-neutral-600 to-neutral-500'
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Dieta</h1>
        <div className="flex items-center gap-1">
          <button onClick={() => { setConfAberto(true); const c = clonarRefs(refs); setRefs(c) }}
            className="text-neutral-500 hover:text-neutral-300 p-2 rounded-xl transition-all active:scale-90"><Settings size={16} /></button>
          <Apple size={18} className="text-cyan-400" />
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-1 flex">
        <button onClick={() => setAba('diario')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'diario' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'}`}>Diário</button>
        <button onClick={() => { setAba('estatisticas'); if (mesDocs.length === 0) carregarMes() }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'estatisticas' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'}`}>Estatísticas</button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}

      {confAberto && (
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-300">Configurar Base</span>
            <button onClick={() => { setConfAberto(false); setRefs(clonarRefs(REF_BASE)) }} className="text-neutral-500 hover:text-white"><X size={16} /></button>
          </div>

          <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
            <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">Metas Diárias</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'kcal', label: 'Kcal', value: userMetas.kcal },
                { key: 'proteinas', label: 'P (g)', value: userMetas.proteinas },
                { key: 'carboidratos', label: 'C (g)', value: userMetas.carboidratos },
                { key: 'gorduras', label: 'G (g)', value: userMetas.gorduras },
              ].map(c => (
                <div key={c.key}>
                  <label className="text-[8px] text-neutral-600 block mb-0.5">{c.label}</label>
                  <input type="number" value={c.value}
                    onChange={e => setUserMetas(p => ({ ...p, [c.key]: Number(e.target.value) }))}
                    className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                </div>
              ))}
            </div>
          </div>

          {refs.map((ref, i) => (
            <div key={ref.id} className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
              <span className="text-xs text-white font-medium">{ref.nome}</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[ {key:'kcal',label:'Kcal'}, {key:'proteinas',label:'P'}, {key:'carboidratos',label:'C'}, {key:'gorduras',label:'G'} ].map(c => (
                  <div key={c.key}>
                    <label className="text-[8px] text-neutral-600 block mb-0.5">{c.label}</label>
                    <input type="number" value={ref[c.key]}
                      onChange={e => { const n = [...refs]; n[i] = { ...n[i], [c.key]: Number(e.target.value) }; setRefs(n) }}
                      className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-1.5">
            {[ {key:'kcal',label:'Kcal'}, {key:'proteinas',label:'P'}, {key:'carboidratos',label:'C'}, {key:'gorduras',label:'G'} ].map(c => (
              <div key={c.key} className="bg-black/30 rounded-xl p-2 text-center border border-white/5">
                <div className="text-[8px] text-neutral-500">{c.label}</div>
                <div className="text-xs font-bold text-white">{refs.reduce((s, r) => s + r[c.key], 0)}</div>
              </div>
            ))}
          </div>

          <div className="border-t border-white/5 pt-3 space-y-1.5">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">🤖 IA Gemini</span>
            {localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY ? (
              <div className="flex items-center justify-between bg-emerald-500/10 rounded-xl px-3 py-2.5 border border-emerald-500/20">
                <span className="text-emerald-400 text-xs font-medium flex items-center gap-1.5">🔑 Chave de IA Configurada</span>
                <button onClick={() => { localStorage.removeItem('gemini_api_key'); setAiKey(''); setAiKeyVisible(false) }}
                  className="text-neutral-500 hover:text-neutral-300 text-[10px] font-semibold bg-neutral-800 px-2.5 py-1.5 rounded-lg transition-all active:scale-90">Alterar</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <input type={aiKeyVisible ? 'text' : 'password'} placeholder="Sua chave da API Gemini"
                    value={aiKey} onChange={e => setAiKey(e.target.value)}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-400/30 pr-9" />
                  <button onClick={() => setAiKeyVisible(!aiKeyVisible)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300">
                    {aiKeyVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <button onClick={() => { localStorage.setItem('gemini_api_key', aiKey); setErro(null); setAiKey(aiKey) }}
                  className="w-full bg-cyan-500/10 text-cyan-400 font-semibold py-2 rounded-xl text-xs transition-all active:scale-95 border border-cyan-500/20">Salvar Chave API</button>
              </>
            )}
          </div>

          <button onClick={() => salvarBase(refs)}
            className="w-full bg-cyan-500/10 text-cyan-400 font-semibold py-3 rounded-xl text-xs transition-all active:scale-95 border border-cyan-500/20">Salvar Tudo</button>
        </div>
      )}

      {aba === 'diario' ? (
        loading ? (
          <p className="text-neutral-600 text-center py-8 text-sm">Carregando...</p>
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
            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3">
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
                <div key={ref.id} className={`bg-neutral-900/50 backdrop-blur-md border rounded-2xl p-4 space-y-2 transition-all ${
                  eLimpo ? 'border-emerald-500/30' : eCustom ? 'border-yellow-500/30' : ePulado ? 'border-white/5 opacity-40' : 'border-white/5'
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
                        <button onClick={() => setEditando(null)} className="text-neutral-500 hover:text-white"><X size={14} /></button>
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
              <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider">+ Alimento Extra / Fora da Dieta</span>
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
              <button onClick={adicionarExtraGlobal}
                disabled={!extraGlobal.nome.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30">
                <Plus size={14} /> Adicionar
              </button>
              {(hoje?.extras_globais || []).map((e, i) => (
                <div key={i} className="flex items-center justify-between bg-cyan-500/5 rounded-lg px-3 py-1.5 font-mono text-[11px] text-cyan-400/80 border border-cyan-500/10">
                  <span>+ {e.nome} — {e.kcal || 0} kcal · P: {e.proteinas || 0} · C: {e.carboidratos || 0} · G: {e.gorduras || 0}</span>
                  <button onClick={() => removerExtraGlobal(i)} className="text-red-400/60 hover:text-red-400 ml-1"><X size={12} /></button>
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
              {aiResult && (
                <div className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-purple-500/20">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white font-medium">{aiResult.nome}</span>
                    <button onClick={aplicarResultadoIA}
                      className="text-emerald-400 hover:text-emerald-300 font-semibold text-[10px] bg-emerald-500/10 px-3 py-1.5 rounded-lg transition-all active:scale-90">+ Adicionar</button>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-mono text-center">
                    <div><span className="text-neutral-500">Kcal</span><br /><span className="text-white">{aiResult.kcal}</span></div>
                    <div><span className="text-neutral-500">P</span><br /><span className="text-white">{aiResult.p}g</span></div>
                    <div><span className="text-neutral-500">C</span><br /><span className="text-white">{aiResult.c}g</span></div>
                    <div><span className="text-neutral-500">G</span><br /><span className="text-white">{aiResult.g}g</span></div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
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
        <PainelEstatisticas mesDocs={mesDocs} carregarMes={carregarMes} userMetas={userMetas} onDayClick={(data) => { setDataAtiva(data); setAba('diario') }} />
      )}
    </div>
  )
}

function PainelEstatisticas({ mesDocs, carregarMes, userMetas, onDayClick }) {
  useEffect(() => { if (mesDocs.length === 0) carregarMes() }, [])

  const hoje = new Date()
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth() + 1
  const totalDias = diasNoMes(ano, mes)
  const primeiroDia = new Date(ano, mes - 1, 1).getDay()
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const META_KCAL = userMetas?.kcal || 1970

  function corDia(dataStr) {
    const doc = diasMap[dataStr]
    if (!doc) return 'bg-neutral-800'
    const kcal = kcalDoDia(doc)
    if (kcal === 0) return 'bg-neutral-800'
    const diff = Math.abs(kcal - META_KCAL)
    if (diff <= 100) return 'bg-emerald-500/40'
    if (diff <= 200) return 'bg-amber-500/40'
    return 'bg-red-500/40'
  }

  const diasArray = []
  for (let d = 1; d <= totalDias; d++) {
    diasArray.push({ dia: d, data: `${ano}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}` })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
          <span className="text-2xl font-bold text-white">{totalDiasComDado}</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Dias no mês</span>
        </div>
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 text-center">
          <span className="text-2xl font-bold text-emerald-400">{aderencia}%</span>
          <span className="text-neutral-500 text-xs block mt-0.5">Aderência</span>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2">
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

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider block mb-2">
          {new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^(\w)/, l => l.toUpperCase())}
        </span>
        <div className="grid grid-cols-7 gap-1">
          {diasSemana.map(d => <div key={d} className="text-[8px] text-neutral-600 text-center font-medium py-1">{d}</div>)}
          {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e-${i}`} />)}
          {diasArray.map(({ dia, data }) => (
            <button key={data} onClick={() => onDayClick?.(data)}
              className={`aspect-square rounded-md flex items-center justify-center transition-all active:scale-90 ${corDia(data)}`}>
              <span className="text-[9px] text-neutral-400 font-mono">{dia}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-3 mt-2 text-[9px] text-neutral-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> ±100kcal da meta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/40" /> ±200kcal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40" /> &gt;200kcal</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-800" /> Sem dados</span>
        </div>
      </div>
    </div>
  )
}
