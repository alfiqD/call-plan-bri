import { useState } from 'react'
import { Link2, LoaderCircle } from 'lucide-react'
import Modal from './Modal'
import { FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES } from '../services/followUp'
import { localDateKey } from '../data/workspace'

function FollowUpFormModal({
  customers = [],
  followUp = null,
  preselectedCustomer = null,
  appointment = null,
  onClose,
  onSubmit,
}) {
  const isEditing = Boolean(followUp?.id)
  const defaultDate = followUp?.date || localDateKey()
  const defaultTime = followUp?.time || '09:00'
  const defaultCustomerId = followUp?.customerId || preselectedCustomer?.id || appointment?.customerId || ''

  const [form, setForm] = useState({
    customerId: defaultCustomerId,
    appointmentId: followUp?.appointmentId || appointment?.id || null,
    date: defaultDate,
    time: defaultTime,
    type: followUp?.type || 'Telepon',
    priority: followUp?.priority || 'Normal',
    notes: followUp?.notes || '',
    status: followUp?.status || 'Belum Dilakukan',
    resultNotes: followUp?.resultNotes || '',
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const selectedCustomer = preselectedCustomer
    || customers.find((c) => String(c.id) === String(form.customerId))

  const update = (e) => {
    const { name, value } = e.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!form.customerId) {
      setError('Pilih nasabah tujuan follow-up.')
      return
    }
    if (!form.date) {
      setError('Tanggal follow-up wajib ditentukan.')
      return
    }
    if (!form.notes.trim()) {
      setError('Catatan agenda tindak lanjut wajib diisi.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        ...(followUp || {}),
        ...form,
        notes: form.notes.trim(),
        resultNotes: form.resultNotes.trim(),
        completedAt: form.status === 'Selesai' ? (followUp?.completedAt || new Date().toISOString()) : null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan follow-up.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edit Agenda Follow-up' : 'Jadwalkan Follow-up'}
      description="Atur tanggal, waktu, dan rincian tindak lanjut nasabah."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
            {error}
          </p>
        )}

        {/* Linked Visit Indicator */}
        {(form.appointmentId || appointment) && (
          <div className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
            <Link2 className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-semibold">Terhubung dengan Kunjungan Lapangan</p>
              <p className="mt-0.5 text-[11px] text-blue-800">
                Tindak lanjut ini merupakan kelanjutan dari kunjungan ({appointment?.date || 'Jadwal'} · {appointment?.purpose || 'Kunjungan'}).
              </p>
            </div>
          </div>
        )}

        {/* Customer Selector */}
        {preselectedCustomer ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Target Nasabah</p>
            <p className="text-sm font-bold text-slate-900">{selectedCustomer.name}</p>
            {selectedCustomer.picName && <p className="text-xs text-slate-600">PIC: {selectedCustomer.picName}</p>}
            <p className="text-xs text-slate-500">{selectedCustomer.phone} · {selectedCustomer.address}</p>
          </div>
        ) : (
          <label className="form-label">
            Pilih Nasabah <span className="text-rose-500">*</span>
            <select
              name="customerId"
              value={form.customerId}
              onChange={update}
              required
              disabled={isEditing}
              className="form-control"
            >
              <option value="">Pilih nasabah</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.picName ? ` · PIC: ${c.picName}` : ''} — {c.phone}
                </option>
              ))}
            </select>
          </label>
        )}

        {/* Date & Time */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="form-label">
            Tanggal Follow-up <span className="text-rose-500">*</span>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={update}
              required
              className="form-control"
            />
          </label>
          <label className="form-label">
            Waktu Pengingat
            <input
              type="time"
              name="time"
              value={form.time}
              onChange={update}
              className="form-control"
            />
          </label>
        </div>

        {/* Action Type */}
        <label className="form-label">
          Jenis Tindak Lanjut <span className="text-rose-500">*</span>
          <select
            name="type"
            value={form.type}
            onChange={update}
            className="form-control"
          >
            {FOLLOW_UP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        {/* Priority */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-700">Tingkat Prioritas</legend>
          <div className="grid grid-cols-3 gap-2">
            {FOLLOW_UP_PRIORITIES.map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => setForm((c) => ({ ...c, priority: p }))}
                className={`rounded-lg border py-2 text-xs font-semibold transition ${
                  form.priority === p
                    ? p === 'Tinggi'
                      ? 'border-rose-400 bg-rose-50 text-rose-700 ring-1 ring-rose-300'
                      : p === 'Normal'
                        ? 'border-[#00529b] bg-[#eaf3fb] text-[#00529b] ring-1 ring-blue-200'
                        : 'border-slate-400 bg-slate-100 text-slate-800 ring-1 ring-slate-300'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Notes */}
        <label className="form-label">
          Catatan Tindak Lanjut <span className="text-rose-500">*</span>
          <textarea
            name="notes"
            value={form.notes}
            onChange={update}
            rows={3}
            placeholder="Rincian agenda atau instruksi tindak lanjut nasabah..."
            required
            className="form-control resize-y"
          />
        </label>

        {/* Status for Editing */}
        {isEditing && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <label className="form-label">
              Status Tindak Lanjut
              <select
                name="status"
                value={form.status}
                onChange={update}
                className="form-control"
              >
                <option value="Belum Dilakukan">Belum Dilakukan</option>
                <option value="Selesai">Selesai</option>
                <option value="Dibatalkan">Dibatalkan</option>
              </select>
            </label>

            {form.status === 'Selesai' && (
              <label className="form-label">
                Catatan Hasil Penyelesaian
                <textarea
                  name="resultNotes"
                  value={form.resultNotes}
                  onChange={update}
                  rows={2}
                  placeholder="Catatan hasil tindak lanjut..."
                  className="form-control resize-y bg-white"
                />
              </label>
            )}
          </div>
        )}

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
            className="button-orange !min-h-[44px] w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle size={15} className="animate-spin" /> Menyimpan...
              </>
            ) : isEditing ? (
              'Simpan Perubahan'
            ) : (
              'Buat Follow-up'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default FollowUpFormModal
