import { useEffect, useRef, useId } from 'react'
import { createPortal } from 'react-dom'

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message }) => {
  const modalRef = useRef(null)
  const titleId = useId()
  const cancelRef = useRef(onCancel)
  useEffect(() => { cancelRef.current = onCancel }, [onCancel])

  useEffect(() => {
    if (!isOpen) return undefined
    const previous = document.activeElement
    modalRef.current?.querySelector('button')?.focus({ preventScroll: true })
    const onKey = event => {
      if (event.key === 'Escape') { event.preventDefault(); cancelRef.current?.(); return }
      if (event.key !== 'Tab') return
      const buttons = [...modalRef.current.querySelectorAll('button:not(:disabled)')]
      const first = buttons[0], last = buttons.at(-1)
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [isOpen])

  if (!isOpen) return null

  const modalContent = (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" role="presentation">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-80 max-w-[90%] max-h-[90dvh] overflow-y-auto shadow-xl" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(e) => e.stopPropagation()}>
        <h3 id={titleId} className="text-lg font-bold text-white mb-2">{title || 'Confirmar'}</h3>
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
