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
      description="Tandai tugas follow-up ini sebagai selesai dan catat hasil pertemuan/komunikasi."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
            {error}
          </p>
        )}

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
          <p className="font-semibold text-slate-800">{customer?.name || followUp.customerName || 'Nasabah'}</p>
          <p className="mt-1 text-slate-500">
            {followUp.type} · Tanggal: {followUp.date} {followUp.time}
          </p>
          <p className="mt-2 text-slate-700 italic border-l-2 border-indigo-400 pl-2">
            "{followUp.notes}"
          </p>
        </div>

        <label className="form-label">
          Catatan Hasil Tindak Lanjut
          <textarea
            value={resultNotes}
            onChange={(e) => setResultNotes(e.target.value)}
            rows={3}
            placeholder="Contoh: Nasabah sepakat mengajukan pinjaman, berkas akan diserahkan besok siang..."
            className="form-control resize-y"
          />
        </label>

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="button-secondary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="button-primary inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={15} className="animate-spin" /> Menyimpan...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Selesaikan Sekarang
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default CompleteFollowUpModal
