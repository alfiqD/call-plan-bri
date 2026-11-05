import { useState, useMemo, useEffect } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  Info,
  LoaderCircle,
  LocateFixed,
  MapPin,
  RotateCcw,
  XCircle,
} from 'lucide-react'
import Modal from './Modal'
import StatusBadge from './StatusBadge'
import { submitVisitResult, validateAppointmentApiReady } from '../services/jadwalKunjungan'
import { useAuth } from '../context/useAuth'
import {
  getHighAccuracyLocation,
  validateCheckInLocation,
  haversineDistanceMeters,
  MAX_CHECK_IN_RADIUS_METERS,
  MAX_ALLOWABLE_GPS_ACCURACY_METERS,
} from '../services/gpsValidation'

function VisitUpdateModal({ appointment, customer, onClose, onSubmit, onScheduleFollowUp }) {
  const { user, profile, role } = useAuth()
  const currentUser = useMemo(() => ({
    id: user?.id || null,
    email: user?.email || null,
    nama: profile?.nama || user?.email?.split('@')[0] || 'RM',
    role: role || 'rm',
  }), [user?.id, user?.email, profile?.nama, role])
  const isAdmin = currentUser.role === 'admin'
  const outcomes = appointment.status === 'Execute'
    ? (isAdmin ? ['Execute', 'Selesai'] : ['Execute'])
    : appointment.status === 'Selesai'
      ? ['Selesai']
      : ['Execute', 'Tidak ditemui', 'Reschedule', 'Batal']

  const hasCustomerCoordinates = Boolean(
    customer?.latitude !== '' &&
    customer?.latitude != null &&
    customer?.longitude !== '' &&
    customer?.longitude != null &&
    Number.isFinite(Number(customer.latitude)) &&
    Number.isFinite(Number(customer.longitude))
  )

  const initialStatus = ({
    Execute: 'Execute',
    Selesai: 'Selesai',
    Reschedule: 'Reschedule',
    'Tidak ditemui': 'Tidak ditemui',
    Batal: 'Batal',
  })[appointment.status] || 'Execute'

  const [status, setStatus] = useState(initialStatus)
  const [newDate, setNewDate] = useState(appointment.date)
  const [newTime, setNewTime] = useState(appointment.time)

  // GPS States
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [gpsFix, setGpsFix] = useState(() => {
    if (appointment.checkInLatitude && appointment.checkInLongitude) {
      return {
        latitude: Number(appointment.checkInLatitude),
        longitude: Number(appointment.checkInLongitude),
        accuracy: appointment.checkInAccuracy ? Number(appointment.checkInAccuracy) : 15,
      }
    }
    return null
  })
  const [gpsError, setGpsError] = useState('')

  // General Error & Form State
  const [error, setError] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Follow-up Scheduler State
  const [createFollowUp, setCreateFollowUp] = useState(false)
  const [followUpDate, setFollowUpDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 2)
    return d.toISOString().split('T')[0]
  })
  const [followUpType, setFollowUpType] = useState('Melengkapi Dokumen')

  // Calculated distance & GPS validation
  const gpsValidation = useMemo(() => {
    if (!gpsFix || !hasCustomerCoordinates) return null
    return validateCheckInLocation({
      customerLat: customer.latitude,
      customerLng: customer.longitude,
      rmLat: gpsFix.latitude,
      rmLng: gpsFix.longitude,
      accuracy: gpsFix.accuracy,
    })
  }, [gpsFix, hasCustomerCoordinates, customer?.latitude, customer?.longitude])

  // Acquire GPS fix with stabilization
  const fetchGpsCoordinates = async () => {
    setError('')
    setGpsError('')
    setIsGpsLoading(true)
    try {
      const reading = await getHighAccuracyLocation({
        timeout: 15000,
        stabilizeTimeMs: 2500,
        targetAccuracyMeters: 30,
      })
      setGpsFix(reading)
    } catch (err) {
      console.warn('Gagal membaca GPS:', err)
      setGpsError(err instanceof Error ? err.message : 'Sinyal GPS tidak dapat diperoleh.')
    } finally {
      setIsGpsLoading(false)
    }
  }

  // Acquire GPS when submitting a visit into the administration stage.
  useEffect(() => {
    if (status === 'Execute' && appointment.status !== 'Execute' && !gpsFix && !isGpsLoading && hasCustomerCoordinates) {
      fetchGpsCoordinates()
    }
  }, [status, hasCustomerCoordinates, appointment.status])

  // Form Submit Handler
  const submit = async (event) => {
    event.preventDefault()
    setError('')

    if (status === 'Reschedule') {
      if (!newDate) {
        setError('Tanggal jadwal ulang wajib diisi.')
        return
      }
      if (!newTime) {
        setError('Jam jadwal ulang wajib diisi.')
        return
      }
    }

    let coordinatesToSave = null

    if (status === 'Execute') {
      if (!hasCustomerCoordinates) {
        setError('Koordinat nasabah belum tersedia pada peta. Tentukan titik lokasi nasabah sebelum check-in.')
        return
      }

      if (!gpsFix) {
        setError('Koordinat GPS wajib diperoleh untuk mengirim kunjungan ke tahap administrasi. Klik tombol "Ambil Ulang Lokasi".')
        return
      }

      if (gpsValidation) {
        if (gpsValidation.isAccuracyPoor) {
          setError(`Akurasi GPS (±${gpsValidation.accuracy} m) melebihi batas toleransi ${MAX_ALLOWABLE_GPS_ACCURACY_METERS} meter. Mohon coba di area terbuka agar GPS lebih presisi.`)
          return
        }
        if (!gpsValidation.isWithinRadius) {
          setError(`Check-in ditolak. Anda berada sejauh ${gpsValidation.distanceMeters} meter dari lokasi nasabah (maksimal ${MAX_CHECK_IN_RADIUS_METERS} meter).`)
          return
        }
      }

      coordinatesToSave = {
        latitude: gpsFix.latitude,
        longitude: gpsFix.longitude,
        accuracy: gpsFix.accuracy,
        distanceMeters: gpsValidation?.distanceMeters || null,
      }
    } else if (status === 'Tidak ditemui' && gpsFix) {
      // Optional GPS proof of arrival for unmet visits
      let dist = null
      if (hasCustomerCoordinates) {
        dist = haversineDistanceMeters(customer.latitude, customer.longitude, gpsFix.latitude, gpsFix.longitude)
      }
      coordinatesToSave = {
        latitude: gpsFix.latitude,
        longitude: gpsFix.longitude,
        accuracy: gpsFix.accuracy,
        distanceMeters: dist !== null ? Math.round(dist) : null,
      }
    }

    setIsSaving(true)

    try {
      validateAppointmentApiReady(appointment)

      const savedAppointment = await submitVisitResult(
        appointment,
        {
          status,
          newDate,
          newTime,
          coordinates: coordinatesToSave,
        },
        currentUser
      )

      await onSubmit(savedAppointment)

      if (createFollowUp && onScheduleFollowUp) {
        await onScheduleFollowUp({
          customerId: customer?.id || appointment.customerId,
          appointmentId: appointment.id,
          date: followUpDate,
          time: '09:00',
          type: followUpType,
          notes: `Follow-up dari kunjungan ${appointment.date}`,
          priority: 'Normal',
          status: 'Belum Dilakukan',
        })
      }

      onClose()
    } catch (submitError) {
      console.error('Gagal menyimpan hasil kunjungan:', submitError)
      setError(submitError instanceof Error ? submitError.message : 'Gagal menyimpan hasil kunjungan.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Modal
      title="Update Hasil Kunjungan"
      description="Catat status hasil kunjungan serta validasi lokasi GPS/check-in."
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Customer & Appointment Info Header */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{customer?.name || 'Nasabah'}</p>
              {customer?.picName && <p className="mt-0.5 text-[11px] text-slate-600">PIC: {customer.picName}</p>}
              {customer?.phone && (
                <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`} className="mt-0.5 inline-flex text-[11px] text-[#00529b] hover:underline">
                  No. HP: {customer.phone}
                </a>
              )}
              <p className="mt-0.5 text-[11px] text-slate-500">
                RM: {currentUser.nama} · {appointment.date} · {appointment.time}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{appointment.purpose}</p>
              {customer?.address && (
                <p className="mt-1 flex items-start gap-1 text-[11px] text-slate-600 line-clamp-1">
                  <MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />
                  <span>{customer.address}</span>
                </p>
              )}
            </div>
            <StatusBadge status={appointment.status} />
          </div>
          {appointment.status === 'Execute' && (
            <p className="mt-2 border-t border-slate-200 pt-2 text-[11px] text-slate-600">
              {isAdmin
                ? 'Kunjungan sedang dalam tahap administrasi. Tandai Selesai setelah proses administrasi rampung.'
                : 'Kunjungan sudah dikirim ke tahap administrasi dan menunggu penyelesaian oleh Admin.'}
            </p>
          )}
        </div>

        {/* Status Selection */}
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-slate-700">Status hasil kunjungan</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {outcomes.map((outcome) => {
              const isSelected = status === outcome
              return (
                <button
                  type="button"
                  key={outcome}
                  onClick={() => setStatus(outcome)}
                  className={`min-h-[44px] rounded-lg border px-2.5 py-2.5 text-xs font-semibold transition text-center ${
                    isSelected
                      ? 'border-[#00529b] bg-blue-50/70 text-[#00529b] ring-2 ring-blue-100 font-bold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {outcome}
                </button>
              )
            })}
          </div>
        </fieldset>

        {/* Reschedule Inputs */}
        {status === 'Reschedule' && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 sm:grid-cols-2">
            <label className="form-label text-amber-950">
              Jadwal baru
              <input
                type="date"
                value={newDate}
                onChange={(event) => setNewDate(event.target.value)}
                required
                className="form-control mt-1"
              />
            </label>
            <label className="form-label text-amber-950">
              Jam baru
              <input
                type="time"
                value={newTime}
                onChange={(event) => setNewTime(event.target.value)}
                required
                className="form-control mt-1"
              />
            </label>
          </div>
        )}

        {/* GPS Check-In Section */}
        {status === 'Execute' && appointment.status !== 'Execute' && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
            <div className="flex flex-col items-stretch justify-between gap-2 border-b border-blue-100 pb-2.5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <LocateFixed className="size-4 text-[#00529b]" />
                <span className="text-xs font-bold text-[#00529b]">Validasi GPS Check-in (Maks. 100m)</span>
              </div>
              <button
                type="button"
                onClick={fetchGpsCoordinates}
                disabled={isGpsLoading}
                className="inline-flex min-h-[44px] items-center justify-center gap-1 rounded-md border border-blue-200 bg-white px-2 py-2 text-[11px] font-semibold text-[#00529b] shadow-2xs hover:bg-blue-50 transition disabled:opacity-50 sm:min-h-9"
              >
                {isGpsLoading ? (
                  <>
                    <LoaderCircle size={12} className="animate-spin" />
                    <span>Mendeteksi...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={12} />
                    <span>Ambil Ulang Lokasi</span>
                  </>
                )}
              </button>
            </div>

            {!hasCustomerCoordinates ? (
              <div className="rounded-lg bg-amber-100/70 p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p className="font-semibold">Titik koordinat nasabah belum ditentukan pada peta.</p>
                  <p className="mt-0.5 text-[11px]">
                    Check-in untuk mengirim kunjungan ke tahap administrasi mewajibkan validasi radius 100 meter. Perbarui data nasabah lalu tandai titik lokasinya di peta terlebih dahulu.
                  </p>
                </div>
              </div>
            ) : isGpsLoading ? (
              <div className="py-3 text-center text-xs text-slate-600 flex items-center justify-center gap-2">
                <LoaderCircle size={16} className="animate-spin text-[#00529b]" />
                <span>Memperoleh koordinat satelit GPS dengan akurasi tinggi...</span>
              </div>
            ) : gpsError ? (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2 border border-rose-200">
                <XCircle className="size-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="flex-1">
                  <p className="font-semibold">Gagal memperoleh sinyal GPS</p>
                  <p className="mt-0.5 text-[11px]">{gpsError}</p>
                  <button
                    type="button"
                    onClick={fetchGpsCoordinates}
                    className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 underline hover:no-underline"
                  >
                    <RotateCcw size={11} /> Coba ambil ulang GPS
                  </button>
                </div>
              </div>
            ) : gpsFix && gpsValidation ? (
              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Jarak ke Nasabah:</span>
                    <span className={`text-sm font-bold ${gpsValidation.isWithinRadius ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {gpsValidation.distanceMeters} meter
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {gpsValidation.isWithinRadius ? '✓ Dalam radius 100m' : '✕ Di luar radius 100m'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white p-2.5 border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Akurasi Sinyal GPS:</span>
                    <span className={`text-sm font-bold ${gpsValidation.accuracy <= 30 ? 'text-emerald-700' : gpsValidation.accuracy <= 100 ? 'text-amber-600' : 'text-rose-600'}`}>
                      ±{gpsValidation.accuracy} meter
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {gpsValidation.accuracy <= 30 ? 'Sangat akurat' : gpsValidation.accuracy <= 100 ? 'Cukup akurat' : 'Akurasi buruk'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 font-mono bg-white/70 px-2.5 py-1.5 rounded border border-slate-200 truncate">
                  Koordinat: {gpsFix.latitude.toFixed(6)}, {gpsFix.longitude.toFixed(6)}
                </div>

                {gpsValidation.isAccuracyPoor && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-800 flex items-start gap-1.5">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <span>
                      Akurasi GPS (±{gpsValidation.accuracy} m) melebihi batas 100m. Disarankan mencoba di area terbuka agar sinyal satelit GPS lebih presisi.
                    </span>
                  </div>
                )}

                {!gpsValidation.isWithinRadius && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 flex items-start gap-1.5">
                    <XCircle className="size-4 shrink-0 text-rose-600 mt-0.5" />
                    <span>
                      Check-in ditolak karena berjarak {gpsValidation.distanceMeters} meter dari titik nasabah (maksimal {MAX_CHECK_IN_RADIUS_METERS} meter).
                    </span>
                  </div>
                )}

                {gpsValidation.isValid && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5 text-xs text-emerald-800 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                    <span>Lokasi check-in terverifikasi valid dalam radius nasabah.</span>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}

        {/* Optional GPS for Unmet visits */}
        {status === 'Tidak ditemui' && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-700">Bukti Lokasi GPS (Opsional)</span>
              <button
                type="button"
                onClick={fetchGpsCoordinates}
                disabled={isGpsLoading}
                className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition disabled:opacity-50"
              >
                {isGpsLoading ? <LoaderCircle size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                <span>{gpsFix ? 'Perbarui Titik GPS' : 'Ambil Titik Lokasi Saya'}</span>
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Jika Anda telah berada di lokasi namun nasabah tidak dapat ditemui, Anda dapat merekam koordinat GPS sebagai bukti kedatangan.
            </p>
            {gpsFix && (
              <p className="mt-2 text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} /> Titik GPS tercatat: {gpsFix.latitude.toFixed(6)}, {gpsFix.longitude.toFixed(6)} (Akurasi ±{Math.round(gpsFix.accuracy)} m)
              </p>
            )}
          </div>
        )}

        {/* Reschedule or Batal notice */}
        {(status === 'Reschedule' || status === 'Batal') && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 flex items-center gap-1.5">
            <Info size={14} className="shrink-0 text-slate-400" />
            <span>Validasi lokasi GPS tidak diwajibkan untuk status {status.toLowerCase()}.</span>
          </div>
        )}

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
              <label className="text-[11px] font-semibold text-slate-700">
                Tanggal Follow-up
                <input
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  required
                  className="form-control mt-1 text-xs"
                />
              </label>
              <label className="text-[11px] font-semibold text-slate-700">
                Jenis Tindak Lanjut
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
            </div>
          )}
        </div>

        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}

        {/* Footer Actions */}
        <div className="sticky bottom-0 -mx-4 -mb-4 flex flex-col-reverse justify-end gap-2 border-t border-slate-100 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="button-secondary !min-h-[44px] w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={
              isSaving ||
              isGpsLoading ||
              appointment.status === 'Selesai' ||
              (appointment.status === 'Execute' && (!isAdmin || status === 'Execute')) ||
              (status === 'Execute' && appointment.status !== 'Execute' && (!hasCustomerCoordinates || !gpsFix || (gpsValidation && !gpsValidation.isValid)))
            }
            className="button-orange !min-h-[44px] w-full disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                <span>Menyimpan Status Kunjungan...</span>
              </>
            ) : (
              <span>{status === 'Selesai' ? 'Selesaikan Administrasi' : status === 'Execute' ? 'Kirim ke Tahap Administrasi' : 'Simpan Status Kunjungan'}</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default VisitUpdateModal
