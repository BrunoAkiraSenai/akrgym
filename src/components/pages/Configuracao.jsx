import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { Save, Plus, AlertTriangle, Loader, ChevronDown, ChevronRight, X, Trash, LogOut, UserCircle, Sparkles, RefreshCw, Palette, Dumbbell, Apple, CheckCircle2, ShieldCheck } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'
import { THEMES, useTheme } from '../../utils/themes'

function gerarIdRefeicao() {
  return `refeicao_${Date.now()}`
}

const CONFIG_REF = (uid) => doc(db, 'users', uid, 'config', 'data')

export default function Configuracao({ abaInicial }) {
  const user = useUser()
  const [themeId, setThemeId] = useTheme()
  const [config, setConfig] = useState({ treinos: {}, refeicoes: [], metas: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [sincronizando, setSincronizando] = useState(false)
  const [aba, setAba] = useState(abaInicial || 'treinos')
  const [expandedKey, setExpandedKey] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newNome, setNewNome] = useState('')
  const [textoAlimentos, setTextoAlimentos] = useState({})
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null)
  const sucessoTimerRef = useRef(null)

  const mostrarSucesso = useCallback((mensagem) => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
    setSucesso(mensagem)
    sucessoTimerRef.current = setTimeout(() => setSucesso(null), 3500)
  }, [])

  useEffect(() => () => {
    if (sucessoTimerRef.current) clearTimeout(sucessoTimerRef.current)
  }, [])

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      const snap = await getDoc(CONFIG_REF(user.uid))
      if (snap.exists()) {
        setConfig(snap.data())
        const refs = snap.data().refeicoes || []
        const init = {}
        refs.forEach((r, i) => { init[i] = (r.alimentos || []).join(', ') })
        setTextoAlimentos(init)
      }
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setLoading(false)
  }, [user.uid])

  // Sincroniza a configuração inicial com o Firestore ao montar a tela.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { carregar() }, [carregar])


  function validarNumero(valor, min, max, nome) {
    const v = parseFloat(String(valor || '').replace(',', '.'))
    if (isNaN(v) || v < min || v > max) {
      throw new Error(`${nome} inválido — deve ser entre ${min} e ${max}.`)
    }
    return v
  }

  const salvar = async (novo) => {
    setSaving(true); setErro(null); setSucesso(null)
    try {
      const sanitizado = { ...novo, metas: { ...(novo.metas || {}) }, refeicoes: [...(novo.refeicoes || [])] }
      if (sanitizado.metas) {
        sanitizado.metas.kcal = validarNumero(sanitizado.metas.kcal, 0, 99999, 'Kcal')
        sanitizado.metas.proteinas = validarNumero(sanitizado.metas.proteinas, 0, 9999, 'Proteínas')
        sanitizado.metas.carboidratos = validarNumero(sanitizado.metas.carboidratos, 0, 9999, 'Carboidratos')
        sanitizado.metas.gorduras = validarNumero(sanitizado.metas.gorduras, 0, 9999, 'Gorduras')
      }
      sanitizado.refeicoes = sanitizado.refeicoes.map(r => ({
        ...r,
        kcal: validarNumero(r.kcal, 0, 99999, `Kcal de "${r.nome}"`),
        proteinas: validarNumero(r.proteinas, 0, 9999, `Proteínas de "${r.nome}"`),
        carboidratos: validarNumero(r.carboidratos, 0, 9999, `Carboidratos de "${r.nome}"`),
        gorduras: validarNumero(r.gorduras, 0, 9999, `Gorduras de "${r.nome}"`),
      }))
      if (sanitizado.treinos) {
        for (const key of Object.keys(sanitizado.treinos)) {
          sanitizado.treinos[key] = { ...sanitizado.treinos[key], exercicios: (sanitizado.treinos[key].exercicios || []).map(ex => ({ ...ex, base_top: validarNumero(ex.base_top, 0, 9999, `Base Top de "${ex.nome}"`) })) }
        }
      }
      await setDoc(CONFIG_REF(user.uid), sanitizado)
      setConfig(sanitizado)
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
    setConfig(n)
    try {
      await setDoc(CONFIG_REF(user.uid), n)
      mostrarSucesso(`Divisão "${nome}" criada.`)
    } catch (err) {
      setConfig(config)
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
    try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso(`Divisão "${config.treinos[key]?.nome || key}" excluída.`) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    if (expandedKey === key) setExpandedKey(null)
  }

  const addExercise = async (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: [...(n.treinos[key].exercicios || []), { nome: 'Novo', base_top: 20, meta_reps: '8-10' }] }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso('Exercício adicionado.') } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const updateExercise = async (key, idx, campo, valor) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exs = [...(n.treinos[key].exercicios || [])]
    exs[idx] = { ...exs[idx], [campo]: valor }
    n.treinos[key] = { ...n.treinos[key], exercicios: exs }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const deleteExercise = async (key, idx) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: n.treinos[key].exercicios.filter((_, i) => i !== idx) }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso('Exercício excluído.') } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const updateMeta = (campo, valor) => {
    const num = valor === '' ? '' : Number(valor)
    const n = { ...config, metas: { ...(config.metas || {}), [campo]: num } }
    setConfig(n)
  }

  const updateRefeicao = (idx, campo, valor) => {
    const v = campo === 'nome' || campo === 'horario' || campo === 'alimentos' ? valor : (valor === '' ? '' : Number(valor))
    const n = { ...config, refeicoes: (config.refeicoes || []).map((r, i) => i === idx ? { ...r, [campo]: v } : r) }
    setConfig(n)
  }

  // Debounced save for metas and refeicoes (600ms after last change)
  const configRef = useRef(config)
  useEffect(() => { configRef.current = config }, [config])
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await setDoc(CONFIG_REF(user.uid), configRef.current)
      } catch (err) {
        setErro('Erro ao salvar: ' + err.message)
      }
    }, 600)
    return () => clearTimeout(timer)
  }, [config.metas, config.refeicoes, user.uid])

  const addRefeicao = async () => {
    const n = { ...config, refeicoes: [...(config.refeicoes || []), { id: gerarIdRefeicao(), nome: 'Nova Refeição', horario: '00:00', alimentos: [], kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }] }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso('Refeição adicionada.') } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const deleteRefeicao = async (idx) => {
    const ref = (config.refeicoes || [])[idx]
    if (!ref) return
    if (!window.confirm(`Deseja excluir a refeição "${ref.nome}"? Os dados históricos não serão afetados.`)) return
    const n = { ...config, refeicoes: (config.refeicoes || []).filter((_, i) => i !== idx) }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso(`Refeição "${ref.nome}" excluída.`) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const sincronizarMetas = async () => {
    setSincronizando(true)
    setErro(null)
    const refeicoes = config.refeicoes || []
    const total = refeicoes.reduce((acc, r) => ({
      kcal: acc.kcal + (Number(r.kcal) || 0),
      proteinas: acc.proteinas + (Number(r.proteinas) || 0),
      carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0),
      gorduras: acc.gorduras + (Number(r.gorduras) || 0),
    }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
    const n = { ...config, metas: total }
    setConfig(n)
    try {
      await setDoc(CONFIG_REF(user.uid), n)
      mostrarSucesso(`Metas sincronizadas: ${total.kcal} kcal, ${total.proteinas}g P, ${total.carboidratos}g C e ${total.gorduras}g G.`)
    } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    setSincronizando(false)
  }

  const calcularMacrosRefeicao = async (idx) => {
    const texto = textoAlimentos[idx]
    if (!texto?.trim()) return
    setAiLoadingIdx(idx)
    const macros = await calcularMacrosIA(texto)
    if (macros._erro) {
      setErro(macros._erro)
      setTimeout(() => setErro(null), 3000)
    } else {
      const n = { ...config, refeicoes: (config.refeicoes || []).map((r, i) => i === idx ? { ...r, kcal: macros.kcal, proteinas: macros.proteinas, carboidratos: macros.carboidratos, gorduras: macros.gorduras } : r) }
      setConfig(n)
      try { await setDoc(CONFIG_REF(user.uid), n); mostrarSucesso(`Macros de "${n.refeicoes[idx].nome}" atualizados pela IA.`) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    }
    setAiLoadingIdx(null)
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

      {aba === 'treinos' ? (
        loading ? (
          <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
        ) : (
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
                  <article key={key} className={`settings-routine card-premium ${isOpen ? 'settings-routine-open' : ''}`}>
                    <button type="button" onClick={() => setExpandedKey(isOpen ? null : key)} className="settings-routine-trigger" aria-expanded={isOpen}>
                      <span className="settings-routine-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 flex-1 text-left"><strong className="block truncate text-sm text-white">{rotina.nome || key}</strong><small className="mt-0.5 block truncate font-mono text-[10px] text-neutral-500">{key}</small></span>
                      <span className="settings-routine-count">{exerciseCount} {exerciseCount === 1 ? 'exercício' : 'exercícios'}</span>
                      {isOpen ? <ChevronDown size={16} className="text-emerald-400" /> : <ChevronRight size={16} className="text-neutral-500" />}
                    </button>
                    {isOpen && <div className="settings-routine-body">
                      {(rotina.exercicios || []).map((ex, idx) => (
                        <div key={idx} className="settings-exercise">
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
        )
      ) : (
        <section className="settings-section" aria-labelledby="dieta-heading">
          <div className="settings-section-head"><div><span className="section-label" id="dieta-heading">Plano alimentar</span><p className="mt-1 text-xs text-neutral-500">Defina suas metas e deixe cada refeição pronta para o dia.</p></div><span className="settings-count-badge">{totalRefeicoes} refeições</span></div>

          <div className="settings-goals card-premium p-4">
            <div className="settings-form-head"><div><h2 className="text-sm font-bold text-white">Metas diárias</h2><p className="mt-0.5 text-[10px] text-neutral-500">Esses valores orientam o progresso mostrado no Diário.</p></div><RefreshCw size={17} className="text-cyan-400" /></div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { key: 'kcal', label: 'Calorias', unit: 'kcal', val: config.metas?.kcal ?? 1970 },
                { key: 'proteinas', label: 'Proteínas', unit: 'g', val: config.metas?.proteinas ?? 165 },
                { key: 'carboidratos', label: 'Carboidratos', unit: 'g', val: config.metas?.carboidratos ?? 226 },
                { key: 'gorduras', label: 'Gorduras', unit: 'g', val: config.metas?.gorduras ?? 43 },
              ].map(c => <label key={c.key} className="settings-goal"><span>{c.label}</span><div><input type="text" inputMode="numeric" value={c.val} onChange={e => updateMeta(c.key, e.target.value)} aria-label={`Meta de ${c.label}`} /><small>{c.unit}</small></div></label>)}
            </div>
            {(() => {
              const somaRefeicoes = (config.refeicoes || []).reduce((acc, r) => ({ kcal: acc.kcal + (Number(r.kcal) || 0), proteinas: acc.proteinas + (Number(r.proteinas) || 0), carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0), gorduras: acc.gorduras + (Number(r.gorduras) || 0) }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
              return <div className="settings-goals-footer"><span>Total das refeições</span><strong>{somaRefeicoes.kcal} kcal · {somaRefeicoes.proteinas}g P · {somaRefeicoes.carboidratos}g C · {somaRefeicoes.gorduras}g G</strong><button type="button" onClick={sincronizarMetas} disabled={sincronizando} className="settings-action settings-action-outline"><RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} /> {sincronizando ? 'Sincronizando...' : 'Sincronizar metas'}</button></div>
            })()}
          </div>

          <div className="settings-meals card-premium p-4">
            <div className="settings-section-head"><div><span className="section-label">Refeições</span><p className="mt-1 text-xs text-neutral-500">Edite horários, alimentos e macros. A IA pode preencher os valores.</p></div><button type="button" onClick={addRefeicao} className="settings-action settings-action-primary"><Plus size={14} /> Nova refeição</button></div>
            {(config.refeicoes || []).length === 0 && <div className="settings-empty settings-empty-small"><Apple size={21} /><p>Nenhuma refeição configurada.</p></div>}
            <div className="settings-meal-list">
              {(config.refeicoes || []).map((ref, i) => (
                <article key={ref.id || i} className="settings-meal">
                  <div className="settings-meal-head"><span className="settings-meal-index">{String(i + 1).padStart(2, '0')}</span><label className="settings-field settings-field-grow"><span>Nome da refeição</span><input type="text" value={ref.nome || ''} onChange={e => updateRefeicao(i, 'nome', e.target.value)} /></label><label className="settings-field settings-time"><span>Horário</span><input type="text" value={ref.horario || ''} onChange={e => updateRefeicao(i, 'horario', e.target.value)} /></label><button type="button" onClick={() => deleteRefeicao(i)} className="settings-icon-button settings-icon-danger" aria-label={`Excluir ${ref.nome || 'refeição'}`}><Trash size={15} /></button></div>
                  <div className="settings-food-row"><label className="settings-field settings-field-grow"><span>Alimentos</span><input type="text" value={textoAlimentos[i] ?? (ref.alimentos || []).join(', ')} onChange={e => setTextoAlimentos(p => ({ ...p, [i]: e.target.value }))} onBlur={e => updateRefeicao(i, 'alimentos', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="Ex: arroz, frango, salada" /></label><button type="button" onClick={() => calcularMacrosRefeicao(i)} disabled={!textoAlimentos[i]?.trim() || aiLoadingIdx === i} className="settings-ai-button" title="Calcular macros com IA"><Sparkles size={15} /> <span>{aiLoadingIdx === i ? 'Analisando' : 'Calcular IA'}</span></button></div>
                  <div className="settings-macro-grid">
                    {[{ key: 'kcal', label: 'Calorias', unit: 'kcal' }, { key: 'proteinas', label: 'Proteínas', unit: 'g' }, { key: 'carboidratos', label: 'Carboidratos', unit: 'g' }, { key: 'gorduras', label: 'Gorduras', unit: 'g' }].map(c => <label key={c.key} className="settings-field"><span>{c.label} ({c.unit})</span><input type="text" inputMode="decimal" value={ref[c.key] ?? ''} onChange={e => updateRefeicao(i, c.key, e.target.value)} aria-label={`${c.label} da refeição`} /></label>)}
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
