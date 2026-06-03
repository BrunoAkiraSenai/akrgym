import { useEffect } from 'react'

export default function ConfirmModal({ aberto, titulo, mensagem, onConfirm, onCancel }) {
  useEffect(() => {
    if (!aberto) return
    const timer = setTimeout(() => {
      const el = document.querySelector('.modal-container')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 50)
    return () => clearTimeout(timer)
  }, [aberto])

  if (!aberto) return null
  return (
    <div className="modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onCancel}>
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-5 max-w-sm w-full mx-4 shadow-xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-white font-bold text-sm mb-1">{titulo}</h3>
        <p className="text-neutral-400 text-xs mb-4">{mensagem}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1 py-2.5 text-xs">Cancelar</button>
          <button onClick={onConfirm} className="btn-primary flex-1 py-2.5 text-xs">Confirmar</button>
        </div>
      </div>
    </div>
  )
}
