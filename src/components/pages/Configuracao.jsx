import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import { Save, Plus, AlertTriangle, Loader, ChevronDown, ChevronRight, X, Trash, LogOut, UserCircle } from 'lucide-react'

function gerarIdRefeicao() {
  return `refeicao_${Date.now()}`
}

const CONFIG_REF = (uid) => doc(db, 'users', uid, 'config', 'data')

export default function Configuracao({ user }) {
  const [config, setConfig] = useState({ treinos: {}, refeicoes: [], metas: {} })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [aba, setAba] = useState('treinos')
  const [expandedKey, setExpandedKey] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newNome, setNewNome] = useState('')
  const [textoAlimentos, setTextoAlimentos] = useState({})

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

  useEffect(() => { if (aba === 'dieta') { console.log('🔍 aba:', aba); console.log('🔍 refeicoes:', config.refeicoes); console.log('🔍 config:', config) } }, [aba, config])

  const salvar = async (novo) => {
    setSaving(true); setErro(null); setSucesso(null)
    try {
      await setDoc(CONFIG_REF(user.uid), novo)
      setConfig(novo)
      setSucesso('Salvo!')
      setTimeout(() => setSucesso(null), 2000)
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setSaving(false)
  }

  const addRoutine = () => {
    if (!newKey.trim() || !newNome.trim()) return
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[newKey.trim()] = { nome: newNome.trim(), exercicios: [] }
    setConfig(n)
    setNewKey(''); setNewNome(''); setShowNewRoutine(false)
    setExpandedKey(newKey.trim())
  }

  const deleteRoutine = (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    delete n.treinos[key]
    setConfig(n)
    if (expandedKey === key) setExpandedKey(null)
  }

  const addExercise = (key) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: [...(n.treinos[key].exercicios || []), { nome: 'Novo', base_top: 20, meta_reps: '8-10' }] }
    setConfig(n)
  }

  const updateExercise = (key, idx, campo, valor) => {
    const n = { ...config, treinos: { ...config.treinos } }
    const exs = [...(n.treinos[key].exercicios || [])]
    exs[idx] = { ...exs[idx], [campo]: valor }
    n.treinos[key] = { ...n.treinos[key], exercicios: exs }
    setConfig(n)
  }

  const deleteExercise = (key, idx) => {
    const n = { ...config, treinos: { ...config.treinos } }
    n.treinos[key] = { ...n.treinos[key], exercicios: n.treinos[key].exercicios.filter((_, i) => i !== idx) }
    setConfig(n)
  }

  const updateMeta = (campo, valor) => {
    const n = { ...config, metas: { ...(config.metas || {}), [campo]: valor } }
    setConfig(n)
  }

  const updateRefeicao = (idx, campo, valor) => {
    const n = { ...config, refeicoes: (config.refeicoes || []).map((r, i) => i === idx ? { ...r, [campo]: valor } : r) }
    setConfig(n)
  }

  const addRefeicao = () => {
    const n = { ...config, refeicoes: [...(config.refeicoes || []), { id: gerarIdRefeicao(), nome: 'Nova Refeição', horario: '00:00', alimentos: [], kcal: 0, proteinas: 0, carboidratos: 0, gorduras: 0 }] }
    setConfig(n)
  }

  const deleteRefeicao = (idx) => {
    const ref = (config.refeicoes || [])[idx]
    if (!ref) return
    if (!window.confirm(`Deseja excluir a refeição "${ref.nome}"? Os dados históricos não serão afetados.`)) return
    const n = { ...config, refeicoes: (config.refeicoes || []).filter((_, i) => i !== idx) }
    setConfig(n)
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <h1 className="text-xl font-bold tracking-tight text-white mb-1">Configurações</h1>

      <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 flex items-center gap-3">
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
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'treinos' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'}`}>Treinos</button>
        <button onClick={() => setAba('dieta')}
          className={`flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all ${aba === 'dieta' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.08)]' : 'text-neutral-500 hover:text-neutral-300'}`}>Dieta</button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}
      {sucesso && <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3 text-center text-emerald-400 text-xs font-semibold">{sucesso}</div>}

      {aba === 'treinos' ? (
        loading ? (
          <p className="text-neutral-600 text-center py-8 text-sm">Carregando...</p>
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
              <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-300">Nova Divisão</span>
                  <button onClick={() => setShowNewRoutine(false)} className="text-neutral-500 hover:text-white"><X size={16} /></button>
                </div>
                <input type="text" placeholder="ID (ex: upper_c)" value={newKey} onChange={e => setNewKey(e.target.value)}
                  className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/30" autoFocus />
                <input type="text" placeholder="Nome (ex: UPPER C)" value={newNome} onChange={e => setNewNome(e.target.value)}
                  className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500/30" />
                <div className="flex gap-2">
                  <button onClick={() => setShowNewRoutine(false)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-95">Cancelar</button>
                  <button onClick={addRoutine} disabled={!newKey.trim() || !newNome.trim()}
                    className="flex-1 bg-emerald-500/10 text-emerald-400 font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-95 disabled:opacity-30 border border-emerald-500/20">Criar</button>
                </div>
              </div>
            )}

            {Object.entries(config.treinos || {}).map(([key, rotina]) => {
              const isOpen = expandedKey === key
              return (
                <div key={key} className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden">
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
                            <button onClick={() => deleteExercise(key, idx)} className="text-red-400/70 hover:text-red-400 p-1 shrink-0 transition-all active:scale-90"><Trash size={14} /></button>
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
                        className="w-full flex items-center justify-center gap-1 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-[0.97] border border-white/5">
                        <Plus size={14} /> Adicionar Exercício
                      </button>
                      <button onClick={() => deleteRoutine(key)}
                        className="w-full flex items-center justify-center gap-1 bg-red-500/5 hover:bg-red-500/10 text-red-400/80 font-semibold py-2.5 rounded-xl text-xs transition-all active:scale-[0.97] border border-red-500/10">
                        <Trash size={14} /> Excluir Divisão
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
            <button onClick={() => salvar(config)}
              disabled={saving}
              className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-lg py-5 rounded-2xl transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2 mt-1">
              {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Treinos</>}
            </button>
          </>
        )
      ) : (
        <div className="flex flex-col gap-3">
          {console.log('🔍 DIETA RENDERIZOU — refeicoes:', config.refeicoes?.length)}
          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2">
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
                    onChange={e => updateMeta(c.key, Number(e.target.value))}
                    className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-2">
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
                  <button onClick={() => deleteRefeicao(i)} className="text-red-400/70 hover:text-red-400 p-1 shrink-0 transition-all active:scale-90">
                    <Trash size={14} />
                  </button>
                </div>
                <input type="text" value={textoAlimentos[i] ?? (ref.alimentos || []).join(', ')}
                  onChange={e => setTextoAlimentos(p => ({ ...p, [i]: e.target.value }))}
                  onBlur={e => updateRefeicao(i, 'alimentos', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  placeholder="Alimentos separados por vírgula"
                  className="w-full bg-neutral-800 text-white placeholder-neutral-600 text-[10px] p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30" />
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
                        onChange={e => updateRefeicao(i, c.key, Number(e.target.value))}
                        className="w-full bg-neutral-800 text-white text-xs text-center p-2 rounded-xl outline-none focus:ring-2 focus:ring-cyan-400/30 [appearance:textfield]" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={addRefeicao}
              className="w-full flex items-center justify-center gap-1.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold py-3 rounded-xl text-xs transition-all active:scale-[0.97] hover:opacity-90 shadow-[0_0_12px_rgba(52,211,153,0.1)] mt-1">
              <Plus size={14} /> Nova Refeição
            </button>
          </div>

          <button onClick={() => salvar(config)}
            disabled={saving}
            className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-lg py-5 rounded-2xl transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2 mt-1">
            {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</> : <><Save size={20} /> Salvar Tudo</>}
          </button>
        </div>
      )}

      <button onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-semibold py-4 rounded-xl text-sm transition-all active:scale-[0.97] mt-2 border border-white/5">
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
  )
}
