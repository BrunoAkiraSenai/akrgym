import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined
    window.scrollTo({ top: 0, behavior: 'smooth' })
    const timer = setTimeout(() => {
      if (modalRef.current) {
        modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [isOpen])

  if (!isOpen) return null

  const modalContent = (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="presentation">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-80 max-w-[90%] shadow-xl" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" onClick={(e) => e.stopPropagation()}>
        <h3 id="confirm-modal-title" className="text-lg font-bold text-white mb-2">{title || 'Confirmar'}</h3>
        <p className="text-neutral-300 mb-6">{message || 'Tem certeza?'}</p>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="px-4 py-2 rounded-full bg-neutral-800 text-white">Cancelar</button>
          <button type="button" onClick={onConfirm} className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">Confirmar</button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default ConfirmModal
