import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, runTransaction, onSnapshot, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import { applyDiaryAction, normalizeDay, diaryTotals as calcularTotais, emptyMeal as refeicaoVazia, hasLegacyNutrition, diaryProgress } from '../../utils/dietDiary'
import { validarNumeroConfig } from '../../utils/configValidation'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { useAnimatedNumber } from '../../utils/useAnimatedNumber'
import { LIMITS, sanitizarTexto } from '../../utils/validation'
import ConfirmModal from '../ConfirmModal'
import { Apple, Beef, CalendarDays, Check, ChevronLeft, ChevronRight, CircleCheck, CircleX, Droplets, Dumbbell, Flame, Leaf, Loader, Moon, Pencil, Plus, Settings, SkipForward, Sparkles, Sun, Utensils, Wheat, X } from 'lucide-react'

const NUTRIENTE_DEFINICOES = [
  { key: 'proteinas', label: 'Proteína', icon: Beef },
  { key: 'carboidratos', label: 'Carboidratos', icon: Wheat },
  { key: 'gorduras', label: 'Gorduras', icon: Droplets },
  { key: 'fibras', label: 'Fibras', icon: Leaf },
]

function IconeNutriente({ nutrientKey, size = 13 }) {
  const Icon = NUTRIENTE_DEFINICOES.find(item => item.key === nutrientKey)?.icon
  return Icon ? <Icon size={size} strokeWidth={1.8} aria-hidden="true" /> : null
}

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

function clonarRefs(refs) {
  return refs.map(r => ({ ...r }))
}

function formatoDataCurta(data) {
  return new Date(`${data}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')
}

function tipoRefeicao(nome = '') {
  const texto = nome.toLowerCase()
  if (texto.includes('café') || texto.includes('manhã')) return 'manha'
  if (texto.includes('pré') || texto.includes('treino')) return 'treino'
  if (texto.includes('jantar') || texto.includes('noite')) return 'noite'
  if (texto.includes('almoço') || texto.includes('almoco')) return 'almoco'
  return 'outro'
}

function iconeRefeicao(tipo) {
  return ({ manha: Sun, almoco: Flame, treino: Dumbbell, noite: Moon, outro: Utensils })[tipo] || Utensils
}

export default function Dieta({ onIrParaConfig }) {
  const user = useUser()
  const [aba, setAba] = useState('diario')
  const [dataAtiva, setDataAtiva] = useState(hojeId())
  const [hoje, setHoje] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const extraCardRef = useRef(null)
  const extraNomeRef = useRef(null)
  const extraItemRefs = useRef({})
  const pendingExtraFocusRef = useRef(null)
  const [extraHighlighted, setExtraHighlighted] = useState(false)
  const [refs, setRefs] = useState([])
  const refsRef = useRef(refs)
  useEffect(() => { refsRef.current = refs }, [refs])
  const [extraGlobal, setExtraGlobal] = useState({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '', fibras: '' })
  const [editandoExtraIdx, setEditandoExtraIdx] = useState(null)
  const editingOriginal = useRef(null)
  const savingExtra = useRef(false)
  const [extraSaving, setExtraSaving] = useState(false)
  const context = useRef(0)
  const formVersion = useRef(0)
  const aiRequest = useRef(0)
  const monthRequest = useRef(0)
  const [baseReady, setBaseReady] = useState(false)
  const [mesDocs, setMesDocs] = useState([])
  const [mesAtual, setMesAtual] = useState({ ano: new Date().getFullYear(), mes: new Date().getMonth() + 1 })
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResultReady, setAiResultReady] = useState(false)
  const [userMetas, setUserMetas] = useState({ kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 30 })
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

  useEffect(() => {
    const generation = ++context.current
    ++aiRequest.current
    ++formVersion.current
    // Reset the form when subscribing to a different external diary document.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoje(null); setLoading(true); setErro(null)
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '', fibras: '' })
    setEditandoExtraIdx(null); editingOriginal.current = null
    setPularConfirmId(null); setToast(null); setErroIA(null); setAiInput('')
    setAiLoading(false); setAnalisando(false)
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'diario_dieta', dataAtiva), snap => {
      if (context.current !== generation) return
      setHoje(normalizeDay(snap.exists() ? snap.data() : null, dataAtiva))
      setLoading(false)
    }, () => {
      if (context.current !== generation) return
      setErro('Não foi possível carregar este dia. Verifique a conexão e selecione o dia novamente.')
      setLoading(false)
    })
    // These refs are request counters, not DOM refs; cleanup invalidates pending work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { ++context.current; ++aiRequest.current; unsubscribe() }
  }, [dataAtiva, user.uid])

  useEffect(() => {
    let previousToday = hojeId()
    const timer = setInterval(() => {
      const nextToday = hojeId()
      if (nextToday !== previousToday) {
        setDataAtiva(current => current === previousToday ? nextToday : current)
        previousToday = nextToday
      }
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  const carregarBase = useCallback(async () => {
    setBaseReady(false)
    try {
      const snap = await getDoc(doc(db, 'users', user.uid, 'config', 'data'))
      if (snap.exists()) {
        const data = snap.data()
        setRefs(clonarRefs((data.refeicoes || []).map(ref => ({ ...ref, fibras: Number(ref.fibras) || 0 }))))
        setUserMetas({ kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, ...(data.metas || {}), fibras: Number(data.metas?.fibras ?? 30) || 0 })
      } else {
        setRefs([])
        setUserMetas({ kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 30 })
      }
      setBaseReady(true)
    } catch {
      setErro('Não foi possível carregar o plano. Reabra a aba antes de registrar refeições.')
    }
  }, [user.uid])

  const carregarMes = useCallback(async (ano, mes) => {
    const request = ++monthRequest.current
    try {
      const ini = inicioMes(ano, mes)
      const fim = fimMes(ano, mes)
      const snap = await getDocs(query(collection(db, 'users', user.uid, 'diario_dieta'), where('data', '>=', ini), where('data', '<=', fim)))
      if (request !== monthRequest.current) return
      setMesDocs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    } catch (err) { setErro(`Erro: ${err.message}`) }
  }, [user.uid])

  // Sincroniza dados externos ao entrar na tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarBase() }, [carregarBase])


  // Carrega dados do mês ativo no mount para o heatmap
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregarMes(mesAtual.ano, mesAtual.mes) }, [carregarMes, mesAtual.ano, mesAtual.mes])

  const recarregarMes = useCallback(() => {
    carregarMes(mesAtual.ano, mesAtual.mes)
  }, [mesAtual, carregarMes])

  const salvarHoje = useCallback(async (date, action, success) => {
    const generation = context.current
    try {
      const target = doc(db, 'users', user.uid, 'diario_dieta', date)
      await runTransaction(db, async transaction => {
        const snap = await transaction.get(target)
        const next = applyDiaryAction(snap.exists() ? snap.data() : null, date, action, refsRef.current, userMetas)
        transaction.set(target, { ...next, updatedAt: serverTimestamp() })
      })
      if (generation !== context.current) return false
      if (success) setToast(success)
      else showToast('✓ Salvo', 'sucesso')
      recarregarMes()
      return true
    } catch (err) {
      if (generation !== context.current) return false
      const message = err.code ? 'Erro ao salvar. Verifique sua conexão.' : err.message
      setErro(message); showToast(message, 'erro')
      return false
    }
  }, [recarregarMes, user.uid, userMetas])

  const confirmar = (id) => {
    if (!hoje || !baseReady) return
    const previous = hoje.refeicoes[id] || refeicaoVazia()
    const status = previous.status === 'limpo' ? 'pendente' : 'limpo'
    const food = refs.find(ref => ref.id === id)
    const revision = crypto.randomUUID()
    const date = dataAtiva
    salvarHoje(date, { type: 'meal', id, status, food, revision }, status === 'limpo' ? {
      msg: 'Refeição concluída!', tipo: 'sucesso',
      acao: () => salvarHoje(date, { type: 'meal', id, restore: previous, expectedRevision: revision, revision: crypto.randomUUID() }, { msg: '✓ Desfeito!', tipo: 'sucesso' }),
    } : undefined)
  }

  const aplicarPulo = (id) => salvarHoje(dataAtiva, {
    type: 'meal', id, status: hoje?.refeicoes?.[id]?.status === 'pulado' ? 'pendente' : 'pulado', revision: crypto.randomUUID(),
  })

  const pular = (id) => {
    if (!hoje || !baseReady) return
    if (!hoje.refeicoes[id] || hoje.refeicoes[id].status === 'pendente') { setPularConfirmId(id); return }
    aplicarPulo(id)
  }

  function validarNumero(valor, min, max, nome) {
    try { return validarNumeroConfig(valor, min, max, nome) }
    catch (err) { setErro(err.message); return null }
  }

  const adicionarExtraGlobal = async () => {
    if (!hoje || !baseReady || savingExtra.current || !extraGlobal.nome.trim()) return
    const values = {}
    for (const field of ['kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras']) {
      const value = validarNumero(extraGlobal[field], 0, LIMITS[field], field)
      if (value === null) return
      values[field] = value
    }
    const item = { ...values, nome: extraGlobal.nome.trim().slice(0, LIMITS.nome), id: editandoExtraIdx || crypto.randomUUID() }
    const previous = editingOriginal.current
    if (previous && ['nome', 'kcal', 'proteinas', 'carboidratos', 'gorduras', 'fibras'].every(key => String(previous[key] ?? 0) === String(item[key]))) {
      limparExtras()
      showToast('Nenhuma alteração feita.', 'sucesso')
      return
    }
    const generation = context.current
    const version = formVersion.current
    savingExtra.current = true; setExtraSaving(true)
    pendingExtraFocusRef.current = item.id
    const saved = await salvarHoje(dataAtiva, previous
      ? { type: 'extra-edit', id: item.id, previous, item }
      : { type: 'extra-add', item })
    savingExtra.current = false; setExtraSaving(false)
    if (saved && generation === context.current && version === formVersion.current) limparExtras()
    if (!saved) pendingExtraFocusRef.current = null
  }

  const limparExtras = () => {
    ++formVersion.current
    editingOriginal.current = null
    setAiResultReady(false)
    setExtraGlobal({ nome: '', kcal: '', proteinas: '', carboidratos: '', gorduras: '', fibras: '' })
    setEditandoExtraIdx(null)
  }

  const editarExtra = (id) => {
    const e = hoje?.extras_globais?.find(item => item.id === id)
    if (!e) return
    setExtraGlobal({
      nome: e.nome || '',
      kcal: String(e.kcal ?? ''),
      proteinas: String(e.proteinas ?? ''),
      carboidratos: String(e.carboidratos ?? ''),
      gorduras: String(e.gorduras ?? ''),
      fibras: String(e.fibras ?? 0),
    })
    ++formVersion.current
    editingOriginal.current = e
    setEditandoExtraIdx(id)
    requestAnimationFrame(() => extraNomeRef.current?.focus({ preventScroll: true }))
  }

  const removerExtraGlobal = (id) => {
    salvarHoje(dataAtiva, { type: 'extra-remove', id })
    if (editandoExtraIdx === id) limparExtras()
  }

  // IA Gemini via backend seguro (Cloud Function ou Worker)
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
    // A análise é uma ação explícita do usuário; o horário serve apenas para
    // limitar chamadas consecutivas e não participa da renderização.
    // eslint-disable-next-line react-hooks/purity
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
    const request = ++aiRequest.current
    const generation = context.current
    const version = formVersion.current
    setAnalisando(true)
    ultimoRequisicaoTime.current = agora
    setAiLoading(true); setErroIA(null)
    try {
      const parsed = await calcularMacrosIA(textoSanitizado)
      if (request !== aiRequest.current || generation !== context.current) return
      if (version !== formVersion.current) {
        showToast('O formulário mudou durante a análise. Seus dados foram preservados.', 'sucesso')
        setAiLoading(false); setAnalisando(false)
        return
      }
      if (parsed._erro) {
        if (parsed._erro.includes('429') || parsed._erro.includes('Too Many Requests') || parsed._erro.includes('RESOURCE_EXHAUSTED')) {
          setErroIA('Limite de análises excedido. Tente novamente em alguns minutos.')
        } else {
          setErroIA(parsed._erro)
        }
      } else {
        setEditandoExtraIdx(null); editingOriginal.current = null
        setExtraGlobal({
          nome: parsed.nome || 'Analisado por IA',
          kcal: String(parsed.kcal || 0),
          proteinas: String(parsed.proteinas || 0),
          carboidratos: String(parsed.carboidratos || 0),
          gorduras: String(parsed.gorduras || 0),
          fibras: String(parsed.fibras || 0),
        })
        setAiResultReady(true)
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
      if (request !== aiRequest.current || generation !== context.current) return
      const msg = err.message || ''
      if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED') || err.status === 429) {
        setErroIA('Limite de análises excedido. Tente novamente em alguns minutos.')
      } else {
        setErroIA('Erro ao analisar prato. Tente novamente.')
      }
      console.error('Erro Gemini:', err)
    }
    setAiLoading(false)
    setAnalisando(false)
  }

  const totais = calcularTotais(hoje, refs)

  const hojeData = new Date()
  const podeAvancar = mesAtual.ano < hojeData.getFullYear() || (mesAtual.ano === hojeData.getFullYear() && mesAtual.mes < hojeData.getMonth() + 1)

  // Valores animados para a tabela "Progresso Hoje" — contam suavemente de
  // "o que está sendo exibido" até o novo total quando o usuário confirma
  // uma refeição (ou adiciona um extra). A barra (width) já anima via CSS.
  const kcalAnim        = useAnimatedNumber(totais.kcal)
  const proteinasAnim   = useAnimatedNumber(totais.proteinas)
  const carboidratosAnim = useAnimatedNumber(totais.carboidratos)
  const gordurasAnim    = useAnimatedNumber(totais.gorduras)
  const fibrasAnim       = useAnimatedNumber(totais.fibras)
  const animados = {
    kcal:         kcalAnim,
    proteinas:    proteinasAnim,
    carboidratos: carboidratosAnim,
    gorduras:     gordurasAnim,
    fibras:       fibrasAnim,
  }
  const progresso = diaryProgress(hoje, refs)
  // Um alimento extra também representa uma refeição realizada, mas continua
  // separado do almoço/jantar planejado para preservar a organização do diário.
  const refeicoesConcluidas = progresso.planned ? Math.min(progresso.planned, progresso.consumed) : progresso.consumed
  const refeicoesPuladas = refs.filter(ref => hoje?.refeicoes?.[ref.id]?.status === 'pulado').length

  return (
    <div className="diet-page flex flex-col gap-3 pt-2 pb-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-24 left-4 right-4 z-50 flex items-center justify-center pointer-events-auto`}>
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
        <div><p className="home-kicker">Acompanhamento diário</p><h1 className="text-2xl font-bold tracking-tight text-white">Dieta</h1><p>Seu progresso também se constrói no prato.</p></div>
        <div className="diet-header-actions">
          <label className="diet-date-picker">
            <CalendarDays size={15} aria-hidden="true" />
            <span>{dataAtiva === hojeId() ? 'Hoje' : formatoDataCurta(dataAtiva)}</span>
            <input type="date" value={dataAtiva} max={hojeId()} onChange={e => e.target.value && setDataAtiva(e.target.value)} aria-label="Selecionar dia do diário" />
          </label>
          <button type="button" onClick={() => onIrParaConfig?.()} aria-label="Abrir configurações da dieta" className="diet-icon-button"><Settings size={17} /></button>
          <div className="diet-header-mark" aria-hidden="true"><Apple size={18} /></div>
        </div>
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
        ) : !hoje || !baseReady ? <p role="status">Não foi possível preparar o diário. Reabra esta aba para tentar novamente.</p> : (
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
            <div className="diet-goal-card">
              <div className="diet-goal-copy"><span><Flame size={15} /> Meta diária</span><strong>~ {Math.round(userMetas.kcal)} <small>kcal</small></strong></div>
              <button type="button" onClick={() => onIrParaConfig?.()} className="diet-goal-edit" aria-label="Editar meta diária"><Pencil size={15} /></button>
            </div>

            <div className="diet-summary-card card-premium">
              <div className="diet-summary-top"><div><span className="section-label">Resumo do dia</span><p>{refeicoesConcluidas === 0 ? 'Nenhuma refeição concluída' : `${refeicoesConcluidas} ${refeicoesConcluidas === 1 ? 'refeição concluída' : 'refeições concluídas'}`}</p></div><strong>{refeicoesConcluidas}/{progresso.planned}</strong></div>
              {refeicoesPuladas > 0 && <div className="diet-progress-summary"><span>{refeicoesPuladas === 1 ? '1 refeição pulada' : `${refeicoesPuladas} refeições puladas`}</span></div>}
              <div className="diet-summary-body">
                <div className="diet-kcal-ring" style={{ '--diet-kcal-pct': `${userMetas.kcal > 0 ? Math.min((totais.kcal / userMetas.kcal) * 100, 100) : 0}%` }}>
                  <div><strong>{Math.round(animados.kcal).toLocaleString('pt-BR')}</strong><span>kcal</span><small>de {Math.round(userMetas.kcal).toLocaleString('pt-BR')}</small></div>
                </div>
                <div className="diet-macro-list">
                  {NUTRIENTE_DEFINICOES.map(item => {
                    const atual = totais[item.key]
                    const meta = userMetas[item.key]
                    const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0
                    return <div className="diet-macro-item" key={item.key}><div className="diet-macro-item-head"><span><span className="diet-macro-item-icon" title={item.label}><IconeNutriente nutrientKey={item.key} /></span>{item.label}</span><strong>{Math.round(animados[item.key])} <small>/ {Math.round(meta)}g</small></strong></div><div className="diet-macro-track"><span style={{ width: `${pct}%` }} /></div></div>
                  })}
                </div>
              </div>
            </div>

            {hasLegacyNutrition(hoje) && <p role="note" className="text-xs text-amber-200">Registro antigo sem nutrientes preservados: os totais usam o plano disponível e podem estar incompletos.</p>}
            {refs.length === 0 && (
              <div className="card-premium flex flex-col items-center gap-2 p-6 text-center">
                <Settings size={28} className="text-cyan-400" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-white">Seu plano alimentar ainda não foi montado</h2>
                <p className="max-w-sm text-xs leading-relaxed text-neutral-500">Configure suas refeições para acompanhar o progresso diário e registrar alimentos extras.</p>
                {onIrParaConfig && <button type="button" onClick={onIrParaConfig} className="btn-primary mt-2 px-4 py-2.5 text-xs">Configurar refeições</button>}
              </div>
            )}

            {refs.map(ref => {
              const r = hoje?.refeicoes?.[ref.id] || refeicaoVazia()
              const eLimpo = r.status === 'limpo'
              const eCustom = r.status === 'customizado'
              const ePulado = r.status === 'pulado'
              const MealIcon = iconeRefeicao(tipoRefeicao(ref.nome))

              return (
                <div key={ref.id} id={`refeicao-card-${ref.id}`} className={`diet-meal-card card-premium p-4 space-y-2 transition-all ${
                  eLimpo ? 'border-emerald-500/30' : eCustom ? 'border-yellow-500/30' : ePulado ? 'opacity-40' : ''
                }`}>
                  <div className="diet-meal-head">
                    <div className="diet-meal-identity">
                      <span className="diet-meal-icon" aria-hidden="true"><MealIcon size={19} /></span>
                      <div><span className="text-white font-semibold text-sm tracking-tight">{ref.nome}</span><span className="diet-meal-time">{ref.horario}</span></div>
                    </div>
                    <span className={`diet-meal-status ${
                      eLimpo ? 'diet-meal-status-complete' : eCustom ? 'diet-meal-status-custom' : ePulado ? 'diet-meal-status-skipped' : 'diet-meal-status-pending'
                    }`}>
                      {eLimpo ? <><Check size={12} /> Concluído</> : eCustom ? 'Customizado' : ePulado ? 'Pulado' : 'Pendente'}
                    </span>
                  </div>

                  <div className="diet-meal-context" aria-hidden="true"><MealIcon size={50} strokeWidth={1.35} /></div>
                  <ChevronRight className="diet-meal-chevron" size={19} strokeWidth={1.7} aria-hidden="true" />

                  <div className="text-[11px] text-neutral-500 font-mono">{ref.alimentos?.join(' · ') || ref.nome}</div>

                  <div className="diet-meal-nutrition" aria-label={`Nutrientes de ${ref.nome}`}>
                    <div className="diet-meal-kcal"><strong>{Math.round(Number(ref.kcal) || 0)}</strong><span>kcal</span></div>
                    {NUTRIENTE_DEFINICOES.map(item => (
                      <div key={item.key} title={item.label} aria-label={`${item.label}: ${Math.round(Number(ref[item.key]) || 0)} g`}><strong>{Math.round(Number(ref[item.key]) || 0)}</strong><span className="diet-meal-nutrient-icon"><IconeNutriente nutrientKey={item.key} /></span></div>
                    ))}
                  </div>

                  {eLimpo && <div className="diet-meal-confirmed"><Check size={13} /> Incluída no progresso alimentar</div>}

                  <div className="flex items-center gap-2 pt-1">
                    <button type="button" onClick={() => confirmar(ref.id)}
                      aria-label={eLimpo ? 'Desfazer conclusão' : 'Confirmar refeição'}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        eLimpo ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-emerald-500/30'
                      }`}>
                      {eLimpo ? <><Check size={14} /> Concluído</> : <><CircleCheck size={14} /> Confirmar</>}
                    </button>
                    <button type="button" onClick={() => pular(ref.id)}
                      aria-label={ePulado ? 'Desfazer pulo' : 'Pular refeição'}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                        ePulado ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'bg-neutral-800 text-neutral-300 border border-neutral-700 hover:border-red-500/30'
                      }`}>
                      {ePulado ? <><CircleX size={13} /> Pulado</> : <><SkipForward size={13} /> Pular</>}
                    </button>
                  </div>

                </div>
              )
            })}

            <div
              ref={extraCardRef}
              aria-live="polite"
              className={[
                'diet-extra-card rounded-2xl p-4 space-y-2 transition-shadow duration-300',
                extraHighlighted
                  ? 'bg-cyan-500/10 border-2 border-cyan-400 shadow-[0_0_24px_rgba(34,211,238,0.5)]'
                  : 'bg-neutral-900/50 backdrop-blur-md border border-cyan-500/20',
              ].join(' ')}
            >
              <div className="diet-extra-card-head">
                <span className="diet-section-label">
                  {editandoExtraIdx !== null ? <><Pencil size={13} /> Editar alimento</> : <><Plus size={13} /> Alimento extra</>}
                </span>
                {aiResultReady && <span className="diet-ai-ready"><Sparkles size={12} /> Resultado da IA</span>}
              </div>
              <div className="space-y-1.5">
                <div>
                  <label htmlFor="extra-nome" className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">Nome</label>
                  <input
                    id="extra-nome"
                    ref={extraNomeRef}
                    type="text"
                    placeholder="ex: banana"
                    value={extraGlobal.nome}
                    onChange={e => { ++formVersion.current; setExtraGlobal(p => ({ ...p, nome: e.target.value })) }}
                    className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-cyan-400/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { key: 'kcal',         label: 'Calorias (kcal)' },
                    { key: 'proteinas',    label: 'Proteína (g)' },
                    { key: 'carboidratos', label: 'Carboidrato (g)' },
                    { key: 'gorduras',     label: 'Gordura (g)' },
                    { key: 'fibras',       label: 'Fibras (g)' },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <label htmlFor={`extra-${key}`} className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">{label}</label>
                      <input
                        id={`extra-${key}`}
                        type="text"
                        inputMode="decimal"
                        placeholder="0"
                        value={extraGlobal[key]}
                        onChange={e => { ++formVersion.current; setExtraGlobal(p => ({ ...p, [key]: e.target.value })) }}
                        className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-2.5 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-cyan-400/30 num"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                {(editandoExtraIdx !== null || extraGlobal.nome || extraGlobal.kcal || extraGlobal.proteinas || extraGlobal.carboidratos || extraGlobal.gorduras || extraGlobal.fibras) && (
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
                  disabled={!extraGlobal.nome.trim() || extraSaving}
                  className="flex-1 btn-primary w-full py-3 flex items-center justify-center gap-1"
                >
                  <Plus size={14} /> {editandoExtraIdx !== null ? 'Atualizar' : 'Adicionar'}
                </button>
              </div>
              {(hoje?.extras_globais || []).map(e => (
                <div key={e.id} ref={node => { if (node) extraItemRefs.current[e.id] = node; else delete extraItemRefs.current[e.id] }} className="diet-extra-entry diet-extra-meal-card">
                  <div className="diet-extra-entry-head diet-meal-head">
                    <div className="diet-meal-identity">
                      <span className="diet-meal-icon diet-extra-entry-icon" aria-hidden="true"><Utensils size={18} /></span>
                      <div><span className="truncate text-sm text-white font-semibold">{e.nome || '(sem nome)'}</span><span className="diet-meal-time">Alimento extra</span></div>
                    </div>
                    <span className="diet-meal-status diet-extra-entry-status"><Check size={12} /> Incluído</span>
                  </div>
                  <div className="diet-meal-nutrition" aria-label={`Nutrientes de ${e.nome || 'alimento extra'}`}>
                    <div className="diet-meal-kcal"><strong>{Math.round(Number(e.kcal) || 0)}</strong><span>kcal</span></div>
                    {NUTRIENTE_DEFINICOES.map(item => (
                      <div key={item.key} title={item.label} aria-label={`${item.label}: ${Math.round(Number(e[item.key]) || 0)} g`}><strong>{Math.round(Number(e[item.key]) || 0)}</strong><span className="diet-meal-nutrient-icon"><IconeNutriente nutrientKey={item.key} /></span></div>
                    ))}
                  </div>
                  <div className="diet-extra-actions diet-extra-entry-actions">
                    <button type="button" onClick={() => editarExtra(e.id)} aria-label={`Editar ${e.nome || 'alimento'}`} className="diet-extra-action diet-extra-action-edit"><Pencil size={13} /><span>Editar</span></button>
                    <button type="button" onClick={() => removerExtraGlobal(e.id)} aria-label={`Apagar ${e.nome || 'alimento'}`} className="diet-extra-action diet-extra-action-delete"><X size={13} /><span>Apagar</span></button>
                  </div>
                </div>
              ))}
            </div>

            <div className={`diet-ai-card rounded-2xl p-4 space-y-2 ${aiLoading ? 'diet-ai-card--loading' : ''}`} aria-busy={aiLoading}>
              <div className="diet-ai-head"><span className="diet-section-label diet-section-label-ai"><Sparkles size={13} /> Analisar alimento com IA</span><span className={`diet-ai-helper ${aiLoading ? 'diet-ai-helper-loading' : ''}`} aria-live="polite">{aiLoading ? 'Processando sua descrição...' : 'Revise antes de adicionar'}</span></div>
              <textarea rows={2} maxLength={LIMITS.textoIA}
                placeholder="Ex: Comi uma parmegiana de frango com arroz no almoço..."
                value={aiInput} onChange={e => { ++formVersion.current; setAiInput(sanitizarTexto(e.target.value).slice(0, LIMITS.textoIA)) }}
                className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-400/30 resize-none" />
              <button onClick={analisarComIA} disabled={!aiInput.trim() || aiLoading}
                className="diet-ai-submit w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30">
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                {[
                  { label: 'Calorias', v: Math.round(totais.kcal), m: userMetas.kcal, u: 'kcal' },
                  { label: 'Proteínas', v: Math.round(totais.proteinas), m: userMetas.proteinas, u: 'g' },
                  { label: 'Carbo', v: Math.round(totais.carboidratos), m: userMetas.carboidratos, u: 'g' },
                  { label: 'Gorduras', v: Math.round(totais.gorduras), m: userMetas.gorduras, u: 'g' },
                  { label: 'Fibras', v: Math.round(totais.fibras), m: userMetas.fibras, u: 'g' },
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
          metaKcal={userMetas.kcal}
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
          aplicarPulo(id)
          setPularConfirmId(null)
        }}
        onCancel={() => setPularConfirmId(null)}
      />
    </div>
  )
}

function PainelEstatisticas({ mesDocs, carregarMes, refs, metaKcal, mesAtual, setMesAtual, podeAvancar, onDayClick }) {
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
    const goal = doc.metas_snapshot?.kcal ?? metaKcal
    if (!goal) return { backgroundColor: 'rgb(34 211 238 / 0.3)' }
    if (kcal <= goal) return { backgroundColor: 'rgb(34 197 94 / 0.4)' }
    return { backgroundColor: 'rgb(34 211 238 / 0.5)' }
  }

  function kcalDoDia(doc) { return calcularTotais(doc, refs).kcal }

  let greenDays = 0; let yellowDays = 0; let redDays = 0; let totalDiasComDado = 0
  let consumed = 0; let planned = 0
  const diasMap = {}
  mesDocs.forEach(d => {
    diasMap[d.data] = d
    const progress = diaryProgress(d, refs)
    if (!progress.registered) return
    totalDiasComDado++
    consumed += Math.min(progress.planned, progress.consumed)
    planned += progress.planned
    if (progress.percent >= 100) greenDays++
    else if (progress.consumed > 0) yellowDays++
    else redDays++
  })
  const aderencia = planned ? Math.round(consumed / planned * 100) : 0

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
          <span className="text-neutral-500 text-xs block mt-0.5">Refeições registradas</span>
        </div>
      </div>

      <div className="card-premium p-4 space-y-2">
        <div className="flex flex-wrap gap-2 items-center justify-between text-xs">
          <span className="text-emerald-400 font-medium"><span className="diet-legend-dot diet-legend-good" /> {greenDays} dias com plano registrado</span>
          <span className="text-yellow-400 font-medium"><span className="diet-legend-dot diet-legend-warn" /> {yellowDays} dias parciais</span>
          <span className="text-red-400 font-medium"><span className="diet-legend-dot diet-legend-danger" /> {redDays} dias sem consumo registrado</span>
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
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/40" /> Até a meta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-cyan-500/40" /> Acima da meta</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-800" /> Sem dados</span>
        </div>
      </div>
    </div>
  )
}
