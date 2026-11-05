import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  Compass,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'

const baseNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Data Nasabah', icon: UsersRound },
  { id: 'schedule', label: 'Jadwal Kunjungan', icon: CalendarDays },
  { id: 'follow-up', label: 'Follow-up Reminder', icon: CalendarClock },
  { id: 'reports', label: 'Status Kunjungan', icon: ClipboardList },
]

function Sidebar({ activePage, onNavigate, urgentFollowUpCount = 0, onOpenLogoutModal }) {
  const { role, profile, user, signOut } = useAuth()
  const isAdmin = role === 'admin'
  const handleLogout = onOpenLogoutModal || signOut

  const navigation = [
    ...baseNavigation,
    ...(isAdmin ? [
      { id: 'admin-users', label: 'Kelola Akun (Admin)', icon: ShieldCheck },
      { id: 'audit-log', label: 'Audit Log (Admin)', icon: Shield },
    ] : []),
  ]

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
  const roleLabel = isAdmin ? 'Administrator' : 'Relationship Manager'

  return (
    <div className="flex h-full flex-col border-r border-[#12395f] bg-gradient-to-b from-[#002046] via-[#002d57] to-[#001a35] text-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1683ca] to-[#00529b] text-white shadow-lg shadow-blue-950/30 ring-1 ring-white/15">
          <Compass size={20} strokeWidth={2.2} />
          <span className="absolute -bottom-0.5 right-1 size-2 rounded-full bg-[#f37021] ring-2 ring-[#002046]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-extrabold tracking-tight text-white">Call<span className="text-[#ff914d]">Plan</span></span>
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-blue-100 ring-1 ring-white/10">BRI</span>
          </div>
          <p className="truncate text-[11px] font-medium text-blue-100/65">
            KCP Iskandar Palembang
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-blue-100/45">
          Menu Utama
        </p>
        <nav className="space-y-1" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`group relative flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-white/10 text-white font-semibold shadow-inner shadow-white/5'
                    : 'text-blue-100/75 hover:bg-white/[0.07] hover:text-white'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  className={isActive ? 'text-[#ff914d]' : 'text-blue-100/50 group-hover:text-blue-100'}
                />
                <span className="flex-1 truncate">{label}</span>
                {id === 'follow-up' && urgentFollowUpCount > 0 && (
                  <span
                    className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white shadow-xs"
                    title={`${urgentFollowUpCount} follow-up jatuh tempo atau terlambat`}
                  >
                    {urgentFollowUpCount > 99 ? '99+' : urgentFollowUpCount}
                  </span>
                )}
                {isActive && (
                  <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-[#f37021]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Info & Logout Section */}
      <div className="border-t border-white/10 bg-black/10 p-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3 shadow-lg shadow-black/10">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/15 text-xs font-bold text-blue-100 ring-1 ring-white/10">
              {displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{displayName}</p>
              <div className="flex items-center gap-1 text-[10px] text-blue-100/60">
                {isAdmin ? <Shield size={10} className="text-amber-300" /> : <User size={10} className="text-sky-300" />}
                <span className="truncate">{roleLabel}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari Akun"
            className="mt-3 flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] py-2 text-xs font-semibold text-blue-100/80 transition hover:border-rose-300/30 hover:bg-rose-500/15 hover:text-white active:scale-[0.99]"
            aria-label="Keluar dari akun"
          >
            <LogOut size={13} />
            <span>Keluar dari Akun</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
