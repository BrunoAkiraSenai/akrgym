import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { db } from '../../firebase'
import { Plus, Trash, ChevronDown, ChevronRight, X, AlertTriangle, Loader } from 'lucide-react'

export default function Configuracao() {
  const [rotinas, setRotinas] = useState([])
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)
  const [saving, setSaving] = useState(null)

  const [showNewForm, setShowNewForm] = useState(false)
  const [newNome, setNewNome] = useState('')
  const [novoExercicio, setNovoExercicio] = useState({ nome: '', metas_series: '', metas_rep: '' })

  const carregarRotinas = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      if (!db) {
        setErro('Firestore não foi inicializado. Verifique as credenciais no firebase.js.')
        setLoading(false)
        return
      }

      const snapshot = await getDocs(collection(db, 'rotinas'))
      const lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
      setRotinas(lista)
    } catch (err) {
      setErro(`Erro ao carregar rotinas: ${err.message}`)
    }

    setLoading(false)
  }, [])

  useEffect(() => { carregarRotinas() }, [carregarRotinas])

  const criarRotina = async () => {
    if (!newNome.trim()) return
    setSaving('create')
    setErro(null)

    try {
      await addDoc(collection(db, 'rotinas'), { nome: newNome.trim(), exercicios: [] })
      setNewNome('')
      setShowNewForm(false)
      await carregarRotinas()
    } catch (err) {
      setErro(`Erro ao criar rotina: ${err.message}`)
    }

    setSaving(null)
  }

  const adicionarExercicio = async (rotinaId) => {
    const { nome, metas_series, metas_rep } = novoExercicio
    if (!nome.trim() || !metas_series || !metas_rep.trim()) return

    const rotina = rotinas.find(r => r.id === rotinaId)
    if (!rotina) return

    setSaving(rotinaId)
    setErro(null)

    try {
      const novos = [
        ...(rotina.exercicios || []),
        { nome: nome.trim(), metas_series: Number(metas_series), metas_rep: metas_rep.trim() },
      ]
      await updateDoc(doc(db, 'rotinas', rotinaId), { exercicios: novos })
      setNovoExercicio({ nome: '', metas_series: '', metas_rep: '' })
      await carregarRotinas()
    } catch (err) {
      setErro(`Erro ao adicionar exercício: ${err.message}`)
    }

    setSaving(null)
  }

  const removerExercicio = async (rotinaId, index) => {
    const rotina = rotinas.find(r => r.id === rotinaId)
    if (!rotina) return

    setErro(null)

    try {
      const novos = (rotina.exercicios || []).filter((_, i) => i !== index)
      await updateDoc(doc(db, 'rotinas', rotinaId), { exercicios: novos })
      await carregarRotinas()
    } catch (err) {
      setErro(`Erro ao remover exercício: ${err.message}`)
    }
  }

  const excluirRotina = async (rotinaId) => {
    setErro(null)

    try {
      await deleteDoc(doc(db, 'rotinas', rotinaId))
      if (expandedId === rotinaId) setExpandedId(null)
      await carregarRotinas()
    } catch (err) {
      setErro(`Erro ao excluir rotina: ${err.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Rotinas</h1>
        <button
          onClick={() => setShowNewForm(true)}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-semibold px-4 py-3 rounded-xl transition-colors"
        >
          <Plus size={20} />
          Nova Rotina
        </button>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {showNewForm && (
        <div className="bg-neutral-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-neutral-300">Nova Rotina</h2>
            <button onClick={() => setShowNewForm(false)} className="text-neutral-400 hover:text-white">
              <X size={20} />
            </button>
          </div>
          <input
            type="text"
            placeholder="Nome da rotina (ex: Upper B)"
            value={newNome}
            onChange={e => setNewNome(e.target.value)}
            className="w-full bg-neutral-700 text-white placeholder-neutral-400 p-4 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
          <button
            onClick={criarRotina}
            disabled={!newNome.trim() || saving === 'create'}
            className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors"
          >
            {saving === 'create' ? <><Loader size={18} className="animate-spin" /> Salvando...</> : 'Salvar'}
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 text-center py-8">Carregando...</p>
      ) : !rotinas || rotinas.length === 0 ? (
        <p className="text-neutral-500 text-center py-8">Nenhuma rotina criada ainda.</p>
      ) : (
        rotinas.map(rotina => (
          <div key={rotina.id} className="bg-neutral-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded(rotina.id) ? null : rotina.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-neutral-750 active:bg-neutral-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                {isExpanded(rotina.id) ? <ChevronDown size={20} className="text-emerald-400" /> : <ChevronRight size={20} className="text-neutral-400" />}
                <div>
                  <span className="text-white font-semibold text-base">{rotina.nome}</span>
                  <span className="text-neutral-400 text-sm block">{rotina.exercicios?.length || 0} exercícios</span>
                </div>
              </div>
            </button>

            {isExpanded(rotina.id) && (
              <div className="border-t border-neutral-700 px-4 pb-4 pt-3 space-y-3">
                {rotina.exercicios && rotina.exercicios.length > 0 ? (
                  rotina.exercicios.map((ex, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-neutral-700 rounded-xl p-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{ex.nome}</p>
                        <p className="text-neutral-400 text-sm">{ex.metas_series} séries x {ex.metas_rep} reps</p>
                      </div>
                      <button
                        onClick={() => removerExercicio(rotina.id, idx)}
                        className="text-red-400 hover:text-red-300 active:text-red-200 p-2 shrink-0"
                      >
                        <Trash size={18} />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-neutral-500 text-sm text-center py-2">Nenhum exercício ainda.</p>
                )}

                <div className="bg-neutral-750 rounded-xl p-3 space-y-2 border border-neutral-600">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Novo Exercício</p>
                  <input
                    type="text"
                    placeholder="Nome do exercício"
                    value={novoExercicio.nome}
                    onChange={e => setNovoExercicio(p => ({ ...p, nome: e.target.value }))}
                    className="w-full bg-neutral-700 text-white placeholder-neutral-400 p-3 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Séries"
                      value={novoExercicio.metas_series}
                      onChange={e => setNovoExercicio(p => ({ ...p, metas_series: e.target.value }))}
                      className="flex-1 bg-neutral-700 text-white placeholder-neutral-400 p-3 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <input
                      type="text"
                      placeholder="Reps (ex: 8-12)"
                      value={novoExercicio.metas_rep}
                      onChange={e => setNovoExercicio(p => ({ ...p, metas_rep: e.target.value }))}
                      className="flex-1 bg-neutral-700 text-white placeholder-neutral-400 p-3 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <button
                    onClick={() => adicionarExercicio(rotina.id)}
                    disabled={!novoExercicio.nome.trim() || !novoExercicio.metas_series || !novoExercicio.metas_rep.trim() || saving === rotina.id}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                  >
                    {saving === rotina.id ? <><Loader size={18} className="animate-spin" /> Adicionando...</> : <><Plus size={18} /> Adicionar Exercício</>}
                  </button>
                </div>

                <button
                  onClick={() => excluirRotina(rotina.id)}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 text-red-400 font-semibold py-3 rounded-xl transition-colors border border-red-500/20"
                >
                  <Trash size={18} />
                  Excluir Rotina
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )

  function isExpanded(id) {
    return expandedId === id
  }
}
