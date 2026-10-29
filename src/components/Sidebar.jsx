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
  { id: 'reports', label: 'Laporan Kunjungan', icon: ClipboardList },
]

function Sidebar({ activePage, onNavigate, urgentFollowUpCount = 0 }) {
  const { role, profile, user, signOut } = useAuth()
  const isAdmin = role === 'admin'

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
    <div className="flex h-full flex-col border-r border-slate-200 bg-white">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#00529b] text-white shadow-sm shadow-[#00529b]/20">
          <Compass size={20} strokeWidth={2.2} />
          <span className="absolute -bottom-0.5 right-1 size-2 rounded-full bg-[#f37021] ring-2 ring-white" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[16px] font-extrabold tracking-tight text-slate-900">Call<span className="text-[#00529b]">Plan</span></span>
            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-[#00529b]">BRI</span>
          </div>
          <p className="truncate text-[11px] font-medium text-slate-500">
            KCP Iskandar Palembang
          </p>
        </div>
      </div>

      {/* Navigation Section */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Menu Utama
        </p>
        <nav className="space-y-1" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => {
            const isActive = activePage === id
            return (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#eaf3fb] text-[#00529b] font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.9}
                  className={isActive ? 'text-[#00529b]' : 'text-slate-400 group-hover:text-slate-600'}
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
                  <span className="size-1.5 rounded-full bg-[#00529b]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* User Info & Logout Section */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-3">
        <div className="flex items-center gap-2.5 rounded-lg bg-white p-2.5 border border-slate-200/80 shadow-xs">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-xs font-bold text-[#00529b]">
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-800">{displayName}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500">
              {isAdmin ? <Shield size={10} className="text-amber-600" /> : <User size={10} className="text-blue-600" />}
              <span className="truncate">{roleLabel}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            title="Keluar dari Akun"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            aria-label="Keluar dari akun"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
