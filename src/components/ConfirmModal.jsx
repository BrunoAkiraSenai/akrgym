import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({ isOpen, onConfirm, onCancel, title, message }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div ref={modalRef} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 w-80 max-w-[90%] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-2">{title || 'Confirmar'}</h3>
        <p className="text-neutral-300 mb-6">{message || 'Tem certeza?'}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-full bg-neutral-800 text-white">Cancelar</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-white">Confirmar</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
