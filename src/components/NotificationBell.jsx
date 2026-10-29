import { useState, useRef, useEffect } from 'react'
import {
  Bell,
  BellOff,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Info,
  Settings2,
  ShieldAlert,
  TriangleAlert,
  X,
} from 'lucide-react'
import { DEFAULT_SETTINGS } from '../services/notificationService'

/**
 * Notification Bell icon + dropdown panel for the AppShell header.
 * Receives notification state from the parent (via useNotifications hook).
 */
function NotificationBell({
  permission,
  settings,
  inAppSummary,
  onRequestPermission,
  onSaveSettings,
  onTestNotification,
  onOpenSettingsModal,
  onNavigate,
}) {
  const [panelOpen, setPanelOpen] = useState(false)
  const [requesting, setRequesting] = useState(false)
  const [testResult, setTestResult] = useState(null) // 'sent' | 'failed'
  const panelRef = useRef(null)

  const { todayVisits, overdueFollowUps, todayFollowUps } = inAppSummary
  const urgentCount = overdueFollowUps.length + todayFollowUps.length + todayVisits.length

  // Close on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  // Clear test result after 3 seconds
  useEffect(() => {
    if (!testResult) return
    const t = setTimeout(() => setTestResult(null), 3000)
    return () => clearTimeout(t)
  }, [testResult])

  const handleRequestPermission = async () => {
    setRequesting(true)
    await onRequestPermission()
    setRequesting(false)
  }

  const handleTest = () => {
    const ok = onTestNotification()
    setTestResult(ok ? 'sent' : 'failed')
  }

  // Bell icon state
  const BellIcon = urgentCount > 0
    ? BellRing
    : permission === 'granted' && settings.enabled
      ? Bell
      : BellOff

  const bellColor = urgentCount > 0
    ? 'text-[#f37021]'
    : permission === 'granted' && settings.enabled
      ? 'text-slate-600'
      : 'text-slate-400'

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        type="button"
        id="notification-bell-btn"
        onClick={() => setPanelOpen((o) => !o)}
        aria-label="Notifikasi dan pengingat"
        aria-expanded={panelOpen}
        className={`relative flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition hover:bg-slate-50 ${bellColor}`}
      >
        <BellIcon size={16} strokeWidth={2} />
        {urgentCount > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[#f37021] text-[9px] font-bold text-white shadow-sm">
            {urgentCount > 9 ? '9+' : urgentCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {panelOpen && (
        <div
          id="notification-panel"
          className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white shadow-xl"
          role="dialog"
          aria-label="Panel notifikasi dan pengingat"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-[#00529b]" />
              <span className="text-xs font-bold text-slate-900">Pengingat &amp; Notifikasi</span>
            </div>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-100"
              aria-label="Tutup panel"
            >
              <X size={13} />
            </button>
          </div>

          {/* In-App Reminders Section */}
          <div className="divide-y divide-slate-100">
            {/* Today's Visits */}
            {todayVisits.length > 0 && (
              <button
                type="button"
                onClick={() => { onNavigate?.('schedule'); setPanelOpen(false) }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <CalendarClock size={14} className="text-[#00529b]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {todayVisits.length} Kunjungan Hari Ini
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {todayVisits.map((v) => `Pukul ${v.time}`).slice(0, 2).join(' · ')}
                    {todayVisits.length > 2 && ` +${todayVisits.length - 2} lagi`}
                  </p>
                </div>
                <ChevronRight size={13} className="ml-auto mt-0.5 shrink-0 text-slate-400" />
              </button>
            )}

            {/* Today's Follow-ups */}
            {todayFollowUps.length > 0 && (
              <button
                type="button"
                onClick={() => { onNavigate?.('follow-up'); setPanelOpen(false) }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50">
                  <Clock size={14} className="text-[#00529b]" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {todayFollowUps.length} Follow-up Jatuh Tempo Hari Ini
                  </p>
                  <p className="text-[11px] text-slate-500">Tindak lanjut yang perlu diselesaikan</p>
                </div>
                <ChevronRight size={13} className="ml-auto mt-0.5 shrink-0 text-slate-400" />
              </button>
            )}

            {/* Overdue Follow-ups */}
            {overdueFollowUps.length > 0 && (
              <button
                type="button"
                onClick={() => { onNavigate?.('follow-up'); setPanelOpen(false) }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-rose-50/60 transition"
              >
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-50">
                  <TriangleAlert size={14} className="text-rose-600" />
                </span>
                <div>
                  <p className="text-xs font-semibold text-rose-700">
                    {overdueFollowUps.length} Follow-up Terlambat
                  </p>
                  <p className="text-[11px] text-rose-500">Melewati jatuh tempo, belum diselesaikan</p>
                </div>
                <ChevronRight size={13} className="ml-auto mt-0.5 shrink-0 text-rose-400" />
              </button>
            )}

            {/* Empty state */}
            {todayVisits.length === 0 && todayFollowUps.length === 0 && overdueFollowUps.length === 0 && (
              <div className="flex flex-col items-center gap-1.5 px-4 py-5 text-center">
                <CheckCircle2 size={24} className="text-emerald-400" />
                <p className="text-xs font-semibold text-slate-700">Semua agenda beres</p>
                <p className="text-[11px] text-slate-400">Tidak ada kunjungan atau follow-up yang perlu perhatian hari ini</p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Permission Status & Settings */}
          <div className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <Settings2 size={11} />
                Notifikasi Browser
              </p>
              {onOpenSettingsModal && (
                <button
                  type="button"
                  onClick={() => {
                    setPanelOpen(false)
                    onOpenSettingsModal()
                  }}
                  className="text-[10px] font-semibold text-[#00529b] hover:underline"
                >
                  Buka Pengaturan
                </button>
              )}
            </div>

            {/* Status indicator */}
            <div className="mb-3">
              {permission === 'unsupported' && (
                <div className="flex items-start gap-2 rounded-lg bg-slate-50 p-2.5 text-[11px] text-slate-600">
                  <Info size={13} className="mt-0.5 shrink-0 text-slate-400" />
                  Browser ini tidak mendukung notifikasi sistem. Pengingat hanya tampil di dalam aplikasi.
                </div>
              )}
              {permission === 'denied' && (
                <div className="flex items-start gap-2 rounded-lg bg-rose-50 p-2.5 text-[11px] text-rose-700">
                  <ShieldAlert size={13} className="mt-0.5 shrink-0 text-rose-500" />
                  <span>
                    Notifikasi diblokir browser. Aktifkan melalui{' '}
                    <strong>Pengaturan browser → Privasi → Notifikasi</strong>,
                    lalu izinkan untuk situs ini.
                  </span>
                </div>
              )}
              {permission === 'default' && (
                <div className="flex flex-col gap-2">
                  <p className="text-[11px] text-slate-600">
                    Aktifkan notifikasi browser agar pengingat kunjungan muncul bahkan saat CallPlan diminimasi.
                  </p>
                  <button
                    type="button"
                    id="enable-notifications-btn"
                    onClick={handleRequestPermission}
                    disabled={requesting}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-[#00529b] px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-[#003d74] disabled:opacity-60"
                  >
                    <Bell size={12} />
                    {requesting ? 'Menunggu izin...' : 'Aktifkan Notifikasi'}
                  </button>
                </div>
              )}
              {permission === 'granted' && (
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                  </span>
                  <span className="text-[11px] text-emerald-700 font-medium">Notifikasi browser aktif</span>
                </div>
              )}
            </div>

            {/* Settings (only show when granted) */}
            {permission === 'granted' && (
              <div className="space-y-2.5">
                {/* Enable toggle */}
                <label className="flex cursor-pointer items-center justify-between">
                  <span className="text-[11px] text-slate-700">Aktifkan pengingat</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.enabled}
                    onClick={() => onSaveSettings({ enabled: !settings.enabled })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${settings.enabled ? 'bg-[#00529b]' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${settings.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                </label>

                {/* Reminder time */}
                {settings.enabled && (
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-700">Ingatkan sebelum kunjungan</span>
                    <select
                      value={settings.reminderMinutesBefore}
                      onChange={(e) => onSaveSettings({ reminderMinutesBefore: Number(e.target.value) })}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-700 focus:border-[#00529b] focus:outline-none"
                    >
                      <option value={10}>10 menit</option>
                      <option value={15}>15 menit</option>
                      <option value={30}>30 menit</option>
                      <option value={60}>1 jam</option>
                    </select>
                  </div>
                )}

                {/* Toggle: visits */}
                {settings.enabled && (
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-[11px] text-slate-700">Pengingat kunjungan hari ini</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.remindTodayVisits}
                      onClick={() => onSaveSettings({ remindTodayVisits: !settings.remindTodayVisits })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.remindTodayVisits ? 'bg-[#00529b]' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${settings.remindTodayVisits ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                )}

                {/* Toggle: follow-ups */}
                {settings.enabled && (
                  <label className="flex cursor-pointer items-center justify-between">
                    <span className="text-[11px] text-slate-700">Pengingat follow-up jatuh tempo</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={settings.remindFollowUps}
                      onClick={() => onSaveSettings({ remindFollowUps: !settings.remindFollowUps })}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${settings.remindFollowUps ? 'bg-[#00529b]' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block size-3.5 rounded-full bg-white shadow transition-transform ${settings.remindFollowUps ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                  </label>
                )}

                {/* Test button */}
                <button
                  type="button"
                  id="test-notification-btn"
                  onClick={handleTest}
                  className="mt-1 w-full rounded-lg border border-slate-200 py-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  {testResult === 'sent' && '✓ Notifikasi uji berhasil dikirim'}
                  {testResult === 'failed' && '✗ Gagal — pastikan izin aktif'}
                  {!testResult && 'Kirim Notifikasi Uji'}
                </button>
              </div>
            )}

            {/* Honest scope note */}
            <p className="mt-3 text-[10px] leading-4 text-slate-400">
              ⓘ Pengingat aktif selama CallPlan terbuka di browser. Notifikasi tidak terkirim saat browser ditutup.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default NotificationBell
