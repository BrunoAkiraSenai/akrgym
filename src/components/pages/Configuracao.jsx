import { useState, useEffect, useCallback, useRef } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { Save, Plus, AlertTriangle, Loader, ChevronDown, ChevronRight, X, Trash, LogOut, UserCircle, Sparkles, RefreshCw } from 'lucide-react'
import { useUser } from '../../context/UserContext'
import { calcularMacrosIA } from '../../utils/gemini'

function gerarIdRefeicao() {
  return `refeicao_${Date.now()}`
}

const CONFIG_REF = (uid) => doc(db, 'users', uid, 'config', 'data')

export default function Configuracao({ abaInicial }) {
  const user = useUser()
  const [config, setConfig] = useState({ treinos: {}, refeicoes: [], metas: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [aba, setAba] = useState(abaInicial || 'treinos')
  const [expandedKey, setExpandedKey] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newNome, setNewNome] = useState('')
  const [textoAlimentos, setTextoAlimentos] = useState({})
  const [aiLoadingIdx, setAiLoadingIdx] = useState(null)

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
  }, [])

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
      setSucesso('Salvo!')
      setTimeout(() => setSucesso(null), 2000)
    } catch (err) { setErro(err.message); setSaving(false); return }
    setSaving(false)
  }

  const addRoutine = async () => {
    if (!newKey.trim() || !newNome.trim()) return
    const n = { ...config, treinos: { ...config.treinos, [newKey.trim()]: { nome: newNome.trim(), exercicios: [] } } }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n); setSucesso('Treino criado!'); setTimeout(() => setSucesso(null), 2000) } catch (err) { setErro('Erro ao salvar treino: ' + err.message) }
    setNewKey(''); setNewNome(''); setShowNewRoutine(false)
    setExpandedKey(newKey.trim())
  }

  const deleteRoutine = async (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    delete n.treinos[key]
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    if (expandedKey === key) setExpandedKey(null)
  }

  const addExercise = async (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: [...(n.treinos[key].exercicios || []), { nome: 'Novo', base_top: 20, meta_reps: '8-10' }] }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
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
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
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
  configRef.current = config
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
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const deleteRefeicao = async (idx) => {
    const ref = (config.refeicoes || [])[idx]
    if (!ref) return
    if (!window.confirm(`Deseja excluir a refeição "${ref.nome}"? Os dados históricos não serão afetados.`)) return
    const n = { ...config, refeicoes: (config.refeicoes || []).filter((_, i) => i !== idx) }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
  }

  const sincronizarMetas = async () => {
    const refeicoes = config.refeicoes || []
    const total = refeicoes.reduce((acc, r) => ({
      kcal: acc.kcal + (Number(r.kcal) || 0),
      proteinas: acc.proteinas + (Number(r.proteinas) || 0),
      carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0),
      gorduras: acc.gorduras + (Number(r.gorduras) || 0),
    }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
    const n = { ...config, metas: total }
    setConfig(n)
    try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
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
      try { await setDoc(CONFIG_REF(user.uid), n) } catch (err) { setErro('Erro ao salvar: ' + err.message) }
    }
    setAiLoadingIdx(null)
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <h1 className="text-xl font-bold tracking-tight text-white mb-1">Configurações</h1>

      <div className="card-premium p-4 flex items-center gap-3">
        <UserCircle size={40} className="text-neutral-400 shrink-0" />
        <div className="min-w-0">
          <div className="text-white font-medium truncate">
            {user.isAnonymous ? 'Visitante' : user.email}
          </div>
          <div className={`text-sm ${user.isAnonymous ? 'text-amber-400' : 'text-emerald-400'}`}>
            {user.isAnonymous ? 'Conta anônima — sem sincronização' : 'Conta sincronizada'}
          </div>
          <div className="text-white/30 text-xs font-mono mt-0.5 truncate">
            {user.uid.slice(0, 8)}...
          </div>
        </div>
      </div>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-1 flex">
        <button onClick={() => setAba('treinos')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'treinos' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Treinos</button>
        <button onClick={() => setAba('dieta')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'dieta' ? 'tab-active' : 'text-neutral-500 hover:text-neutral-300'}`}>Dieta</button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}
      {sucesso && <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3 text-center text-emerald-400 text-xs font-semibold">{sucesso}</div>}

      {aba === 'treinos' ? (
        loading ? (
          <div className="space-y-2"><div className="skeleton skeleton-card" /><div className="skeleton skeleton-card" /></div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Divisões de Treino</span>
              <button onClick={() => setShowNewRoutine(true)}
                className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 font-semibold px-3 py-2 rounded-xl text-xs transition-all active:scale-90 border border-emerald-500/20">
                <Plus size={14} /> Nova
              </button>
            </div>

            {showNewRoutine && (
              <div className="card-premium p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Nova Divisão</span>
                  <button onClick={() => setShowNewRoutine(false)} className="text-neutral-500 hover:text-white"><X size={16} /></button>
                </div>
                <input type="text" placeholder="ID (ex: upper_c)" value={newKey} onChange={e => setNewKey(e.target.value)}
                  className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/30" autoFocus />
                <input type="text" placeholder="Nome (ex: UPPER C)" value={newNome} onChange={e => setNewNome(e.target.value)}
                  className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewRoutine(false)} className="btn-secondary flex-1 py-2.5 text-xs">Cancelar</button>
                  <button onClick={addRoutine} disabled={!newKey.trim() || !newNome.trim()}
                    className="btn-primary flex-1 py-2.5 text-xs">Criar</button>
                </div>
              </div>
            )}

            {Object.entries(config.treinos || {}).map(([key, rotina]) => {
              const isOpen = expandedKey === key
              return (
                <div key={key} className="card-premium overflow-hidden">
                  <button onClick={() => setExpandedKey(isOpen ? null : key)}
                    className="w-full flex items-center justify-between p-4 transition-all active:scale-[0.99] text-left">
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={16} className="text-emerald-400" /> : <ChevronRight size={16} className="text-neutral-500" />}
                      <span className="text-white font-semibold text-sm tracking-tight">{rotina.nome || key}</span>
                    </div>
                    <span className="text-neutral-500 text-xs font-mono">{(rotina.exercicios || []).length}</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-2">
                      {(rotina.exercicios || []).map((ex, idx) => (
                        <div key={idx} className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                          <div className="flex items-center justify-between gap-2">
                            <input type="text" value={ex.nome}
                              onChange={e => updateExercise(key, idx, 'nome', e.target.value)}
                              className="flex-1 bg-transparent text-white font-medium text-xs outline-none border-b border-neutral-800 pb-0.5 focus:border-emerald-500/50" />
                            <button onClick={() => deleteExercise(key, idx)} className="text-red-400/70 hover:text-red-400 p-1 shrink-0 icon-hover"><Trash size={14} /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="text-[8px] text-neutral-600 uppercase tracking-wider block mb-0.5">Base Top (kg)</label>
                              <input type="number" value={ex.base_top}
                                onChange={e => updateExercise(key, idx, 'base_top', Number(e.target.value))}
                                className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 [appearance:textfield]" />
                            </div>
                            <div>
                              <label className="text-[8px] text-neutral-600 uppercase tracking-wider block mb-0.5">Meta Reps</label>
                              <input type="text" value={ex.meta_reps}
                                onChange={e => updateExercise(key, idx, 'meta_reps', e.target.value)}
                                className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30" />
                            </div>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => addExercise(key)}
                        className="btn-secondary w-full py-2.5 text-xs">Adicionar Exercício</button>
                      <button onClick={() => deleteRoutine(key)}
                        className="btn-danger w-full py-2.5 text-xs">Excluir Divisão</button>
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => salvar(config)}
              disabled={saving}
              className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-2 mt-1">
              {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Treinos</>}
            </button>
          </>
        )
      ) : (
        <div className="flex flex-col gap-3">
          
          <div className="card-premium p-4 space-y-2">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Metas Diárias</span>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { key: 'kcal', label: 'Kcal', val: config.metas?.kcal ?? 1970 },
                { key: 'proteinas', label: 'P (g)', val: config.metas?.proteinas ?? 165 },
                { key: 'carboidratos', label: 'C (g)', val: config.metas?.carboidratos ?? 226 },
                { key: 'gorduras', label: 'G (g)', val: config.metas?.gorduras ?? 43 },
              ].map(c => (
                <div key={c.key}>
                  <label className="text-[8px] text-neutral-600 block mb-0.5">{c.label}</label>
                  <input type="number" value={c.val}
                    onChange={e => updateMeta(c.key, e.target.value)}
                    className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                </div>
              ))}
            </div>
            {(() => {
              const somaRefeicoes = (config.refeicoes || []).reduce((acc, r) => ({
                kcal: acc.kcal + (Number(r.kcal) || 0),
                proteinas: acc.proteinas + (Number(r.proteinas) || 0),
                carboidratos: acc.carboidratos + (Number(r.carboidratos) || 0),
                gorduras: acc.gorduras + (Number(r.gorduras) || 0),
              }), { kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 })
              return (
                <div className="text-xs text-white/30 flex gap-2 items-center pt-1">
                  <span className="shrink-0">Total refeições:</span>
                  <span>{somaRefeicoes.kcal} kcal</span>
                  <span>{somaRefeicoes.proteinas}g P</span>
                  <span>{somaRefeicoes.carboidratos}g C</span>
                  <span>{somaRefeicoes.gorduras}g G</span>
                </div>
              )
            })()}
            <button onClick={sincronizarMetas}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-cyan-500/30 text-cyan-400 text-xs hover:bg-cyan-500/10 active:scale-[0.97] transition-all">
              <RefreshCw size={12} /> Sincronizar com refeições
            </button>
          </div>

          <div className="card-premium p-4 space-y-2">
            <span className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wider">Refeições</span>
            {(config.refeicoes || []).length === 0 && (
              <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
                <p className="text-neutral-500 text-xs">Nenhuma refeição configurada.</p>
              </div>
            )}
            {(config.refeicoes || []).map((ref, i) => (
              <div key={ref.id || i} className="bg-black/30 rounded-xl p-3 space-y-1.5 border border-white/5">
                <div className="flex items-center justify-between gap-2">
                  <input type="text" value={ref.nome || ''}
                    onChange={e => updateRefeicao(i, 'nome', e.target.value)}
                    className="flex-1 bg-transparent text-white font-medium text-xs outline-none border-b border-neutral-800 pb-0.5 focus:border-cyan-500/50" />
                  <input type="text" value={ref.horario || ''}
                    onChange={e => updateRefeicao(i, 'horario', e.target.value)}
                    className="bg-transparent text-neutral-500 text-[10px] font-mono outline-none border-b border-neutral-800 pb-0.5 w-14 text-center focus:border-cyan-500/50" />
                  <button onClick={() => deleteRefeicao(i)} className="text-red-400/70 hover:text-red-400 p-1 shrink-0 icon-hover">
                    <Trash size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input type="text" value={textoAlimentos[i] ?? (ref.alimentos || []).join(', ')}
                    onChange={e => setTextoAlimentos(p => ({ ...p, [i]: e.target.value }))}
                    onBlur={e => updateRefeicao(i, 'alimentos', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    placeholder="Alimentos separados por vírgula"
                    className="flex-1 bg-neutral-800 text-white placeholder-neutral-600 text-[10px] p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30" />
                  <button onClick={() => calcularMacrosRefeicao(i)}
                    disabled={!textoAlimentos[i]?.trim() || aiLoadingIdx === i}
                    className="shrink-0 flex items-center gap-1 p-2 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-90"
                    title="Calcular macros com IA">
                    {aiLoadingIdx === i ? <Loader size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { key: 'kcal', label: 'Kcal', val: ref.kcal },
                    { key: 'proteinas', label: 'P', val: ref.proteinas },
                    { key: 'carboidratos', label: 'C', val: ref.carboidratos },
                    { key: 'gorduras', label: 'G', val: ref.gorduras },
                  ].map(c => (
                    <div key={c.key}>
                      <label className="text-[8px] text-neutral-600 block mb-0.5">{c.label}</label>
                      <input type="number" value={c.val}
                        onChange={e => updateRefeicao(i, c.key, e.target.value)}
                        className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={addRefeicao}
              className="btn-primary w-full py-3 flex items-center justify-center gap-1.5 mt-1">
              <Plus size={14} /> Nova Refeição
            </button>
          </div>

          <button onClick={() => salvar(config)}
            disabled={saving}
            className="btn-primary w-full text-lg py-5 flex items-center justify-center gap-2 mt-1">
            {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Tudo</>}
          </button>
        </div>
      )}

      <button onClick={() => signOut(auth)}
        className="btn-secondary w-full py-4 text-sm mt-2">Sair da conta</button>

      <div className="text-center text-neutral-600 text-[10px] font-mono mt-4">
        AkrGym v{import.meta.env.VITE_APP_VERSION || '3.1'} · {new Date().getFullYear()}
      </div>
    </div>
  )
}
