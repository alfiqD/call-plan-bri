import { useState } from 'react'
import { createId } from '../data/workspace'
import Modal from './Modal'

const initialValue = {
  customerId: '',
  date: new Date().toLocaleDateString('en-CA'),
  time: '09:00',
  purpose: 'Penagihan',
  priority: 'Normal',
}

function AppointmentForm({ customers, appointment, date, onClose, onSubmit }) {
  const [form, setForm] = useState(appointment || { ...initialValue, date: date || initialValue.date })
  const [error, setError] = useState('')

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!customers.length) {
      setError('Tambahkan data nasabah terlebih dahulu sebelum membuat jadwal.')
      return
    }
    try {
      await onSubmit({
        ...form,
        id: appointment?.id || createId('jadwal'),
        status: appointment?.status || 'Terjadwal',
        notes: appointment?.notes || '',
        evidence: appointment?.evidence || '',
      })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Jadwal gagal disimpan.')
    }
  }

  return (
    <Modal title={appointment ? 'Ubah jadwal kunjungan' : 'Buat jadwal kunjungan'} description="Rencanakan agenda dan lokasi pertemuan nasabah." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700" role="alert">{error}</p>}
        <label className="form-label">Nasabah
          <select name="customerId" value={form.customerId} onChange={update} required className="form-control">
            <option value="">Pilih nasabah</option>
            {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.address}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="form-label">Tanggal kunjungan
            <input type="date" name="date" value={form.date} onChange={update} required className="form-control" />
          </label>
          <label className="form-label">Jam
            <input type="time" name="time" value={form.time} onChange={update} required className="form-control" />
          </label>
        </div>
        <label className="form-label">Tujuan kunjungan
          <select name="purpose" value={form.purpose} onChange={update} className="form-control">
            <option>Penagihan</option>
            <option>Penawaran Top-Up</option>
            <option>Survei Jaminan</option>
            <option>Kunjungan Prospek</option>
            <option>Follow-up</option>
            <option>Lainnya</option>
          </select>
        </label>
        <label className="form-label">Prioritas rute
          <select name="priority" value={form.priority} onChange={update} className="form-control">
            <option>Normal</option>
            <option>Tinggi</option>
          </select>
        </label>
        <p className="rounded-lg border border-blue-100 bg-blue-50/70 px-3 py-2 text-[11px] leading-5 text-[#00529b]">Jadwal dan lokasi hanya untuk perencanaan kunjungan, tidak mencatat target uang atau nominal kredit.</p>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="button-secondary">Batal</button>
          <button type="submit" className="button-orange">{appointment ? 'Simpan perubahan' : 'Simpan jadwal'}</button>
        </div>
      </form>
    </Modal>
  )
}

export default AppointmentForm
