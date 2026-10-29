import { useState, useMemo } from 'react'
import { Camera, UploadCloud } from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { submitVisitResult, validateAppointmentApiReady } from '../services/jadwalKunjungan'
import { useAuth } from '../context/useAuth'

const outcomes = ['Selesai', 'Tidak ditemui', 'Reschedule']
const CHECK_IN_RADIUS_METERS = 100

function VisitUpdateModal({ appointment, customer, onClose, onSubmit, onScheduleFollowUp }) {
  const { user, profile, role } = useAuth()
  const currentUser = useMemo(() => ({
    id: user?.id || null,
    email: user?.email || null,
    nama: profile?.nama || user?.email?.split('@')[0] || 'RM',
    role: role || 'rm',
  }), [user?.id, user?.email, profile?.nama, role])
  const hasCustomerCoordinates = customer?.latitude !== '' && customer?.latitude != null
    && customer?.longitude !== '' && customer?.longitude != null
    && Number.isFinite(Number(customer.latitude)) && Number.isFinite(Number(customer.longitude))
  const [status, setStatus] = useState(appointment.status === 'Reschedule' ? 'Reschedule' : 'Selesai')
  const [notes, setNotes] = useState(appointment.notes || '')
  const [newDate, setNewDate] = useState(appointment.date)
  const [newTime, setNewTime] = useState(appointment.time)
  const [evidence, setEvidence] = useState(appointment.evidence || '')
  const [evidenceName, setEvidenceName] = useState('')
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [gpsAccuracy, setGpsAccuracy] = useState(null)
  const [createFollowUp, setCreateFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [followUpType, setFollowUpType] = useState('Melengkapi Dokumen')
  const [followUpNotes, setFollowUpNotes] = useState('')

  const readImage = (file) => {
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Pilih file gambar dengan format yang didukung.')
      return
    }
    if (file.size > 1024 * 1024) {
      setError('Ukuran foto maksimal 1 MB agar penyimpanan browser tetap aman.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        setError('Foto tidak dapat dibaca. Silakan pilih file lain.')
        return
      }
      setEvidence(reader.result)
      setEvidenceName(file.name)
    }
    reader.onerror = () => setError('Foto gagal dibaca. Periksa file lalu coba kembali.')
    reader.readAsDataURL(file)
  }

  const getCurrentLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser ini tidak mendukung GPS. Coba gunakan browser lain atau perangkat seluler.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
      }),
      (locationError) => {
        const messages = {
          1: 'Izin lokasi ditolak. Izinkan akses lokasi pada pengaturan browser lalu coba kembali.',
          2: 'Lokasi perangkat tidak tersedia. Periksa GPS atau layanan lokasi perangkat.',
          3: 'Permintaan lokasi melewati batas waktu. Coba kembali di area dengan sinyal GPS lebih baik.',
        }
        reject(new Error(messages[locationError.code] || 'Lokasi perangkat gagal dibaca.'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (!notes.trim()) {
      setError('Catatan hasil pertemuan wajib diisi.')
      return
    }
    if (status === 'Reschedule' && !newDate) {
      setError('Tanggal jadwal ulang wajib diisi.')
      return
    }

    setIsSaving(true)
    try {
      validateAppointmentApiReady(appointment)

      let coordinates
      if (status === 'Selesai') {
        if (!hasCustomerCoordinates) {
          throw new Error('Koordinat nasabah belum tersedia. Ubah data nasabah dan pilih titik lokasinya pada peta sebelum check-in.')
        }
        const location = await getCurrentLocation()
        if (location.accuracy > CHECK_IN_RADIUS_METERS) {
          throw new Error(`Akurasi GPS saat ini sekitar ${Math.round(location.accuracy)} meter. Untuk validasi radius ${CHECK_IN_RADIUS_METERS} meter, coba lagi di area terbuka.`)
        }
        coordinates = {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy,
        }
        setGpsAccuracy(location.accuracy)
      }

      const savedAppointment = await submitVisitResult(
        appointment,
        {
          status,
          notes: notes.trim(),
          newDate,
          newTime,
          coordinates,
        },
        currentUser
      )

      await onSubmit({
        ...savedAppointment,
        evidence,
      })

      if (createFollowUp && onScheduleFollowUp) {
        await onScheduleFollowUp({
          customerId: customer?.id || appointment.customerId,
          appointmentId: appointment.id,
          date: followUpDate,
          time: '09:00',
          type: followUpType,
          notes: followUpNotes.trim() || `Tindak lanjut kunjungan: ${notes.trim()}`,
          priority: 'Normal',
          status: 'Belum Dilakukan',
        })
      }
    } catch (submitError) {
      console.error('Gagal menyimpan hasil kunjungan.', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Gagal menyimpan hasil kunjungan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal title="Update hasil kunjungan" description="Catat hasil pertemuan, status, dan bukti kunjungan." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-slate-800">{customer?.name || 'Nasabah'}</p>
              <p className="mt-1 text-[11px] text-slate-500">{appointment.time} · {appointment.purpose}</p>
            </div>
            <StatusBadge status={appointment.status} />
          </div>
        </div>
        {status === 'Selesai' && (
          <div className="rounded-xl border border-blue-100 bg-blue-50/70 px-3.5 py-3 text-[11px] leading-5 text-[#00529b]">
            {hasCustomerCoordinates
              ? 'Saat disimpan, browser akan meminta izin GPS. Koordinat divalidasi langsung dengan radius maksimal 100 meter dari lokasi nasabah.'
              : 'Check-in radius 100 meter belum tersedia karena titik nasabah belum dipilih. Tutup form ini, ubah data nasabah, lalu tandai titiknya pada peta.'}
            {gpsAccuracy !== null && <span className="mt-1 block font-semibold">Akurasi GPS terakhir: ±{Math.round(gpsAccuracy)} meter.</span>}
          </div>
        )}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-700">Status hasil kunjungan</legend>
          <div className="grid grid-cols-3 gap-2">
            {outcomes.map((outcome) => (
              <button type="button" key={outcome} onClick={() => setStatus(outcome)} className={`rounded-lg border px-2 py-2.5 text-[11px] font-semibold transition ${status === outcome ? 'border-[#00529b] bg-blue-50 text-[#00529b] ring-2 ring-blue-100 font-bold' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                {outcome}
              </button>
            ))}
          </div>
        </fieldset>
        {status === 'Reschedule' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="form-label">Jadwal baru
              <input type="date" value={newDate} onChange={(event) => setNewDate(event.target.value)} required className="form-control" />
            </label>
            <label className="form-label">Jam baru
              <input type="time" value={newTime} onChange={(event) => setNewTime(event.target.value)} required className="form-control" />
            </label>
          </div>
        )}
        <label className="form-label">Catatan hasil pertemuan
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} placeholder="Contoh: bertemu langsung, nasabah meminta dihubungi kembali..." className="form-control resize-y" />
        </label>
        <label className="block cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-center transition hover:border-[#00529b] hover:bg-blue-50/30">
          <input type="file" accept="image/*" className="sr-only" onChange={(event) => readImage(event.target.files?.[0])} />
          {evidence ? <Camera className="mx-auto size-5 text-emerald-600" /> : <UploadCloud className="mx-auto size-5 text-slate-400" />}
          <span className="mt-2 block text-xs font-semibold text-slate-700">{evidenceName || (evidence ? 'Foto bukti sudah terlampir' : 'Unggah foto bukti kunjungan')}</span>
          <span className="mt-1 block text-[10px] text-slate-400">Gambar maksimal 1 MB · opsional</span>
        </label>

        {/* Follow-up Scheduler Section */}
        <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-3.5">
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[#00529b]">
            <input
              type="checkbox"
              checked={createFollowUp}
              onChange={(e) => setCreateFollowUp(e.target.checked)}
              className="size-4 rounded text-[#00529b] focus:ring-[#00529b]"
            />
            <span>Jadwalkan Follow-up tindak lanjut untuk nasabah ini</span>
          </label>
          {createFollowUp && (
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 pt-2.5 border-t border-blue-100">
              <label className="text-[11px] font-semibold text-slate-700">Tanggal Follow-up
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  required
                  className="form-control mt-1 text-xs"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-700">Jenis Tindak Lanjut
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                  className="form-control mt-1 text-xs"
                >
                  <option>Melengkapi Dokumen</option>
                  <option>Telepon</option>
                  <option>WhatsApp</option>
                  <option>Pertemuan/Kunjungan Ulang</option>
                  <option>Penawaran Produk</option>
                  <option>Lainnya</option>
                </select>
              </label>
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700">Catatan Tindak Lanjut
                  <input
                    type="text"
                    value={followUpNotes}
                    onChange={(e) => setFollowUpNotes(e.target.value)}
                    placeholder="Contoh: Mengambil berkas jaminan yang telah ditandatangani"
                    className="form-control mt-1 text-xs"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} disabled={isSaving} className="button-secondary disabled:cursor-not-allowed disabled:opacity-50">Batal</button>
          <button type="submit" disabled={isSaving || (status === 'Selesai' && !hasCustomerCoordinates)} className="button-orange disabled:cursor-not-allowed disabled:opacity-60">
            {isSaving ? 'Mengambil GPS & menyimpan...' : status === 'Selesai' ? hasCustomerCoordinates ? 'Ambil GPS & check-in' : 'Check-in perlu koordinat' : 'Simpan hasil'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default VisitUpdateModal
