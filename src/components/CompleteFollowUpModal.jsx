import { useState } from 'react'
import { CheckCircle2, LoaderCircle } from 'lucide-react'
import Modal from './Modal'

function CompleteFollowUpModal({ followUp, customer, onClose, onSubmit }) {
  const [resultNotes, setResultNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)
    try {
      await onSubmit(followUp.id, resultNotes.trim())
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyelesaikan follow-up.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Selesaikan Tindak Lanjut"
      description="Konfirmasi penyelesaian tindak lanjut nasabah."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs">
          <p className="font-bold text-slate-900">{customer?.name || followUp.customerName || 'Nasabah'}</p>
          <p className="mt-0.5 text-slate-500">
            {followUp.type} · {followUp.date} {followUp.time}
          </p>
          {followUp.notes && (
            <p className="mt-2 text-slate-700 italic border-l-2 border-[#00529b] pl-2.5">
              "{followUp.notes}"
            </p>
          )}
        </div>

        <label className="form-label">
          Catatan Hasil Tindak Lanjut
          <textarea
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            rows={3}
            placeholder="Catatan hasil komunikasi atau kesepakatan dengan nasabah..."
            className="form-control resize-y"
          />
        </label>

        <div className="sticky bottom-0 -mx-3.5 -mb-3.5 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 bg-white px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="button-secondary !min-h-[44px] w-full sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-orange !min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={15} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Selesaikan Follow-up
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CompleteFollowUpModal
