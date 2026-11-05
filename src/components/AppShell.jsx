import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Bell,
  CalendarDays,
  CalendarPlus,
  ChevronDown,
  Home,
  LogOut,
  Map,
  Menu,
  Shield,
  UsersRound,
  X,
} from 'lucide-react'
import Sidebar from './Sidebar'
import NotificationBell from './NotificationBell'
import NotificationSettingsModal from './NotificationSettingsModal'
import LogoutConfirmationModal from './LogoutConfirmationModal'
import { useAuth } from '../context/useAuth'

const pageInfo = {
  dashboard: { title: 'Dashboard Monitoring', subtitle: 'Ringkasan jadwal dan aktivitas hari ini' },
  customers: { title: 'Data Nasabah', subtitle: 'Daftar debitur dan prospek KCP Iskandar Palembang' },
  schedule: { title: 'Jadwal Kunjungan', subtitle: 'Agenda dan rute kunjungan Relationship Manager' },
  'follow-up': { title: 'Follow-up Reminder', subtitle: 'Pengingat dan riwayat tindak lanjut nasabah' },
  reports: { title: 'Status Kunjungan', subtitle: 'Rekap status hasil kunjungan lapangan' },
  'admin-users': { title: 'Kelola Pengguna', subtitle: 'Administrasi dan persetujuan akun pengguna' },
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
  const info = pageInfo[activePage] || { title: 'CallPlan', subtitle: 'Aplikasi Monitoring Kunjungan' }

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
    onNavigate(page)
    setMobileMenuOpen(false)
  }

  const navigateToMap = () => {
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
  const displayEmail = profile?.email || user?.email || 'rm@bri.co.id'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'RM'

  const roleLabel = role === 'admin' ? 'Admin' : 'RM'
  const roleBadgeStyle = role === 'admin'
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-blue-50 text-blue-700 border-blue-200'

  return (
    <div className="workspace-shell min-h-screen text-slate-800 antialiased">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] lg:block">
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
            className="relative h-full w-[280px] max-w-[88vw] shadow-xl"
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
              className="absolute right-3 top-3.5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup navigasi"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Main Body */}
      <div className="lg:pl-[240px]">
        {/* Top Header */}
        <header className="workspace-header sticky top-0 z-20 flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-3 sm:h-16 sm:px-6 xl:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka navigasi"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {info.title}
              </h1>
              <p className="hidden text-[11px] text-slate-500 sm:block">
                {info.subtitle}
              </p>
            </div>
          </div>

          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            {/* Current Date Display */}
            <div className="hidden items-center gap-1.5 text-xs text-slate-500 md:flex">
              <CalendarDays size={14} className="text-slate-400" />
              <span>{todayDateString}</span>
            </div>

            <div className="hidden h-5 w-px bg-slate-200 md:block" />

            {/* Quick Action: Buat Jadwal */}
            {activePage !== 'schedule' && (
              <button
                type="button"
                onClick={() => navigate('schedule')}
                className="hidden items-center gap-1.5 rounded-lg bg-[#f37021] px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-[#df5c12] transition sm:inline-flex"
              >
                <CalendarPlus size={14} />
                <span>Buat Jadwal</span>
              </button>
            )}

            {/* Notification Bell (Web Notifications & In-App Reminders) */}
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
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white py-1 pl-1.5 pr-2.5 text-left hover:bg-slate-50 transition"
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                  {initials}
                </span>
                <span className="hidden sm:block">
                  <span className="block max-w-[120px] truncate text-xs font-semibold text-slate-800">
                    {displayName}
                  </span>
                </span>
                <span className={`hidden items-center rounded px-1.5 py-0.5 text-[10px] font-bold border min-[400px]:inline-flex ${roleBadgeStyle}`}>
                  {roleLabel}
                </span>
                <ChevronDown className="hidden text-slate-400 min-[400px]:block" size={13} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="truncate text-xs font-bold text-slate-900">{displayName}</p>
                    <p className="truncate text-[11px] text-slate-500">{displayEmail}</p>
                    <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      <span>Bank BRI KCP Iskandar Palembang</span>
                    </div>
                  </div>

                  <div className="pt-1">
                    {/* Ringkasan Pengaturan Notifikasi di Menu Profil */}
                    {notificationState && (
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false)
                          setSettingsModalOpen(true)
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00529b]"
                      >
                        <span className="flex items-center gap-2">
                          <Bell size={14} /> Pengaturan Notifikasi
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                          notificationState.permission === 'granted'
                            ? 'bg-emerald-50 text-emerald-700'
                            : notificationState.permission === 'denied'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}>
                          {notificationState.permission === 'granted'
                            ? 'Aktif'
                            : notificationState.permission === 'denied'
                            ? 'Diblokir'
                            : 'Belum Izin'}
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
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00529b]"
                      >
                        <Shield size={14} /> Kelola Pengguna
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false)
                        setLogoutModalOpen(true)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 transition"
                    >
                      <LogOut size={14} /> Keluar dari Akun
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* In-App Permission Prompt Banner (Non-intrusive, dismissible, shown only when permission === 'default') */}
        {role !== 'admin' && notificationState?.permission === 'default' && !dismissedBanner && (
          <div className="border-b border-amber-200 bg-amber-50/90 px-4 py-2.5 text-xs text-amber-900">
            <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-3 px-0 sm:flex-row sm:items-center sm:px-6 xl:px-8">
              <div className="flex items-start gap-2">
                <Bell size={15} className="shrink-0 text-amber-700" />
                <span>
                  <strong>Aktifkan Notifikasi Pengingat di Laptop:</strong> Dapatkan pemberitahuan tepat waktu untuk jadwal kunjungan dan follow-up nasabah hari ini.
                </span>
              </div>
              <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
                <button
                  type="button"
                  onClick={async () => {
                    await notificationState.requestPermission()
                  }}
                  className="rounded-lg bg-[#00529b] px-3 py-1 text-xs font-bold text-white hover:bg-[#003d74] transition"
                >
                  Aktifkan Sekarang
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDismissedBanner(true)
                    try {
                      sessionStorage.setItem('cp-dismiss-notif-banner', '1')
                    } catch { /* ignore */ }
                  }}
                  className="rounded p-1 text-amber-700 hover:bg-amber-100"
                  aria-label="Tutup saran notifikasi"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className={`workspace-main mx-auto min-w-0 max-w-7xl px-3 pt-4 sm:px-6 sm:pt-6 xl:px-8 ${
          role === 'rm'
            ? 'pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-6'
            : 'pb-4 sm:pb-6'
        }`}>
          {children}

          {/* Clean Enterprise Footer */}
          <footer className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row">
            <span>© {new Date().getFullYear()} CallPlan · Bank BRI KCP Iskandar Palembang</span>
            <span>Sistem Perencanaan & Monitoring Kunjungan Nasabah</span>
          </footer>
        </main>

        {role === 'rm' && (
          <nav
            aria-label="Navigasi bawah"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur-sm lg:hidden"
          >
            <div className="grid h-16 grid-cols-5">
              {[
                { label: 'Home', icon: Home, active: activePage === 'dashboard' && !mobileMapActive, onClick: () => { navigate('dashboard'); window.scrollTo({ top: 0, behavior: 'smooth' }) } },
                { label: 'Peta', icon: Map, active: activePage === 'dashboard' && mobileMapActive, onClick: navigateToMap },
                { label: 'Jadwal', icon: CalendarDays, active: activePage === 'schedule', onClick: () => navigate('schedule') },
                { label: 'Nasabah', icon: UsersRound, active: activePage === 'customers', onClick: () => navigate('customers') },
                { label: 'Menu', icon: Menu, active: mobileMenuOpen || !['dashboard', 'schedule', 'customers'].includes(activePage), onClick: () => setMobileMenuOpen(true) },
              ].map(({ label, icon: Icon, active, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  aria-expanded={label === 'Menu' ? mobileMenuOpen : undefined}
                  className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold transition-colors ${
                    active
                      ? 'bg-[#eaf3fb] text-[#00529b]'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                  }`}
                >
                  {active && <span className="absolute inset-x-1/4 top-0 h-0.5 rounded-full bg-[#00529b]" />}
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}

        {/* Notification Settings Modal */}
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

        {/* Bank BRI Logout Confirmation Modal */}
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
