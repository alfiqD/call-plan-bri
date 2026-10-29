import { useState, useEffect } from 'react'
import {
  Bell,
  BellRing,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Lock,
  RefreshCw,
  Send,
  Shield,
  ShieldAlert,
  Sliders,
  TriangleAlert,
  X,
} from 'lucide-react'

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
  const [testStatus, setTestStatus] = useState(null) // 'success' | 'error' | null

  useEffect(() => {
    if (!testStatus) return
    const timer = setTimeout(() => setTestStatus(null), 4000)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-[#f8fafc] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-[#00529b]/10 text-[#00529b]">
              <BellRing size={18} />
            </span>
            <div>
              <h3 id="notif-settings-title" className="text-sm font-bold text-slate-900">
                Pengaturan Notifikasi & Pengingat
              </h3>
              <p className="text-[11px] text-slate-500">
                Kelola pengingat jadwal kunjungan dan tindak lanjut nasabah di laptop
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            aria-label="Tutup pengaturan"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="max-h-[75vh] overflow-y-auto px-6 py-5 space-y-5">
          {/* Status Permission Banner */}
          <div className="rounded-xl border p-4 transition-all">
            {permission === 'granted' && (
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <CheckCircle2 size={16} />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      Status: Aktif ✓
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-700">
                    Browser Anda telah mengizinkan CallPlan menampilkan notifikasi langsung di layar laptop.
                  </p>
                  <button
                    type="button"
                    onClick={handleTest}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                  >
                    <Send size={13} className="text-[#00529b]" />
                    <span>Kirim Notifikasi Uji</span>
                  </button>
                  {testStatus === 'success' && (
                    <span className="ml-3 inline-block text-xs font-medium text-emerald-600">
                      ✓ Notifikasi uji terkirim ke sudut laptop!
                    </span>
                  )}
                  {testStatus === 'error' && (
                    <span className="ml-3 inline-block text-xs font-medium text-rose-600">
                      ✗ Gagal mengirim — periksa izin browser Anda.
                    </span>
                  )}
                </div>
              </div>
            )}

            {permission === 'default' && (
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <Bell size={16} />
                </span>
                <div className="flex-1">
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                    Status: Belum Diizinkan
                  </span>
                  <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
                    Dapatkan pop-up pengingat sebelum jadwal kunjungan dimulai dan saat follow-up nasabah jatuh tempo langsung di layar laptop Anda.
                  </p>
                  <button
                    type="button"
                    onClick={handleRequest}
                    disabled={requesting}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#00407a] transition disabled:opacity-60"
                  >
                    <BellRing size={14} />
                    <span>{requesting ? 'Menunggu Izin Browser...' : 'Aktifkan Notifikasi'}</span>
                  </button>
                </div>
              </div>
            )}

            {permission === 'denied' && (
              <div className="flex items-start gap-3 bg-rose-50/50 p-1 rounded-lg">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                  <ShieldAlert size={16} />
                </span>
                <div className="flex-1">
                  <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200">
                    Status: Diblokir oleh Browser
                  </span>
                  <p className="mt-1 text-xs text-slate-700">
                    Izin notifikasi telah diblokir di browser Anda. Ikuti petunjuk berikut untuk mengaktifkannya kembali:
                  </p>
                  <ol className="mt-2 space-y-1 rounded-lg border border-rose-200 bg-white p-3 text-[11px] text-slate-600 list-decimal list-inside">
                    <li>Klik ikon <strong>Gembok</strong> atau <strong>Setelan Situs</strong> di sebelah kiri bilah alamat URL browser (address bar).</li>
                    <li>Cari baris <strong>Notifikasi</strong> dan ubah dari <em>Blokir</em> ke <strong>Izinkan</strong>.</li>
                    <li>Muat ulang (refresh) halaman CallPlan.</li>
                  </ol>
                </div>
              </div>
            )}

            {permission === 'unsupported' && (
              <div className="flex items-start gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <Info size={16} />
                </span>
                <div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    Status: Tidak Didukung Perangkat Ini
                  </span>
                  <p className="mt-1 text-xs text-slate-600">
                    Browser Anda tidak mendukung Web Notifications API. Namun jangan khawatir, semua pengingat tetap aktif dan dapat dipantau di dashboard dan lonceng aplikasi.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Opsi Konfigurasi Pengingat */}
          <div className="space-y-4">
            <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
              <Sliders size={13} />
              Konfigurasi Waktu & Jenis Pengingat
            </h4>

            {/* Switch: Aktifkan Semua */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Aktifkan Pengingat Browser</p>
                <p className="text-[11px] text-slate-500">Nyalakan atau matikan semua pop-up notifikasi sistem</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.enabled}
                onClick={() => onSaveSettings({ enabled: !settings.enabled })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-[#00529b]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform ${
                    settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Waktu Pengingat Sebelum Kunjungan */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div className="flex items-start gap-2.5">
                <Clock size={16} className="mt-0.5 text-[#00529b]" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Waktu Pengingat Sebelum Kunjungan</p>
                  <p className="text-[11px] text-slate-500">Kirim notifikasi sebelum jam kunjungan yang dijadwalkan</p>
                </div>
              </div>
              <select
                value={settings.reminderMinutesBefore ?? 15}
                onChange={(e) => onSaveSettings({ reminderMinutesBefore: Number(e.target.value) })}
                disabled={!settings.enabled}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:border-[#00529b] focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value={10}>10 menit sebelumnya</option>
                <option value={15}>15 menit sebelumnya</option>
                <option value={30}>30 menit sebelumnya</option>
                <option value={60}>1 jam sebelumnya</option>
              </select>
            </div>

            {/* Switch: Kunjungan Hari Ini */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Pengingat Jadwal Kunjungan Hari Ini</p>
                <p className="text-[11px] text-slate-500">Notifikasi pagi hari untuk agenda kunjungan yang direncanakan</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.remindTodayVisits}
                disabled={!settings.enabled}
                onClick={() => onSaveSettings({ remindTodayVisits: !settings.remindTodayVisits })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  settings.remindTodayVisits && settings.enabled ? 'bg-[#00529b]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform ${
                    settings.remindTodayVisits && settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Switch: Follow-up & Overdue */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
              <div>
                <p className="text-xs font-bold text-slate-800">Pengingat Follow-up & Terlambat</p>
                <p className="text-[11px] text-slate-500">Notifikasi saat tindak lanjut jatuh tempo atau sudah lewat batas</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.remindFollowUps}
                disabled={!settings.enabled}
                onClick={() => onSaveSettings({ remindFollowUps: !settings.remindFollowUps })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  settings.remindFollowUps && settings.enabled ? 'bg-[#00529b]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform ${
                    settings.remindFollowUps && settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Switch: Mode Privasi Layar Kunci */}
            <div className="flex items-center justify-between rounded-xl border border-slate-100 p-3 bg-blue-50/30">
              <div className="flex items-start gap-2.5">
                <Lock size={16} className="mt-0.5 text-blue-600" />
                <div>
                  <p className="text-xs font-bold text-slate-800">Mode Privasi Notifikasi</p>
                  <p className="text-[11px] text-slate-500">
                    Sembunyikan data sensitif nasabah (nama &amp; nomor rekening) pada pop-up layar laptop
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={settings.discreetMode ?? true}
                disabled={!settings.enabled}
                onClick={() => onSaveSettings({ discreetMode: !(settings.discreetMode ?? true) })}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  (settings.discreetMode ?? true) && settings.enabled ? 'bg-[#00529b]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block size-4.5 rounded-full bg-white shadow transition-transform ${
                    (settings.discreetMode ?? true) && settings.enabled ? 'translate-x-5.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Transparansi Teknis */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700 flex items-center gap-1.5">
              <Shield size={12} className="text-[#00529b]" />
              Catatan Teknis &amp; Keamanan Privasi:
            </p>
            <p>
              • Notifikasi beroperasi menggunakan <strong>Web Notifications API</strong> saat tab aplikasi CallPlan dibuka di browser laptop (termasuk saat tab terminimasi atau di background).
            </p>
            <p>
              • Notifikasi tidak terkirim saat browser ditutup seluruhnya karena tidak ada server background push eksternal berbayar.
            </p>
            <p>
              • Seluruh data nasabah tetap aman di database lokal/internal dan tidak pernah dibocorkan ke server push pihak ketiga.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-[#f8fafc] px-6 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-[#00529b] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#003d74] transition"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  )
}

export default NotificationSettingsModal
