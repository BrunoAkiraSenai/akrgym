import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { auth, db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import { Save, Plus, AlertTriangle, Loader, ChevronDown, ChevronRight, X, Trash, LogOut } from 'lucide-react'

export default function Configuracao({ user }) {
  const OVERRIDES_DOC = doc(db, 'users', user.uid, 'config', 'overrides')
  const [overrides, setOverrides] = useState({})
  const [expandedKey, setExpandedKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)
  const [showNewRoutine, setShowNewRoutine] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newNome, setNewNome] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true); setErro(null)
    try {
      if (!db) { setErro('Firestore não inicializado.'); setLoading(false); return }
      const snap = await getDoc(OVERRIDES_DOC)
      setOverrides(snap.exists() ? snap.data() : {})
    } catch (err) { setErro(`Erro: ${err.message}`) }
    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const getBaseTop = (k, nome) => overrides[k]?.exercicios?.find(e => e.nome === nome)?.base_top
  const getMetaReps = (k, nome) => overrides[k]?.exercicios?.find(e => e.nome === nome)?.meta_reps

  const setValor = (k, nome, campo, valor) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[k]) next[k] = { exercicios: [] }
      const lista = [...next[k].exercicios]
      const idx = lista.findIndex(e => e.nome === nome)
      if (idx >= 0) lista[idx] = { ...lista[idx], [campo]: valor }
      else lista.push({ nome, [campo]: valor })
      next[k] = { ...next[k], exercicios: lista.filter(e => e.nome) }
      return next
    })
  }

  const adicionarExercicio = (k) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[k]) next[k] = { exercicios: [] }
      next[k] = { ...next[k], exercicios: [...next[k].exercicios, { nome: 'Novo Exercício', base_top: 20, meta_reps: '8-10' }] }
      return next
    })
  }

  const removerExercicio = (k, index) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[k]) return prev
      next[k] = { ...next[k], exercicios: next[k].exercicios.filter((_, i) => i !== index) }
      return next
    })
  }

  const excluirRotina = (k) => {
    setOverrides(prev => { const n = { ...prev }; delete n[k]; return n })
    if (expandedKey === k) setExpandedKey(null)
  }

  const criarRotina = () => {
    if (!newKey.trim() || !newNome.trim()) return
    setOverrides(prev => ({
      ...prev,
      [newKey.trim()]: { nome: newNome.trim(), exercicios: [{ nome: 'Novo Exercício', base_top: 20, meta_reps: '8-10' }] },
    }))
    setNewKey(''); setNewNome(''); setShowNewRoutine(false); setExpandedKey(newKey.trim())
  }

  const salvar = async () => {
    setSaving(true); setErro(null); setSucesso(null)
    try {
      await setDoc(OVERRIDES_DOC, overrides)
      setSucesso('Salvo!')
      setTimeout(() => setSucesso(null), 2000)
    } catch (err) { setErro(`Erro ao salvar: ${err.message}`) }
    setSaving(false)
  }

  const merged = {}
  for (const [key, rotina] of Object.entries(PROTOCOLO_BASE)) {
    merged[key] = {
      ...rotina,
      exercicios: rotina.exercicios.map(ex => ({
        ...ex,
        base_top: getBaseTop(key, ex.nome) ?? ex.base_top,
        meta_reps: getMetaReps(key, ex.nome) ?? ex.meta_reps,
      })),
    }
  }
  for (const [key, rotina] of Object.entries(overrides)) {
    if (!PROTOCOLO_BASE[key] && rotina?.nome) {
      merged[key] = {
        nome: rotina.nome,
        exercicios: (rotina.exercicios || []).map(ex => ({
          ...ex,
          base_top: ex.base_top ?? 20,
          meta_reps: ex.meta_reps ?? '8-10',
        })),
      }
    }
  }

  return (
    <div className="flex flex-col gap-3 pt-2 pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold tracking-tight text-white">Protocolo de Treino</h1>
        <button
          onClick={() => setShowNewRoutine(true)}
          className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all active:scale-90 hover:bg-emerald-500/20 border border-emerald-500/20"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      {erro && <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-3 text-red-400 text-xs">{erro}</div>}
      {sucesso && <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3 text-center text-emerald-400 text-xs font-semibold">{sucesso}</div>}

      {showNewRoutine && (
        <div className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-300">Nova Rotina</span>
            <button onClick={() => setShowNewRoutine(false)} className="text-neutral-500 hover:text-white transition-all active:scale-90"><X size={18} /></button>
          </div>
          <input type="text" placeholder="ID (ex: upper_c)" value={newKey} onChange={e => setNewKey(e.target.value)}
            className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" autoFocus />
          <input type="text" placeholder="Nome (ex: UPPER C)" value={newNome} onChange={e => setNewNome(e.target.value)}
            className="w-full bg-neutral-800 text-white placeholder-neutral-600 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
          <div className="flex gap-2">
            <button onClick={() => setShowNewRoutine(false)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-xl text-sm transition-all active:scale-95">Cancelar</button>
            <button onClick={criarRotina} disabled={!newKey.trim() || !newNome.trim()}
              className="flex-1 bg-emerald-500/10 text-emerald-400 font-semibold py-3 rounded-xl text-sm transition-all active:scale-95 hover:bg-emerald-500/20 disabled:opacity-30 disabled:cursor-not-allowed border border-emerald-500/20">Criar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-600 text-center py-8 text-sm">Carregando...</p>
      ) : (
        Object.entries(merged).map(([key, rotina]) => {
          const isOpen = expandedKey === key
          const isCustom = !PROTOCOLO_BASE[key]

          return (
            <div key={key} className="bg-neutral-900/50 backdrop-blur-md border border-white/5 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setExpandedKey(isOpen ? null : key)}
                className="w-full flex items-center justify-between p-4 transition-all active:scale-[0.99] text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown size={16} className="text-emerald-400" /> : <ChevronRight size={16} className="text-neutral-500" />}
                  <div>
                    <span className="text-white font-semibold text-sm tracking-tight">{rotina.nome}</span>
                    {isCustom && <span className="text-[10px] text-emerald-400 ml-2 font-mono">(custom)</span>}
                  </div>
                </div>
                <span className="text-neutral-500 text-xs font-mono">{rotina.exercicios.length}</span>
              </button>

              {isOpen && (
                <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-2">
                  {rotina.exercicios.map((ex, idx) => (
                    <div key={idx} className="bg-black/30 rounded-xl p-3 space-y-2 border border-white/5">
                      <div className="flex items-center justify-between gap-2">
                        <input type="text" value={overrides[key]?.exercicios?.[idx]?.nome ?? ex.nome}
                          onChange={e => setValor(key, ex.nome, 'nome', e.target.value)}
                          className="flex-1 bg-transparent text-white font-medium text-sm outline-none border-b border-neutral-800 pb-0.5 focus:border-emerald-500/50 transition-all" />
                        {(isCustom || overrides[key]?.exercicios?.find(e => e.nome === ex.nome)) && (
                          <button onClick={() => removerExercicio(key, idx)} className="text-red-400/70 hover:text-red-400 p-1 shrink-0 transition-all active:scale-90"><Trash size={14} /></button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-1">Base Top (kg)</label>
                          <input type="number"
                            value={overrides[key]?.exercicios?.find(e => e.nome === ex.nome)?.base_top ?? ex.base_top}
                            onChange={e => setValor(key, ex.nome, 'base_top', Number(e.target.value))}
                            className="w-full bg-neutral-800 text-white text-sm text-center p-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none" />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-600 uppercase tracking-wider block mb-1">Meta Reps</label>
                          <input type="text"
                            value={overrides[key]?.exercicios?.find(e => e.nome === ex.nome)?.meta_reps ?? ex.meta_reps}
                            onChange={e => setValor(key, ex.nome, 'meta_reps', e.target.value)}
                            className="w-full bg-neutral-800 text-white text-sm text-center p-3 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={() => adicionarExercicio(key)}
                    className="w-full flex items-center justify-center gap-1.5 bg-neutral-800/50 hover:bg-neutral-800 text-neutral-400 font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.97] border border-white/5">
                    <Plus size={15} /> Adicionar Exercício
                  </button>

                  {isCustom && (
                    <button onClick={() => excluirRotina(key)}
                      className="w-full flex items-center justify-center gap-1.5 bg-red-500/5 hover:bg-red-500/10 text-red-400/80 font-semibold py-3 rounded-xl text-sm transition-all active:scale-[0.97] border border-red-500/10">
                      <Trash size={15} /> Excluir Rotina
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}

      {!loading && Object.keys(merged).length > 0 && (
        <button onClick={salvar} disabled={saving}
          className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-bold text-lg py-5 rounded-2xl transition-all active:scale-[0.97] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(52,211,153,0.15)] flex items-center justify-center gap-2 mt-1">
          {saving ? <><Loader size={20} className="animate-spin" /> Salvando...</>
          : <><Save size={20} /> Salvar Alterações</>}
        </button>
      )}

      <button onClick={() => signOut(auth)}
        className="w-full flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 font-semibold py-4 rounded-xl text-sm transition-all active:scale-[0.97] mt-2 border border-white/5">
        <LogOut size={16} /> Sair da conta
      </button>
    </div>
  )
}
