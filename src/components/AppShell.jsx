import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  LogOut,
  Menu,
  Shield,
  X,
} from 'lucide-react'
import Sidebar from './Sidebar'
import RMBottomNav from './RMBottomNav'
import RMProfileModal from './RMProfileModal'
import NotificationBell from './NotificationBell'
import NotificationSettingsModal from './NotificationSettingsModal'
import LogoutConfirmationModal from './LogoutConfirmationModal'
import { useAuth } from '../context/useAuth'

const pageInfo = {
  dashboard: { title: 'Dashboard', subtitle: 'Ringkasan jadwal dan aktivitas' },
  customers: { title: 'Data Nasabah', subtitle: 'Daftar debitur dan prospek' },
  schedule: { title: 'Jadwal Kunjungan', subtitle: 'Agenda dan rute kunjungan' },
  'follow-up': { title: 'Follow-up', subtitle: 'Pengingat dan riwayat tindak lanjut' },
  reports: { title: 'Status Kunjungan', subtitle: 'Rekapitulasi status hasil kunjungan' },
  'admin-users': { title: 'Kelola Pengguna', subtitle: 'Persetujuan dan peran akun pengguna' },
  'audit-log': { title: 'Audit Log', subtitle: 'Rekam jejak aktivitas sistem' },
}

function AppShell({
  activePage,
  onNavigate,
  urgentFollowUpCount = 0,
  notificationState,
  children,
}) {
  const { user, profile, role, signOut } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMapActive, setMobileMapActive] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [userDropdownOpen, setUserDropdownOpen] = useState(false)
  const [settingsModalOpen, setSettingsModalOpen] = useState(false)
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [dismissedBanner, setDismissedBanner] = useState(() => {
    try {
      return sessionStorage.getItem('cp-dismiss-notif-banner') === '1'
    } catch {
      return false
    }
  })
  const dropdownRef = useRef(null)
  const info = pageInfo[activePage] || { title: 'e-VisitBRI', subtitle: 'Sistem Monitoring Kunjungan Nasabah' }

  const todayDateString = useMemo(() => {
    return new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date())
  }, [])

  const navigate = (page) => {
    setMobileMapActive(false)
    setProfileModalOpen(false)
    onNavigate(page)
    setMobileMenuOpen(false)
  }

  const navigateToMap = () => {
    setProfileModalOpen(false)
    setMobileMapActive(true)
    onNavigate('dashboard')
    setMobileMenuOpen(false)
  }

  useEffect(() => {
    if (activePage !== 'dashboard' || !mobileMapActive) return undefined

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('rm-customer-map')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activePage, mobileMapActive])

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
  const displayEmail = profile?.email || user?.email || 'pegawai@bri.co.id'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'RM'

  const roleLabel = role === 'admin'
    ? 'Admin'
    : profile?.jenis_rm
      ? `RM ${profile.jenis_rm}`
      : 'RM'
  const roleBadgeStyle = role === 'admin'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-blue-50 text-[#00529b] border-blue-200'

  return (
    <div className="workspace-shell min-h-screen text-slate-800 antialiased">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[220px] lg:block">
        <Sidebar
          activePage={activePage}
          onNavigate={navigate}
          urgentFollowUpCount={urgentFollowUpCount}
          onOpenLogoutModal={() => setLogoutModalOpen(true)}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div
            className="relative h-full w-[260px] max-w-[85vw] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)]"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi utama"
          >
            <Sidebar
              activePage={activePage}
              onNavigate={navigate}
              urgentFollowUpCount={urgentFollowUpCount}
              onOpenLogoutModal={() => {
                setMobileMenuOpen(false)
                setLogoutModalOpen(true)
              }}
            />
            <button
              className="absolute right-3 top-3.5 rounded-lg p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup navigasi"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="lg:pl-[220px]">
        {/* ── Top Header ──────────────────────────────────────────── */}
        <header className="workspace-header sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-slate-200/70 bg-white/95 px-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] backdrop-blur-md sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] active:bg-slate-100 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu size={18} />
            </button>
            <div className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight text-slate-900 sm:text-[15px]">
                {info.title}
              </span>
              <span className="hidden truncate text-[10.5px] font-medium text-slate-400 sm:block">
                {info.subtitle}
              </span>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {/* Current Date Display */}
            <div className="hidden items-center gap-1.5 rounded-md border border-slate-200/70 bg-slate-50/60 px-2 py-1 text-[11px] font-medium text-slate-500 md:flex">
              <CalendarDays size={12} className="text-[#00529b]" />
              <span className="tabular-nums">{todayDateString}</span>
            </div>

            <div className="hidden h-4 w-px bg-slate-200 md:block" />

            {/* Quick Action: Buat Jadwal */}
            {!['schedule', 'dashboard'].includes(activePage) && (
              <button
                type="button"
                onClick={() => navigate('schedule')}
                className="hidden items-center gap-1.5 rounded-lg bg-[#00529b] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:inline-flex"
              >
                <CalendarPlus size={14} />
                <span>Buat Jadwal</span>
              </button>
            )}

            {/* Notification Bell */}
            {notificationState && (
              <NotificationBell
                permission={notificationState.permission}
                settings={notificationState.settings}
                inAppSummary={notificationState.inAppSummary}
                onRequestPermission={notificationState.requestPermission}
                onSaveSettings={notificationState.saveSettings}
                onTestNotification={notificationState.sendTestNotification}
                onOpenSettingsModal={() => setSettingsModalOpen(true)}
                onNavigate={navigate}
              />
            )}

            {/* User Profile Pill */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white py-1 pl-1.5 pr-2 text-left shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/25 hover:bg-[#f9fbfe]"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <span className="flex size-7 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                  {initials}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-[120px] truncate text-[12px] font-semibold text-slate-800">
                    {displayName}
                  </span>
                </span>
                <span className={`hidden items-center rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide min-[400px]:inline-flex ${roleBadgeStyle}`}>
                  {roleLabel}
                </span>
                <ChevronDown
                  className={`hidden text-slate-400 transition-transform min-[400px]:block ${userDropdownOpen ? 'rotate-180' : ''}`}
                  size={13}
                />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_10px_40px_-10px_rgba(15,23,42,0.25),0_2px_6px_rgba(15,23,42,0.06)]">
                  <div className="border-b border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#00529b]/15 bg-[#eaf3fb] text-xs font-bold text-[#00529b]">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-bold text-slate-900">{displayName}</p>
                        <p className="truncate font-mono text-[10.5px] text-slate-500">{displayEmail}</p>
                      </div>
                    </div>
                    <span className={`mt-2 inline-flex items-center rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${roleBadgeStyle}`}>
                      {role === 'admin' ? 'Administrator' : 'Relationship Manager'}
                    </span>
                  </div>

                  <div className="p-1.5">
                    {notificationState && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setSettingsModalOpen(true)
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[12px] font-medium text-slate-700 transition hover:bg-[#f7fbff] hover:text-[#00529b]"
                      >
                        <span className="flex items-center gap-2">
                          <Bell size={14} /> Notifikasi
                        </span>
                        <span className={`rounded border px-1.5 py-0.5 text-[9.5px] font-bold ${notificationState.permission === 'granted'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                          : notificationState.permission === 'denied'
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}>
                          {notificationState.permission === 'granted' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </button>
                    )}

                    {role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          navigate('admin-users')
                          setUserDropdownOpen(false)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-medium text-slate-700 transition hover:bg-[#f7fbff] hover:text-[#00529b]"
                      >
                        <Shield size={14} /> Kelola Pengguna
                      </button>
                    )}
                  </div>

                  <div className="border-t border-slate-100 p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        setLogoutModalOpen(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[12px] font-semibold text-rose-600 transition hover:bg-rose-50"
                    >
                      <LogOut size={14} /> Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── In-App Permission Prompt Banner ─────────────────────── */}
        {role !== 'admin' && notificationState?.permission === 'default' && !dismissedBanner && (
          <div className="border-b border-amber-200/70 bg-[linear-gradient(90deg,#fffbeb_0%,#fef3c7_100%)] px-4 py-2 text-xs text-amber-900">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md border border-amber-200/70 bg-amber-100/70 text-amber-700">
                  <Bell size={12} strokeWidth={2.2} />
                </span>
                <span className="truncate font-medium">
                  Aktifkan notifikasi browser untuk menerima pengingat jadwal dan follow-up.
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await notificationState.requestPermission()
                  }}
                  className="rounded-md bg-[#00529b] px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px"
                >
                  Aktifkan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedBanner(true)
                    try {
                      sessionStorage.setItem('cp-dismiss-notif-banner', '1')
                    } catch { /* ignore */ }
                  }}
                  className="rounded-md p-1 text-amber-700 transition hover:bg-amber-100"
                  aria-label="Tutup"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Content Area ──────────────────────────────────────────── */}
        <main className={`workspace-main mx-auto min-w-0 max-w-7xl px-4 pt-4 sm:px-6 sm:pt-6 xl:px-8 ${role === 'rm'
          ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-8'
          : 'pb-8'
          }`}>
          {children}

          {/* Clean Enterprise Footer */}
          <footer className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-slate-200 py-6 text-[11px] text-slate-400 sm:flex-row">
            <span className="tabular-nums">© {new Date().getFullYear()} e-VisitBRI · Bank BRI KCP Iskandar Palembang</span>
            <span>Sistem Monitoring Kunjungan Nasabah</span>
          </footer>
        </main>

        {/* ── Bottom Navigation (RM) ─────────────────────────────────── */}
        {role === 'rm' && (
          <RMBottomNav
            activePage={activePage}
            mobileMapActive={mobileMapActive}
            isProfileOpen={profileModalOpen}
            onNavigate={navigate}
            onNavigateToMap={navigateToMap}
            onOpenProfile={() => setProfileModalOpen(true)}
            urgentFollowUpCount={urgentFollowUpCount}
          />
        )}

        {/* ── RM Profile Bottom Sheet Modal ─────────────────────────── */}
        {role === 'rm' && (
          <RMProfileModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
            user={user}
            profile={profile}
            onNavigate={navigate}
            urgentFollowUpCount={urgentFollowUpCount}
            onOpenSettings={() => setSettingsModalOpen(true)}
            onOpenLogout={() => setLogoutModalOpen(true)}
          />
        )}

        {/* ── Notification Settings Modal ───────────────────────────── */}
        {notificationState && (
          <NotificationSettingsModal
            isOpen={settingsModalOpen}
            onClose={() => setSettingsModalOpen(false)}
            permission={notificationState.permission}
            settings={notificationState.settings}
            onRequestPermission={notificationState.requestPermission}
            onSaveSettings={notificationState.saveSettings}
            onTestNotification={notificationState.sendTestNotification}
          />
        )}

        {/* ── Logout Confirmation Modal ─────────────────────────────── */}
        <LogoutConfirmationModal
          isOpen={logoutModalOpen}
          onClose={() => setLogoutModalOpen(false)}
          onConfirm={signOut}
          user={user}
          profile={profile}
          role={role}
        />
      </div>
    </div>
  )
}

export default AppShell