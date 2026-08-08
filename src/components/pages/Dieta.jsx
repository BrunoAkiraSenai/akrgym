import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { REFEICOES as REF_BASE } from '../../config/dieta'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { useAnimatedNumber } from '../../utils/useAnimatedNumber'
import { LIMITS, sanitizarTexto } from '../../utils/validation'
import ConfirmModal from '../ConfirmModal'
import { Apple, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, CircleX, Loader, Pencil, Plus, Settings, SkipForward, Sparkles, X } from 'lucide-react'

function hojeId() {
  const d = new Date()
  const offset = d.getTimezoneOffset()
  const local = new Date(d.getTime() - offset * 60000)
  return local.toISOString().split('T')[0]
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
      t.kcal += (Number(r.substituto.proteinas) || 0) * 4
        + (Number(r.substituto.carboidratos) || 0) * 4
        + (Number(r.substituto.gorduras) || 0) * 9
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
  const extraCardRef = useRef(null)
  const extraNomeRef = useRef(null)
  const extraItemRefs = useRef({})
  const pendingExtraFocusRef = useRef(null)
  const [extraHighlighted, setExtraHighlighted] = useState(false)
  const [refs, setRefs] = useState([])
  const refsRef = useRef(refs)
  useEffect(() => { refsRef.current = refs }, [refs])
  const [extraGlobal, setExtraGlobal] = useState({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
  const [editandoExtraIdx, setEditandoExtraIdx] = useState(null)
  const [mesDocs, setMesDocs] = useState([])
  const [mesAtual, setMesAtual] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 })
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [userMetas, setUserMetas] = useState({ kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
  const [toast, setToast] = useState(null)
  const [erroIA, setErroIA] = useState(null)
  const [pularConfirmId, setPularConfirmId] = useState(null)
  const [analisando, setAnalisando] = useState(false)
  const [ultimaAnalise, setUltimaAnalise] = useState({})
  const ultimoRequisicaoTime = useRef(0)

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const index = pendingExtraFocusRef.current
    if (index === null || index === undefined) return
    const node = extraItemRefs.current[index]
    if (!node) return

    pendingExtraFocusRef.current = null
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => node.querySelector('button')?.focus({ preventScroll: true }), 350)
    return () => clearTimeout(timer)
  }, [hoje])

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
  }, [dataAtiva, user.uid])

  const carregarBase = useCallback(async () => {
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
      if (snap.exists()) {
        const data = snap.data()
        setRefs(clonarRefs(data.refeicoes || []))
        setUserMetas(data.metas || { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
      } else {
        setRefs([])
        setUserMetas({ kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
      }
    } catch {
      showToast('Erro ao carregar configuração. Usando valores padrão.', 'erro')
    }
  }, [user.uid])

  const carregarMes = useCallback(async (ano, mes) => {
    try {
      const ini = inicioMes(ano, mes)
      const fim = fimMes(ano, mes)
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'diario_dieta'), where('data', '>=', ini), where('data', '<=', fim)))
      setMesDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { setErro(`Erro: ${err.message}`) }
  }, [user.uid])

  // Sincroniza dados externos ao entrar na tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarBase() }, [carregarBase])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarHoje() }, [carregarHoje])

  // Carrega dados do mês ativo no mount para o heatmap
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarMes(mesAtual.ano, mesAtual.mes) }, [carregarMes, mesAtual.ano, mesAtual.mes])

  const recarregarMes = useCallback(() => {
    carregarMes(mesAtual.ano, mesAtual.mes)
  }, [mesAtual, carregarMes])

  const salvarHoje = useCallback(async (data, novo) => {
    try {
      await setDoc(doc(db, 'users', user.uid, 'diario_dieta', data), { ...novo, data, updatedAt: serverTimestamp() })
      setHoje(novo)
      showToast('✓ Salvo', 'sucesso')
      recarregarMes()
      return true
    } catch {
      setErro(`Erro ao salvar. Verifique sua conexão.`)
      showToast('Erro ao salvar. Verifique sua conexão.', 'erro')
      return false
    }
  }, [recarregarMes, user.uid])

  const confirmar = (id) => {
    const card = document.getElementById(`refeicao-card-${id}`)
    if (card) {
      card.classList.add('card-complete-glow')
      setTimeout(() => card.classList.remove('card-complete-glow'), 500)
    }
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
    if (atual?.status === 'pendente') { setPularConfirmId(id); return }
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
  const adicionarExtraGlobal = async () => {
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
      pendingExtraFocusRef.current = n.extras_globais.length - 1
    }
    const salvo = await salvarHoje(dataAtiva, n)
    if (!salvo && editandoExtraIdx === null) pendingExtraFocusRef.current = null
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '' })
    setEditandoExtraIdx(null)
  }

  const limparExtras = () => {
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
    if (editandoExtraIdx === idx) limparExtras()
  }

  // IA Gemini via SDK direto (Cloud Function requer plano Blaze)
  const analisarComIA = async () => {
    const textoSanitizado = sanitizarTexto(aiInput).slice(0, LIMITS.textoIA)
    if (!textoSanitizado || textoSanitizado.length < 3) {
      showToast('Descrição muito curta para a IA.', 'erro')
      return
    }
    if (analisando) {
      showToast('Aguarde, já estou analisando...', 'sucesso')
      return
    }
    const agora = Date.now()
    const segundosDesdeUltima = (agora - ultimoRequisicaoTime.current) / 1000
    if (segundosDesdeUltima < 3) {
      showToast(`Aguarde ${(3 - segundosDesdeUltima).toFixed(0)} segundos para nova análise.`, 'sucesso')
      return
    }
    const cacheKey = textoSanitizado.toLowerCase()
    if (ultimaAnalise[cacheKey] && (agora - ultimaAnalise[cacheKey].timestamp) < 10000) {
      showToast('Análise recente já feita. Use o resultado anterior.', 'sucesso')
      return
    }
    setAnalisando(true)
    ultimoRequisicaoTime.current = agora
    setAiLoading(true); setErroIA(null)
    try {
      const parsed = await calcularMacrosIA(textoSanitizado)
      if (parsed._erro) {
        if (parsed._erro.includes('429') || parsed._erro.includes('Too Many Requests') || parsed._erro.includes('RESOURCE_EXHAUSTED')) {
          setErroIA('Limite de análises excedido. Tente novamente em alguns minutos.')
        } else {
          setErroIA(parsed._erro)
        }
      } else {
        setExtraGlobal({
          nome: parsed.nome || 'Analisado por IA',
          kcal: String(parsed.kcal || 0),
          proteinas: String(parsed.proteinas || 0),
          carboidratos: String(parsed.carboidratos || 0),
          gorduras: String(parsed.gorduras || 0),
        })
        setUltimaAnalise(prev => ({ ...prev, [cacheKey]: { timestamp: agora, resultado: parsed } }))
        setAiInput('')
        showToast('Valores preenchidos! Revise e adicione.', 'sucesso')
        // UX: rolar até o card de extras, destacar e focar no campo nome
        setExtraHighlighted(true)
        requestAnimationFrame(() => {
          extraCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setTimeout(() => extraNomeRef.current?.focus({ preventScroll: true }), 350)
        })
        setTimeout(() => setExtraHighlighted(false), 1600)
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED') || err.status === 429) {
        setErroIA('Limite de análises excedido. Tente novamente em alguns minutos.')
      } else {
        setErroIA('Erro ao analisar prato. Tente novamente.')
      }
      console.error('Erro Gemini:', err)
    }
    setAiLoading(false)
    setTimeout(() => setAnalisando(false), 2000)
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

  // Valores animados para a tabela "Progresso Hoje" — contam suavemente de
  // "o que está sendo exibido" até o novo total quando o usuário confirma
  // uma refeição (ou adiciona um extra). A barra (width) já anima via CSS.
  const kcalAnim        = useAnimatedNumber(totais.kcal)
  const proteinasAnim   = useAnimatedNumber(totais.proteinas)
  const carboidratosAnim = useAnimatedNumber(totais.carboidratos)
  const gordurasAnim    = useAnimatedNumber(totais.gorduras)
  const animados = {
    kcal:         kcalAnim,
    proteinas:    proteinasAnim,
    carboidratos: carboidratosAnim,
    gorduras:     gordurasAnim,
  }
  const refeicoesConcluidas = refs.filter(ref => ['limpo', 'customizado'].includes(hoje?.refeicoes?.[ref.id]?.status)).length
  const refeicoesPuladas = refs.filter(ref => hoje?.refeicoes?.[ref.id]?.status === 'pulado').length

  return (
    <div className="diet-page flex flex-col gap-3 pt-2 pb-4">
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

      <header className="diet-header">
        <div><p className="home-kicker">Acompanhamento diário</p><h1 className="text-2xl font-bold tracking-tight text-white">Sua alimentação</h1><p>Registre o que aconteceu e mantenha o plano visível.</p></div>
        <div className="diet-header-actions"><button type="button" onClick={() => onIrParaConfig?.()} aria-label="Abrir configurações da dieta" className="diet-icon-button"><Settings size={17} /></button><div className="diet-header-mark" aria-hidden="true"><Apple size={18} /></div></div>
      </header>

      <div className="diet-tabs" role="tablist" aria-label="Visões da dieta">
        <button type="button" role="tab" aria-selected={aba === 'diario'} onClick={() => setAba('diario')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'diario' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Diário</button>
        <button type="button" role="tab" aria-selected={aba === 'estatisticas'} onClick={() => { setAba('estatisticas'); if (mesDocs.length === 0) carregarMes(mesAtual.ano, mesAtual.mes) }}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'estatisticas' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Estatísticas</button>
      </div>

      {erro && (
        <div className="flex items-center justify-between bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3">
          <span className="text-red-400 text-xs">{erro}</span>
          <button
            onClick={() => setErro(null)}
            className="text-red-400 hover:text-red-300 transition-all ml-2 shrink-0"
            aria-label="Fechar erro"
          >
            ✕
          </button>
        </div>
      )}

      {aba === 'diario' ? (
        loading ? (
          <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
        ) : (
          <>
            {dataAtiva !== hojeId() && (
              <div className="diet-history-banner">
                <span><CalendarDays size={14} /> Editando o histórico de {new Date(dataAtiva + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                <button type="button" onClick={() => setDataAtiva(hojeId())}
                  className="text-cyan-400/70 hover:text-cyan-400 text-[11px] font-semibold bg-cyan-500/10 px-3 py-1.5 rounded-lg transition-all active:scale-90">
                  Voltar para Hoje
                </button>
              </div>
            )}
            <div className="diet-progress card-premium p-4 space-y-3">
              <div className="diet-progress-head"><div><p className="home-kicker">Hoje</p><h2>Progresso alimentar</h2></div><strong>{refeicoesConcluidas}/{refs.length}</strong></div>
              <div className="diet-progress-summary"><span>{refeicoesConcluidas === 0 ? 'Nenhuma refeição concluída' : `${refeicoesConcluidas} ${refeicoesConcluidas === 1 ? 'refeição concluída' : 'refeições concluídas'}`}</span>{refeicoesPuladas > 0 && <span>{refeicoesPuladas} pulada{refeicoesPuladas === 1 ? '' : 's'}</span>}</div>
              {[
                { key: 'kcal',         label: 'Calorias',     meta: userMetas.kcal,         u: 'kcal' },
                { key: 'proteinas',    label: 'Proteínas',    meta: userMetas.proteinas,    u: 'g' },
                { key: 'carboidratos', label: 'Carboidratos', meta: userMetas.carboidratos, u: 'g' },
                { key: 'gorduras',     label: 'Gorduras',     meta: userMetas.gorduras,     u: 'g' },
              ].map(item => {
                const valorAlvo = ({ kcal: totais.kcal, proteinas: totais.proteinas, carboidratos: totais.carboidratos, gorduras: totais.gorduras })[item.key]
                const valorExibido = Math.round(animados[item.key])
                const pctAlvo = Math.min((valorAlvo / item.meta) * 100, 100)
                return (
                  <div key={item.key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-neutral-400">{item.label}</span>
                      <span className="text-white font-semibold font-mono">
                        {valorExibido} <span className="text-neutral-500 font-normal">/ {item.meta}{item.u}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${corMeta(valorAlvo, item.meta)}`}
                        style={{
                          width: `${pctAlvo}%`,
                          transition: 'width 600ms cubic-bezier(0.2, 0.7, 0.2, 1)',
                        }}
                      />
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
                <div key={ref.id} id={`refeicao-card-${ref.id}`} className={`diet-meal-card card-premium p-4 space-y-2 transition-all ${
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
                    <button type="button" onClick={() => confirmar(ref.id)}
                      aria-label={eLimpo ? 'Desfazer conclusão' : 'Confirmar refeição'}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        eLimpo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-emerald-500/30'
                      }`}>
                      {eLimpo ? <><Check size={14} /> Concluído</> : <><CircleCheck size={14} /> Confirmar</>}
                    </button>
                    <button type="button" onClick={() => eCustom ? setEditando(null) : abrirCustom(ref.id)}
                      aria-label={eCustom ? 'Cancelar edição' : 'Modificar refeição'}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        eCustom ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-yellow-500/30'
                      }`}>
                      <Pencil size={13} /> {eCustom ? 'Editando' : 'Modificar'}
                    </button>
                    <button type="button" onClick={() => pular(ref.id)}
                      aria-label={ePulado ? 'Desfazer pulo' : 'Pular refeição'}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        ePulado ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-red-500/30'
                      }`}>
                      {ePulado ? <><CircleX size={13} /> Pulado</> : <><SkipForward size={13} /> Pular</>}
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

            <div
              ref={extraCardRef}
              aria-live="polite"
              className={[
                'rounded-2xl p-4 space-y-2 transition-shadow duration-300',
                extraHighlighted
                  ? 'bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.5)]'
                  : 'bg-neutral-900/50 backdrop-blur-md border border-cyan-500/20',
              ].join(' ')}
            >
              <span className="diet-section-label">
                {editandoExtraIdx !== null ? <><Pencil size={13} /> Editar alimento</> : <><Plus size={13} /> Alimento extra</>}
              </span>
              <div className="space-y-1.5">
                <div>
                  <label htmlFor="extra-nome" className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Nome</label>
                  <input
                    id="extra-nome"
                    ref={extraNomeRef}
                    type="text"
                    placeholder="ex: banana"
                    value={extraGlobal.nome}
                    onChange={e => setExtraGlobal(p => ({ ...p, nome: e.target.value }))}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'kcal',         label: 'Calorias (kcal)' },
                    { key: 'proteinas',    label: 'Proteína (g)' },
                    { key: 'carboidratos', label: 'Carboidrato (g)' },
                    { key: 'gorduras',     label: 'Gordura (g)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label htmlFor={`extra-${key}`} className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{label}</label>
                      <input
                        id={`extra-${key}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={extraGlobal[key]}
                        onChange={e => setExtraGlobal(p => ({ ...p, [key]: e.target.value }))}
                        className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-cyan-400/30 num"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {(editandoExtraIdx !== null || extraGlobal.nome || extraGlobal.kcal || extraGlobal.proteinas || extraGlobal.carboidratos || extraGlobal.gorduras) && (
                  <button
                    type="button"
                    onClick={limparExtras}
                    aria-label="Limpar campos do alimento extra"
                    className="btn-secondary flex-1 py-3 text-xs"
                  >
                    {editandoExtraIdx !== null ? 'Cancelar' : 'Limpar'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={adicionarExtraGlobal}
                  disabled={!extraGlobal.nome.trim()}
                  className="flex-1 btn-primary w-full py-3 flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> {editandoExtraIdx !== null ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
              {(hoje?.extras_globais || []).map((e, i) => (
                <div key={i} ref={node => { if (node) extraItemRefs.current[i] = node; else delete extraItemRefs.current[i] }} className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-cyan-300 font-medium">+ {e.nome || '(sem nome)'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => editarExtra(i)} aria-label="Editar" className="icon-hover text-amber-400/70"><Pencil size={13} /></button>
                      <button type="button" onClick={() => removerExtraGlobal(i)} aria-label="Remover" className="text-red-400/60 hover:text-red-400 transition-all active:scale-90"><X size={13} /></button>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center font-mono num">
                    <div className="bg-cyan-500/10 rounded-md py-1">
                      <div className="text-[10px] text-cyan-300/70 uppercase tracking-wider leading-none">kcal</div>
                      <div className="text-sm text-cyan-200 font-semibold mt-0.5 leading-tight">{e.kcal || 0}</div>
                    </div>
                    <div className="bg-cyan-500/10 rounded-md py-1">
                      <div className="text-[10px] text-cyan-300/70 uppercase tracking-wider leading-none">P</div>
                      <div className="text-sm text-cyan-200 font-semibold mt-0.5 leading-tight">{e.proteinas || 0}</div>
                    </div>
                    <div className="bg-cyan-500/10 rounded-md py-1">
                      <div className="text-[10px] text-cyan-300/70 uppercase tracking-wider leading-none">C</div>
                      <div className="text-sm text-cyan-200 font-semibold mt-0.5 leading-tight">{e.carboidratos || 0}</div>
                    </div>
                    <div className="bg-cyan-500/10 rounded-md py-1">
                      <div className="text-[10px] text-cyan-300/70 uppercase tracking-wider leading-none">G</div>
                      <div className="text-sm text-cyan-200 font-semibold mt-0.5 leading-tight">{e.gorduras || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-neutral-900/50 backdrop-blur-md border border-purple-500/20 rounded-2xl p-4 space-y-2">
              <span className="diet-section-label diet-section-label-ai">
                <Sparkles size={13} /> Analisar alimento com IA
              </span>
              <textarea rows={2} maxLength={LIMITS.textoIA}
                placeholder="Ex: Comi uma parmegiana de frango com arroz no almoço..."
                value={aiInput} onChange={e => setAiInput(sanitizarTexto(e.target.value).slice(0, LIMITS.textoIA))}
                className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-purple-400/30 resize-none" />
              <button onClick={analisarComIA} disabled={!aiInput.trim() || aiLoading}
                className="w-full flex items-center justify-center gap-2 bg-purple-500/10 text-purple-400 font-semibold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30 border border-purple-500/20">
                {aiLoading ? <><Loader size={14} className="animate-spin" /> Analisando...</> : <><Sparkles size={14} /> Analisar alimento</>}
              </button>
              {erroIA && (
                <div role="alert" className="flex items-start justify-between gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2.5 text-[11px] text-red-300">
                  <span>{erroIA}</span>
                  <button type="button" onClick={() => setErroIA(null)} className="shrink-0 text-red-300/70 hover:text-red-200" aria-label="Fechar erro da análise de alimento">✕</button>
                </div>
              )}
            </div>

            <div className="card-premium p-4">
              <span className="section-label">Total do Dia</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
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
          refs={refs}
          mesAtual={mesAtual}
          setMesAtual={setMesAtual}
          podeAvancar={podeAvancar}
          onDayClick={(data) => { setDataAtiva(data); setAba('diario') }}
        />
      )}
      <ConfirmModal
        isOpen={pularConfirmId !== null}
        title="Pular refeição?"
        message="Tem certeza que deseja pular esta refeição?"
        onConfirm={() => {
          const id = pularConfirmId
          let n = { ...hoje, refeicoes: { ...(hoje?.refeicoes || {}) } }
          if (!n.refeicoes[id]) n.refeicoes[id] = refeicaoVazia()
          const a = n.refeicoes[id]
          n.refeicoes[id] = a.status === 'pulado'
            ? { status: 'pendente', substituto: null, extra: a.extra || [] }
            : { status: 'pulado', substituto: null, extra: a.extra || [] }
          salvarHoje(dataAtiva, n)
          setPularConfirmId(null)
        }}
        onCancel={() => setPularConfirmId(null)}
      />
    </div>
  )
}

function PainelEstatisticas({ mesDocs, carregarMes, refs, mesAtual, setMesAtual, podeAvancar, onDayClick }) {
  useEffect(() => {
    carregarMes(mesAtual.ano, mesAtual.mes)
  }, [carregarMes, mesAtual.ano, mesAtual.mes])

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
          <span className="text-emerald-400 font-medium"><span className="diet-legend-dot diet-legend-good" /> {greenDays} dias consistentes</span>
          <span className="text-yellow-400 font-medium"><span className="diet-legend-dot diet-legend-warn" /> {yellowDays} dias ajustados</span>
          <span className="text-red-400 font-medium"><span className="diet-legend-dot diet-legend-danger" /> {redDays} dias fora da meta</span>
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
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2 text-[9px] text-neutral-600">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> ≤2000</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/40" /> 2001-2250</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/40" /> &gt;2250</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-800" /> Sem dados</span>
        </div>
      </div>
    </div>
  )
}
