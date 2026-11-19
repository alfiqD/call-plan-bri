import { createPortal } from 'react-dom'
import { useId } from 'react'
import { X } from 'lucide-react'

function Modal({ title, description, onClose, children, wide = false, portal = false }) {
  const titleId = useId()

  const content = (
    <div
      className={`fixed inset-0 ${portal ? 'z-[70]' : 'z-[60]'} flex items-center justify-center bg-slate-900/50 p-2 sm:p-6 backdrop-blur-xs`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`max-h-[calc(100dvh-1rem)] w-full overscroll-contain overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:max-h-[90vh] ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0 pr-1">
            <h2 id={titleId} className="text-sm font-bold text-slate-900 sm:text-base truncate">{title}</h2>
            {description && <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs line-clamp-1">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Tutup"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-3.5 sm:p-5">{children}</div>
      </section>
    </div>
  )

  return portal ? createPortal(content, document.body) : content
}

export default Modal
