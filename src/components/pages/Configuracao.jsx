import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import PROTOCOLO_BASE from '../../config/protocolo'
import { Save, AlertTriangle, Loader, ChevronDown, ChevronRight } from 'lucide-react'

const OVERRIDES_DOC = doc(db, 'config', 'overrides')

export default function Configuracao() {
  const [overrides, setOverrides] = useState({})
  const [expandedKey, setExpandedKey] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState(null)
  const [sucesso, setSucesso] = useState(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)

    try {
      if (!db) {
        setErro('Firestore não foi inicializado. Verifique as credenciais no firebase.js.')
        setLoading(false)
        return
      }

      const snap = await getDoc(OVERRIDES_DOC)
      setOverrides(snap.exists() ? snap.data() : {})
    } catch (err) {
      setErro(`Erro ao carregar configurações: ${err.message}`)
    }

    setLoading(false)
  }, [])

  useEffect(() => { carregar() }, [carregar])

  const getBaseTop = (rotinaKey, nome) => {
    return overrides[rotinaKey]?.exercicios?.find(e => e.nome === nome)?.base_top
  }

  const getMetaReps = (rotinaKey, nome) => {
    return overrides[rotinaKey]?.exercicios?.find(e => e.nome === nome)?.meta_reps
  }

  const setValor = (rotinaKey, nome, campo, valor) => {
    setOverrides(prev => {
      const next = { ...prev }
      if (!next[rotinaKey]) next[rotinaKey] = { exercicios: [] }
      const lista = [...next[rotinaKey].exercicios]
      const idx = lista.findIndex(e => e.nome === nome)
      if (idx >= 0) {
        lista[idx] = { ...lista[idx], [campo]: valor }
      } else {
        lista.push({ nome, [campo]: valor })
      }
      next[rotinaKey] = { ...next[rotinaKey], exercicios: lista.filter(e => e.nome) }
      return next
    })
  }

  const salvar = async () => {
    setSaving(true)
    setErro(null)
    setSucesso(null)

    try {
      await setDoc(OVERRIDES_DOC, overrides)
      setSucesso('Alterações salvas com sucesso!')
      setTimeout(() => setSucesso(null), 2500)
    } catch (err) {
      setErro(`Erro ao salvar: ${err.message}`)
    }

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

  return (
    <div className="flex flex-col gap-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">Ajuste de Cargas</h1>
      </div>

      {erro && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-start gap-2">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm">{erro}</p>
        </div>
      )}

      {sucesso && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
          <p className="text-emerald-400 text-sm font-semibold">{sucesso}</p>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 text-center py-8">Carregando...</p>
      ) : (
        Object.entries(merged).map(([key, rotina]) => {
          const isOpen = expandedKey === key

          return (
            <div key={key} className="bg-neutral-800 rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedKey(isOpen ? null : key)}
                className="w-full flex items-center justify-between p-4 hover:bg-neutral-750 active:bg-neutral-700 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronDown size={20} className="text-emerald-400" /> : <ChevronRight size={20} className="text-neutral-400" />}
                  <span className="text-white font-semibold text-base">{rotina.nome}</span>
                </div>
                <span className="text-neutral-400 text-sm">{rotina.exercicios.length} ex.</span>
              </button>

              {isOpen && (
                <div className="border-t border-neutral-700 px-4 pb-4 pt-3 space-y-3">
                  {rotina.exercicios.map((ex, idx) => (
                    <div key={ex.nome} className="bg-neutral-700 rounded-xl p-3 space-y-2">
                      <p className="text-white font-medium text-sm">{ex.nome}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase tracking-wide block mb-0.5">Base Top (kg)</label>
                          <input
                            type="number"
                            value={overrides[key]?.exercicios?.find(e => e.nome === ex.nome)?.base_top ?? ex.base_top}
                            onChange={e => setValor(key, ex.nome, 'base_top', Number(e.target.value))}
                            className="w-full bg-neutral-600 text-white p-3 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-neutral-400 uppercase tracking-wide block mb-0.5">Meta Reps</label>
                          <input
                            type="text"
                            value={overrides[key]?.exercicios?.find(e => e.nome === ex.nome)?.meta_reps ?? ex.meta_reps}
                            onChange={e => setValor(key, ex.nome, 'meta_reps', e.target.value)}
                            className="w-full bg-neutral-600 text-white p-3 rounded-xl text-base text-center outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {!loading && Object.keys(PROTOCOLO_BASE).length > 0 && (
        <button
          onClick={salvar}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg py-5 rounded-xl transition-colors mt-2"
        >
          {saving ? (
            <><Loader size={22} className="animate-spin" /> Salvando...</>
          ) : (
            <><Save size={22} /> Salvar Alterações</>
          )}
        </button>
      )}
    </div>
  )
}
