import { useState, useEffect, useCallback, useRef } from 'react'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { Save, Plus, AlertTriangle, Loader, ChevronDown, ChevronRight, X, Trash, LogOut, UserCircle, Sparkles, RefreshCw, Palette, Dumbbell, Apple, CheckCircle2, ShieldCheck, Download } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { THEMES, useTheme } from '../../utils/themes'
import { buildUserDataExport, formatExportFilename } from '../../utils/exportData'
import { prepararConfigParaSalvar } from '../../utils/configValidation'

function gerarIdRefeicao() {
  return `refeicao_${Date.now()}`
}

function normalizarListaAlimentos(texto) {
  return String(texto || '').split(',').map(item => item.trim()).filter(Boolean)
}

const CONFIG_REF = (uid) => doc(db, 'users', uid, 'config', 'data')
const METAS_PADRAO = { kcal: 1970, proteinas: 165, carboidratos: 226, gorduras: 43, fibras: 30 }

function numeroNutricional(valor, fallback = 0) {
  const numero = Number(typeof valor === 'string' ? valor.replace(',', '.') : valor)
  return Number.isFinite(numero) && numero >= 0 ? numero : fallback
}

function normalizarConfigNutricional(data) {
  return {
    ...data,
    metas: { ...METAS_PADRAO, ...(data.metas || {}), fibras: numeroNutricional(data.metas?.fibras, METAS_PADRAO.fibras) },
    refeicoes: (Array.isArray(data.refeicoes) ? data.refeicoes : []).map(ref => ({
      ...ref,
      fibras: numeroNutricional(ref.fibras),
    })),
  }
}

export default function Configuracao({ abaInicial }) {
  const user = useUser()
  const [themeId, setThemeId] = useTheme()
  const [config, setConfig] = useState({ treinos: {}, refeicoes: [], metas: METAS_PADRAO })
  const [loading, setLoading] = useState(true)
  const [configCarregada, setConfigCarregada] = useState(false)
  const [nutricaoAlterada, setNutricaoAlterada] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState(abaInicial || 'treinos')
  const [expandedKey, setExpandedKey] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newNome, setNewNome] = useState('')
  const [textoAlimentos, setTextoAlimentos] = useState({})
  const textoAlimentosRef = useRef(textoAlimentos)
  useEffect(() => { textoAlimentosRef.current = textoAlimentos }, [textoAlimentos])
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null)
  const sucessoTimerRef = useRef(null)
  const pendingFocusRef = useRef(null)
  const routineRefs = useRef({})
  const exerciseRefs = useRef({})
  const mealRefs = useRef({})
  const mountedRef = useRef(false)
  const loadedUidRef = useRef(null)
  const loadSequenceRef = useRef(0)
  const aiSequenceRef = useRef(0)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      loadedUidRef.current = null
      loadSequenceRef.current += 1
      aiSequenceRef.current += 1
    }
  }, [])

  const mostrarSucesso = useCallback((mensagem) => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
    setSucesso(mensagem)
    sucessoTimerRef.current = setTimeout(() => setSucesso(null), 3500)
  }, [])

  useEffect(() => () => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
  }, [])

  useEffect(() => {
    const pending = pendingFocusRef.current
    if (!pending) return

    const refs = pending.type === 'routine' ? routineRefs.current : pending.type === 'exercise' ? exerciseRefs.current : mealRefs.current
    const node = refs[pending.key]
    if (!node) return

    pendingFocusRef.current = null
    node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => {
      const target = node.querySelector(pending.type === 'routine' ? 'button' : 'input')
      target?.focus({ preventScroll: true })
    }, 350)
    return () => clearTimeout(timer)
  }, [config])

  const carregar = useCallback(async () => {
    const sequence = ++loadSequenceRef.current
    loadedUidRef.current = null
    setConfigCarregada(false)
    setLoading(true); setErro(null)
    try {
      const snap = await getDoc(CONFIG_REF(user.uid))
      if (!mountedRef.current || sequence !== loadSequenceRef.current) return
      if (snap.exists()) {
        const dados = normalizarConfigNutricional(snap.data())
        setConfig(dados)
        const refs = dados.refeicoes || []
        const init = {}
        refs.forEach(r => { init[r.id] = (r.alimentos || []).join(', ') })
        setTextoAlimentos(init)
        setNutricaoAlterada(false)
        loadedUidRef.current = user.uid
        setConfigCarregada(true)
      }
    } catch (err) {
      if (mountedRef.current && sequence === loadSequenceRef.current) setErro(`Erro: ${err.message}`)
    }
    if (mountedRef.current && sequence === loadSequenceRef.current) setLoading(false)
  }, [user.uid])

  // Sincroniza a configuração inicial com o Firestore ao montar a tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar() }, [carregar])


  const salvar = async (novo) => {
    if (loading || loadedUidRef.current !== user.uid) return
    setSaving(true); setErro(null); setSucesso(null)
    try {
      const sanitizado = prepararConfigParaSalvar(novo)
      await setDoc(CONFIG_REF(user.uid), sanitizado)
      mostrarSucesso('Alterações salvas com sucesso.')
    } catch (err) { setErro(err.message); setSaving(false); return }
    setSaving(false)
  }

  const addRoutine = async () => {
    const key = newKey.trim()
    const nome = newNome.trim()
    if (!key || !nome) return
    if (config.treinos?.[key]) {
      setErro(`Já existe uma divisão com o ID "${key}".`)
      return
    }
    const n = { ...config, treinos: { ...config.treinos, [key]: { nome, exercicios: [] } } }
    pendingFocusRef.current = { type: 'routine', key }
    setConfig(n)
    try {
      await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n))
      mostrarSucesso(`Divisão "${nome}" criada.`)
    } catch (err) {
      setConfig(config)
      pendingFocusRef.current = null
      setErro('Erro ao salvar treino: ' + err.message)
      return
    }
    setNewKey(''); setNewNome(''); setShowNewRoutine(false)
    setExpandedKey(key)
  }

  const deleteRoutine = async (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    delete n.treinos[key]
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)); mostrarSucesso(`Divisão "${config.treinos[key]?.nome || key}" excluída.`) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    if (expandedKey === key) setExpandedKey(null)
  }

  const addExercise = async (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exercicios = [...(n.treinos[key].exercicios || []), { nome: 'Novo', base_top: 20, meta_reps: '8-10' }]
    n.treinos[key] = { ...n.treinos[key], exercicios }
    pendingFocusRef.current = { type: 'exercise', key: `${key}:${exercicios.length - 1}` }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)); mostrarSucesso('Exercício adicionado.') } catch (err) { pendingFocusRef.current = null; setErro('Erro ao salvar: ' + err.message) }
  }

  const updateExercise = async (key, idx, campo, valor) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exs = [...(n.treinos[key].exercicios || [])]
    exs[idx] = { ...exs[idx], [campo]: valor }
    n.treinos[key] = { ...n.treinos[key], exercicios: exs }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const deleteExercise = async (key, idx) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: n.treinos[key].exercicios.filter((_, i) => i !== idx) }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)); mostrarSucesso('Exercício excluído.') } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const updateMeta = (campo, valor) => {
    const n = { ...config, metas: { ...(config.metas || {}), [campo]: valor } }
    setConfig(n)
    setNutricaoAlterada(true)
  }

  const updateRefeicao = (idx, campo, valor) => {
    const n = { ...config, refeicoes: (config.refeicoes || []).map((r, i) => i === idx ? { ...r, [campo]: valor } : r) }
    setConfig(n)
    setNutricaoAlterada(true)
  }

  // Debounced save for metas and refeicoes (600ms after last change)
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => {
    if (loading || !nutricaoAlterada || loadedUidRef.current !== user.uid) return
    const timer = setTimeout(async () => {
      try {
        const atual = configRef.current
        await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(atual))
        if (mountedRef.current && configRef.current === atual) setNutricaoAlterada(false)
      } catch (err) {
        if (mountedRef.current) setErro('Erro ao salvar: ' + err.message)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [config.metas, config.refeicoes, user.uid, loading, nutricaoAlterada])

  const addRefeicao = async () => {
    const id = gerarIdRefeicao()
    const refeicoes = [...(config.refeicoes || []), { id, nome: 'Nova Refeição', horario: '00:00', alimentos: [], kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 }]
    const n = { ...config, refeicoes }
    pendingFocusRef.current = { type: 'meal', key: id }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)); mostrarSucesso('Refeição adicionada.') } catch (err) { pendingFocusRef.current = null; setErro('Erro ao salvar: ' + err.message) }
  }

  const deleteRefeicao = async (idx) => {
    const ref = (config.refeicoes || [])[idx]
    if (!ref) return
    if (!window.confirm(`Deseja excluir a refeição "${ref.nome}"? Os dados históricos não serão afetados.`)) return
    const n = { ...config, refeicoes: (config.refeicoes || []).filter((_, i) => i !== idx) }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n)); mostrarSucesso(`Refeição "${ref.nome}" excluída.`) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const sincronizarMetas = async () => {
    setSincronizando(true)
    setErro(null)
    let refeicoes
    try { refeicoes = prepararConfigParaSalvar(config).refeicoes }
    catch (err) { setErro(err.message); setSincronizando(false); return }
    const total = refeicoes.reduce((acc, r) => ({
      kcal: acc.kcal + (Number(r.kcal) || 0),
      proteinas: acc.proteinas + (Number(r.proteinas) || 0),
      carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0),
      gorduras: acc.gorduras + (Number(r.gorduras) || 0),
      fibras: acc.fibras + (Number(r.fibras) || 0),
    }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })
    const n = { ...config, metas: total }
    setConfig(n)
    try {
      await setDoc(CONFIG_REF(user.uid), prepararConfigParaSalvar(n))
      mostrarSucesso(`Metas sincronizadas: ${total.kcal} kcal, ${total.proteinas}g P, ${total.carboidratos}g C, ${total.gorduras}g G e ${total.fibras}g de fibras.`)
    } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    setSincronizando(false)
  }

  const calcularMacrosRefeicao = async (idx) => {
    const refeicao = config.refeicoes?.[idx]
    const texto = textoAlimentos[refeicao?.id]
    if (!texto?.trim() || !refeicao || loadedUidRef.current !== user.uid) return
    const sequence = ++aiSequenceRef.current
    // O clique pode ocorrer imediatamente depois de editar o input. Nesse
    // caso, o onBlur já atualizou a refeição no estado mais recente; comparar
    // com a lista capturada antes do blur faria a análise válida ser descartada.
    const alimentosAnalisados = JSON.stringify(normalizarListaAlimentos(texto))
    setAiLoadingIdx(idx)
    const macros = await calcularMacrosIA(texto)
    if (!mountedRef.current || sequence !== aiSequenceRef.current) return
    const atual = configRef.current
    const targetIdx = (atual.refeicoes || []).findIndex(ref => ref.id === refeicao.id)
    if (targetIdx < 0 || textoAlimentosRef.current[refeicao.id] !== texto || JSON.stringify(atual.refeicoes[targetIdx].alimentos || []) !== alimentosAnalisados) {
      setErro('A refeição mudou durante a análise. Analise os alimentos atuais novamente.')
      setAiLoadingIdx(null)
      return
    }
    if (macros._erro) {
      setErro(macros._erro)
      setTimeout(() => setErro(null), 3000)
    } else {
      const n = { ...atual, refeicoes: (atual.refeicoes || []).map((r, i) => i === targetIdx ? { ...r, kcal: macros.kcal, proteinas: macros.proteinas, carboidratos: macros.carboidratos, gorduras: macros.gorduras, fibras: macros.fibras } : r) }
      setConfig(n)
      setNutricaoAlterada(true)
      mostrarSucesso(`Macros de "${n.refeicoes[targetIdx].nome}" preenchidos. Salvamento automático em andamento.`)
    }
    setAiLoadingIdx(null)
  }

  const exportarDados = async () => {
    setExportando(true)
    setErro(null)
    try {
      const [configSnap, treinosSnap, dietaSnap, medidasSnap] = await Promise.all([
        getDoc(CONFIG_REF(user.uid)),
        getDocs(collection(db, 'users', user.uid, 'historico_treinos')),
        getDocs(collection(db, 'users', user.uid, 'diario_dieta')),
        getDocs(collection(db, 'users', user.uid, 'historico_corporal')),
      ])
      const dados = buildUserDataExport({
        config: configSnap.exists() ? configSnap.data() : config,
        treinos: treinosSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
        diarioDieta: dietaSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
        medidas: medidasSnap.docs.map(snapshot => ({ id: snapshot.id, ...snapshot.data() })),
      })
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = formatExportFilename()
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 0)
      mostrarSucesso('Seus dados foram exportados em JSON.')
    } catch (err) {
      setErro(`Não foi possível exportar os dados: ${err.message}`)
    } finally {
      setExportando(false)
    }
  }

  const totalTreinos = Object.keys(config.treinos || {}).length
  const totalRefeicoes = (config.refeicoes || []).length

  return (
    <div className="settings-page flex flex-col gap-4 pt-2 pb-6">
      <header className="settings-header">
        <div>
          <p className="settings-kicker">Painel de controle</p>
          <h1 className="text-2xl font-bold tracking-tight text-white">Configurações</h1>
          <p className="mt-1 max-w-[38rem] text-xs leading-relaxed text-neutral-500">Ajuste seu plano, suas metas e a forma como o AkrGym acompanha sua rotina.</p>
        </div>
        <div className="settings-header-mark" aria-hidden="true"><ShieldCheck size={19} /></div>
      </header>

      <div className="settings-account card-premium p-4">
        <div className="settings-account-avatar"><UserCircle size={24} /></div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">{user.isAnonymous ? 'Visitante' : user.email}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
            <span className={`settings-status ${user.isAnonymous ? 'settings-status-warning' : 'settings-status-success'}`}>
              <span className="settings-status-dot" /> {user.isAnonymous ? 'Conta anônima' : 'Conta sincronizada'}
            </span>
            <span className="font-mono text-white/30">UID {user.uid.slice(0, 8)}...</span>
          </div>
        </div>
        <button type="button" onClick={() => signOut(auth)} className="settings-account-action" title="Sair da conta">
          <LogOut size={15} /> <span className="hidden sm:inline">Sair</span>
        </button>
      </div>

      <section className="card-premium flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="exportar-dados-heading">
        <div className="flex min-w-0 items-start gap-3">
          <div className="settings-account-avatar"><Download size={18} /></div>
          <div className="min-w-0">
            <h2 id="exportar-dados-heading" className="text-sm font-semibold text-white">Seus dados</h2>
            <p className="mt-1 text-xs leading-relaxed text-neutral-500">Baixe uma cópia local da sua configuração, treinos, diário alimentar e medidas.</p>
          </div>
        </div>
        <button type="button" onClick={exportarDados} disabled={exportando} className="settings-action settings-action-outline shrink-0 self-stretch sm:self-auto">
          {exportando ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          {exportando ? 'Preparando...' : 'Exportar JSON'}
        </button>
      </section>

      <div className="card-premium space-y-3 p-4">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-emerald-400" />
          <span className="section-label">Aparência</span>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {THEMES.map((t) => (
            <button type="button" key={t.id} onClick={() => setThemeId(t.id)} className={`theme-swatch ${themeId === t.id ? 'active' : ''}`} title={t.name} aria-pressed={themeId === t.id}>
              <div className="theme-swatch-preview" style={{ background: t.previewBg || t.bgDeep, color: t.mode === 'light' ? '#2b1a15' : '#ffffff', boxShadow: `inset 0 0 0 1px ${t.brand[500]}44` }}>
                <span className="theme-swatch-preview-dot" style={{ background: t.brand[500] }} />
                <span className="theme-swatch-preview-line" style={{ background: t.mode === 'light' ? '#765c50' : '#ffffff99' }} />
              </div>
              <div className="theme-swatch-dots justify-center">
                <span className="theme-swatch-dot" style={{ background: t.brand[500], color: t.brand[500] }} />
                <span className="theme-swatch-dot" style={{ background: t.accent[500], color: t.accent[500] }} />
                <span className="theme-swatch-dot" style={{ background: t.highlightHex, color: t.highlightHex }} />
              </div>
              <span className="text-[10px] font-semibold text-neutral-300 block leading-tight">{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Seções de configuração">
        <button type="button" role="tab" aria-selected={aba === 'treinos'} onClick={() => setAba('treinos')} className={`settings-tab ${aba === 'treinos' ? 'settings-tab-active' : ''}`}>
          <Dumbbell size={15} /> <span>Treinos</span><small>{totalTreinos}</small>
        </button>
        <button type="button" role="tab" aria-selected={aba === 'dieta'} onClick={() => setAba('dieta')} className={`settings-tab ${aba === 'dieta' ? 'settings-tab-active' : ''}`}>
          <Apple size={15} /> <span>Dieta</span><small>{totalRefeicoes}</small>
        </button>
      </div>

      {erro && <div className="settings-feedback settings-feedback-error" role="alert"><AlertTriangle size={16} /><span>{erro}</span><button type="button" onClick={() => setErro(null)} aria-label="Fechar aviso"><X size={14} /></button></div>}
      {sucesso && <div className="settings-feedback settings-feedback-success" role="status" aria-live="polite"><CheckCircle2 size={16} /><span>{sucesso}</span></div>}

      {loading ? (
        <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
      ) : !configCarregada ? (
        <div role="status"><p>Não foi possível carregar seu plano com segurança.</p><button type="button" onClick={carregar} className="settings-action settings-action-outline">Tentar novamente</button></div>
      ) : aba === 'treinos' ? (
          <section className="settings-section" aria-labelledby="treinos-heading">
            <div className="settings-section-head">
              <div><span className="section-label" id="treinos-heading">Divisões de treino</span><p className="mt-1 text-xs text-neutral-500">Organize exercícios, carga inicial e meta de repetições.</p></div>
              <button type="button" onClick={() => setShowNewRoutine(true)} className="settings-action settings-action-primary"><Plus size={15} /> <span>Nova divisão</span></button>
            </div>

            {showNewRoutine && (
              <div className="settings-form card-premium p-4">
                <div className="settings-form-head"><div><h2 className="text-sm font-bold text-white">Criar divisão</h2><p className="mt-0.5 text-[10px] text-neutral-500">Use um identificador curto e um nome fácil de reconhecer.</p></div><button type="button" onClick={() => setShowNewRoutine(false)} className="settings-icon-button" aria-label="Fechar"><X size={16} /></button></div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[0.8fr_1.2fr]">
                  <label className="settings-field"><span>ID interno</span><input type="text" placeholder="ex: upper_c" value={newKey} onChange={e => setNewKey(e.target.value)} autoFocus /></label>
                  <label className="settings-field"><span>Nome da divisão</span><input type="text" placeholder="ex: UPPER C" value={newNome} onChange={e => setNewNome(e.target.value)} /></label>
                </div>
                <div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowNewRoutine(false)} className="settings-action settings-action-muted">Cancelar</button><button type="button" onClick={addRoutine} disabled={!newKey.trim() || !newNome.trim()} className="settings-action settings-action-primary"><Plus size={14} /> Criar divisão</button></div>
              </div>
            )}

            {Object.entries(config.treinos || {}).length === 0 && <div className="settings-empty card-premium"><Dumbbell size={22} /><h2>Nenhuma divisão criada</h2><p>Crie sua primeira divisão para começar a montar o treino.</p></div>}

            <div className="settings-routines">
              {Object.entries(config.treinos || {}).map(([key, rotina], index) => {
                const isOpen = expandedKey === key
                const exerciseCount = (rotina.exercicios || []).length
                return (
                  <article key={key} ref={node => { if (node) routineRefs.current[key] = node; else delete routineRefs.current[key] }} className={`settings-routine card-premium ${isOpen ? 'settings-routine-open' : ''}`}>
                    <button type="button" onClick={() => setExpandedKey(isOpen ? null : key)} className="settings-routine-trigger" aria-expanded={isOpen}>
                      <span className="settings-routine-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm text-white">{rotina.nome || key}</strong><small className="mt-0.5 block truncate font-mono text-[10px] text-neutral-500">{key}</small></span>
                      <span className="settings-routine-count">{exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}</span>
                      {isOpen ? <ChevronDown size={16} className="text-emerald-400" /> : <ChevronRight size={16} className="text-neutral-500" />}
                    </button>
                    {isOpen && <div className="settings-routine-body">
                      {(rotina.exercicios || []).map((ex, idx) => (
                        <div key={idx} ref={node => { const refKey = `${key}:${idx}`; if (node) exerciseRefs.current[refKey] = node; else delete exerciseRefs.current[refKey] }} className="settings-exercise">
                          <div className="settings-exercise-top"><span className="settings-exercise-number">{idx + 1}</span><label className="settings-field settings-field-grow"><span>Exercício</span><input type="text" value={ex.nome} onChange={e => updateExercise(key, idx, 'nome', e.target.value)} /></label><button type="button" onClick={() => deleteExercise(key, idx)} className="settings-icon-button settings-icon-danger" aria-label={`Excluir ${ex.nome}`}><Trash size={15} /></button></div>
                          <div className="mt-2 grid grid-cols-2 gap-2"><label className="settings-field"><span>Base Top (kg)</span><input type="number" value={ex.base_top} onChange={e => updateExercise(key, idx, 'base_top', Number(e.target.value))} inputMode="decimal" /></label><label className="settings-field"><span>Meta de reps</span><input type="text" value={ex.meta_reps} onChange={e => updateExercise(key, idx, 'meta_reps', e.target.value)} /></label></div>
                        </div>
                      ))}
                      <div className="settings-routine-actions"><button type="button" onClick={() => addExercise(key)} className="settings-action settings-action-muted"><Plus size={14} /> Adicionar exercício</button><button type="button" onClick={() => deleteRoutine(key)} className="settings-action settings-action-danger"><Trash size={14} /> Excluir divisão</button></div>
                    </div>}
                  </article>
                )
              })}
            </div>
            <button type="button" onClick={() => salvar(config)} disabled={saving} className="settings-save-button"><span>{saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}</span>{saving ? 'Salvando alterações...' : 'Salvar alterações de treino'}</button>
          </section>
      ) : (
        <section className="settings-section" aria-labelledby="dieta-heading">
          <div className="settings-section-head"><div><span className="section-label" id="dieta-heading">Plano alimentar</span><p className="mt-1 text-xs text-neutral-500">Defina suas metas e deixe cada refeição pronta para o dia.</p></div><span className="settings-count-badge">{totalRefeicoes} refeições</span></div>

          <div className="settings-goals card-premium p-4">
            <div className="settings-form-head"><div><h2 className="text-sm font-bold text-white">Metas diárias</h2><p className="mt-0.5 text-[10px] text-neutral-500">Esses valores orientam o progresso mostrado no Diário.</p></div><RefreshCw size={17} className="text-cyan-400" /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                { key: 'kcal', label: 'Calorias', unit: 'kcal', val: config.metas?.kcal ?? 1970 },
                { key: 'proteinas', label: 'Proteínas', unit: 'g', val: config.metas?.proteinas ?? 165 },
                { key: 'carboidratos', label: 'Carboidratos', unit: 'g', val: config.metas?.carboidratos ?? 226 },
                { key: 'gorduras', label: 'Gorduras', unit: 'g', val: config.metas?.gorduras ?? 43 },
                { key: 'fibras', label: 'Fibras', unit: 'g', val: config.metas?.fibras ?? 30 },
              ].map(c => <label key={c.key} className="settings-goal"><span>{c.label}</span><div><input type="text" inputMode="numeric" value={c.val} onChange={e => updateMeta(c.key, e.target.value)} aria-label={`Meta de ${c.label}`} /><small>{c.unit}</small></div></label>)}
            </div>
            {(() => {
              const somaRefeicoes = (config.refeicoes || []).reduce((acc, r) => ({ kcal: acc.kcal + numeroNutricional(r.kcal), proteinas: acc.proteinas + numeroNutricional(r.proteinas), carboidratos: acc.carboidratos + numeroNutricional(r.carboidratos), gorduras: acc.gorduras + numeroNutricional(r.gorduras), fibras: acc.fibras + numeroNutricional(r.fibras) }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0, fibras: 0 })
              return <div className="settings-goals-footer"><span>Total das refeições</span><strong>{somaRefeicoes.kcal} kcal · {somaRefeicoes.proteinas}g P · {somaRefeicoes.carboidratos}g C · {somaRefeicoes.gorduras}g G · {somaRefeicoes.fibras}g fibras</strong><button type="button" onClick={sincronizarMetas} disabled={sincronizando} className="settings-action settings-action-outline"><RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} /> {sincronizando ? 'Sincronizando...' : 'Sincronizar metas'}</button></div>
            })()}
          </div>

          <div className="settings-meals card-premium p-4">
            <div className="settings-section-head"><div><span className="section-label">Refeições</span><p className="mt-1 text-xs text-neutral-500">Edite horários, alimentos e macros. A IA pode preencher os valores.</p></div><button type="button" onClick={addRefeicao} className="settings-action settings-action-primary"><Plus size={14} /> Nova refeição</button></div>
            {(config.refeicoes || []).length === 0 && <div className="settings-empty settings-empty-small"><Apple size={21} /><p>Nenhuma refeição configurada.</p></div>}
            <div className="settings-meal-list">
              {(config.refeicoes || []).map((ref, i) => (
                <article key={ref.id || i} ref={node => { const refKey = ref.id || String(i); if (node) mealRefs.current[refKey] = node; else delete mealRefs.current[refKey] }} className="settings-meal">
                  <div className="settings-meal-head"><span className="settings-meal-index">{String(i + 1).padStart(2, '0')}</span><label className="settings-field settings-field-grow"><span>Nome da refeição</span><input type="text" value={ref.nome || ''} onChange={e => updateRefeicao(i, 'nome', e.target.value)} /></label><label className="settings-field settings-time"><span>Horário</span><input type="text" value={ref.horario || ''} onChange={e => updateRefeicao(i, 'horario', e.target.value)} /></label><button type="button" onClick={() => deleteRefeicao(i)} className="settings-icon-button settings-icon-danger" aria-label={`Excluir ${ref.nome || 'refeição'}`}><Trash size={15} /></button></div>
                      <div className="settings-food-row"><label className="settings-field settings-field-grow"><span>Alimentos</span><input type="text" value={textoAlimentos[ref.id] ?? (ref.alimentos || []).join(', ')} onChange={e => setTextoAlimentos(p => ({ ...p, [ref.id]: e.target.value }))} onBlur={e => updateRefeicao(i, 'alimentos', normalizarListaAlimentos(e.target.value))} placeholder="Ex: arroz, frango, salada" /></label><button type="button" onClick={() => calcularMacrosRefeicao(i)} disabled={!textoAlimentos[ref.id]?.trim() || aiLoadingIdx === i} className="settings-ai-button" title="Calcular macros com IA"><Sparkles size={15} /> <span>{aiLoadingIdx === i ? 'Analisando' : 'Calcular IA'}</span></button></div>
                  <div className="settings-macro-grid">
                    {[{ key: 'kcal', label: 'Calorias', unit: 'kcal' }, { key: 'proteinas', label: 'Proteínas', unit: 'g' }, { key: 'carboidratos', label: 'Carboidratos', unit: 'g' }, { key: 'gorduras', label: 'Gorduras', unit: 'g' }, { key: 'fibras', label: 'Fibras', unit: 'g' }].map(c => <label key={c.key} className="settings-field"><span>{c.label} ({c.unit})</span><input type="text" inputMode="decimal" value={ref[c.key] ?? 0} onChange={e => updateRefeicao(i, c.key, e.target.value)} aria-label={`${c.label} da refeição`} /></label>)}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <button type="button" onClick={() => salvar(config)} disabled={saving} className="settings-save-button settings-save-button-diet"><span>{saving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}</span>{saving ? 'Salvando alterações...' : 'Salvar alterações da dieta'}</button>
        </section>
      )}

      <div className="settings-footer"><button type="button" onClick={() => signOut(auth)} className="settings-logout"><LogOut size={15} /> Sair da conta</button><span>AkrGym v{import.meta.env.VITE_APP_VERSION || '3.2'} · {new Date().getFullYear()}</span></div>
    </div>
  )
}
