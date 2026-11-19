import { useState, useEffect } from 'react'
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  Lock,
  Send,
  ShieldAlert,
} from 'lucide-react'
import Modal from './Modal'

function NotificationSettingsModal({
  isOpen,
  onClose,
  permission,
  settings,
  onRequestPermission,
  onSaveSettings,
  onTestNotification,
}) {
  const [requesting, setRequesting] = useState(false)
  const [testStatus, setTestStatus] = useState(null)

  useEffect(() => {
    if (!testStatus) return
    const timer = setTimeout(() => setTestStatus(null), 3000)
    return () => clearTimeout(timer)
  }, [testStatus])

  if (!isOpen) return null

  const handleRequest = async () => {
    setRequesting(true)
    try {
      await onRequestPermission()
    } finally {
      setRequesting(false)
    }
  }

  const handleTest = () => {
    const success = onTestNotification()
    setTestStatus(success ? 'success' : 'error')
  }

  return (
    <Modal
      title="Pengaturan Notifikasi"
      description="Kelola pengingat jadwal kunjungan dan tindak lanjut nasabah."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Permission Status */}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
          {permission === 'granted' && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="text-xs font-semibold text-slate-800">Notifikasi Browser Aktif</span>
              </div>
              <button
                type="button"
                onClick={handleTest}
                className="button-secondary text-xs !min-h-[32px] px-2.5 py-1"
              >
                <Send size={12} className="text-[#00529b]" />
                <span>Kirim Uji Coba</span>
              </button>
            </div>
          )}

          {permission === 'default' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-start gap-2">
                <Bell size={16} className="mt-0.5 text-amber-600 shrink-0" />
                <p className="text-xs text-slate-700">
                  Izin notifikasi belum diaktifkan pada browser.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRequest}
                disabled={requesting}
                className="button-primary text-xs !min-h-[32px] px-3 py-1 self-start sm:self-auto"
              >
                <BellRing size={12} />
                <span>{requesting ? 'Meminta...' : 'Aktifkan Izin'}</span>
              </button>
            </div>
          )}

          {permission === 'denied' && (
            <div className="flex items-start gap-2 text-xs text-rose-700">
              <ShieldAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <p className="text-[11px] leading-relaxed">
                Notifikasi diblokir oleh browser. Izinkan notifikasi pada setelan situs browser untuk menerima pengingat.
              </p>
            </div>
          )}

          {testStatus === 'success' && (
            <p className="mt-2 text-[11px] font-semibold text-emerald-600">✓ Notifikasi uji coba berhasil dikirim.</p>
          )}
          {testStatus === 'error' && (
            <p className="mt-2 text-[11px] font-semibold text-rose-600">✕ Gagal mengirim — periksa izin browser.</p>
          )}
        </div>

        {/* Configurations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Pengingat Jadwal Hari Ini</p>
              <p className="text-[11px] text-slate-500">Notifikasi saat ada kunjungan yang direncanakan</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.remindTodayVisits}
              onClick={() => onSaveSettings({ remindTodayVisits: !settings.remindTodayVisits })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                settings.remindTodayVisits ? 'bg-[#00529b]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                  settings.remindTodayVisits ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Pengingat Follow-up</p>
              <p className="text-[11px] text-slate-500">Notifikasi tindak lanjut yang jatuh tempo</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.remindFollowUps}
              onClick={() => onSaveSettings({ remindFollowUps: !settings.remindFollowUps })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                settings.remindFollowUps ? 'bg-[#00529b]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                  settings.remindFollowUps ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Waktu Pengingat Kunjungan</p>
                <p className="text-[11px] text-slate-500">Sebelum jam jadwal kunjungan</p>
              </div>
            </div>
            <select
              value={settings.reminderMinutesBefore ?? 15}
              onChange={(e) => onSaveSettings({ reminderMinutesBefore: Number(e.target.value) })}
              className="form-control w-auto py-1 text-xs"
            >
              <option value={10}>10 menit</option>
              <option value={15}>15 menit</option>
              <option value={30}>30 menit</option>
              <option value={60}>1 jam</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-slate-400" />
              <div>
                <p className="text-xs font-semibold text-slate-800">Mode Privasi Notifikasi</p>
                <p className="text-[11px] text-slate-500">Samarkan nama nasabah pada pop-up layar</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.discreetMode ?? true}
              onClick={() => onSaveSettings({ discreetMode: !(settings.discreetMode ?? true) })}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                (settings.discreetMode ?? true) ? 'bg-[#00529b]' : 'bg-slate-300'
              }`}
            >
              <span
                className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${
                  (settings.discreetMode ?? true) ? 'translate-x-4.5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="button-primary !min-h-[44px] w-full sm:w-auto"
          >
            Selesai
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default NotificationSettingsModal
