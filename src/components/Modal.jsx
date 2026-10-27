import { useId } from 'react'
import { X } from 'lucide-react'

function Modal({ title, description, onClose, children, wide = false }) {
  const titleId = useId()

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px] sm:p-6" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${wide ? 'max-w-2xl' : 'max-w-lg'}`} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div>
          <h2 id={titleId} className="text-base font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </section>
    </div>
  )
}

export default Modal
