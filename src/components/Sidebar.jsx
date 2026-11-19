import {
  CalendarClock,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Shield,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '../context/useAuth'
import BrandWordmark from './BrandWordmark'

const baseNavigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers', label: 'Data Nasabah', icon: UsersRound },
  { id: 'schedule', label: 'Jadwal Kunjungan', icon: CalendarDays },
  { id: 'follow-up', label: 'Follow-up', icon: CalendarClock },
  { id: 'reports', label: 'Status Kunjungan', icon: ClipboardList },
]

function Sidebar({ activePage, onNavigate, urgentFollowUpCount = 0, onOpenLogoutModal }) {
  const { role, profile, user, signOut } = useAuth()
  const isAdmin = role === 'admin'
  const handleLogout = onOpenLogoutModal || signOut

  const navigation = [
    ...baseNavigation,
    ...(isAdmin ? [
      { id: 'admin-users', label: 'Kelola Pengguna', icon: ShieldCheck },
      { id: 'audit-log', label: 'Audit Log', icon: Shield },
    ] : []),
  ]

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
  const roleLabel = isAdmin ? 'Administrator' : 'Relationship Manager'
  const initials = displayName.slice(0, 2).toUpperCase()

  // Split nav: menu operasional vs menu admin (jika admin)
  const operationalNav = navigation.filter((item) => baseNavigation.some((b) => b.id === item.id))
  const adminNav = navigation.filter((item) => !baseNavigation.some((b) => b.id === item.id))

  const renderNavItem = ({ id, label, icon: Icon }) => {
    const isActive = activePage === id
    return (
      <button
        key={id}
        onClick={() => onNavigate(id)}
        className={`group relative flex min-h-[42px] w-full items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-all duration-200 ${isActive
          ? 'bg-[linear-gradient(90deg,rgba(243,112,33,0.12)_0%,rgba(255,255,255,0.03)_100%)] font-semibold text-white'
          : 'text-slate-300/85 hover:bg-white/[0.04] hover:text-white'
          }`}
        aria-current={isActive ? 'page' : undefined}
      >
        {isActive && (
          <span className="absolute inset-y-2 left-0 w-[2px] rounded-full bg-[#f37021] shadow-[0_0_8px_rgba(243,112,33,0.55)]" />
        )}

        <Icon
          size={15.5}
          strokeWidth={isActive ? 2.2 : 1.9}
          className={`shrink-0 transition-colors ${isActive ? 'text-[#f37021]' : 'text-blue-300/45 group-hover:text-blue-100/80'
            }`}
        />
        <span className="flex-1 truncate tracking-[0.005em]">{label}</span>

        {id === 'follow-up' && urgentFollowUpCount > 0 && (
          <span
            className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9.5px] font-bold tabular-nums text-white shadow-[0_0_0_2px_rgba(4,17,31,0.9)]"
            title={`${urgentFollowUpCount} follow-up jatuh tempo`}
          >
            {urgentFollowUpCount > 99 ? '99+' : urgentFollowUpCount}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden border-r border-[#0a1c31] bg-[linear-gradient(180deg,#0a2138_0%,#061627_55%,#03101d_100%)] text-white select-none">
      {/* Aksen dekoratif tipis di atas — bukan gradient besar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#f37021]/40 to-transparent" />

      {/* ── Brand Header ──────────────────────────────────────────── */}
      <div className="relative border-b border-white/[0.06] px-5 pb-4 pt-5">
        <BrandWordmark inverse className="brand-wordmark-sidebar" />
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-[3px] w-[3px] rounded-full bg-[#f37021]" />
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-200/55">
            KCP Iskandar Palembang
          </p>
        </div>
      </div>

      {/* ── Navigation Section ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <p className="mb-1.5 px-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-blue-200/35">
          Menu Utama
        </p>
        <nav className="space-y-0.5" aria-label="Navigasi utama">
          {operationalNav.map(renderNavItem)}
        </nav>

        {adminNav.length > 0 && (
          <>
            <p className="mb-1.5 mt-4 px-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-blue-200/35">
              Administrasi
            </p>
            <nav className="space-y-0.5" aria-label="Navigasi administrasi">
              {adminNav.map(renderNavItem)}
            </nav>
          </>
        )}
      </div>

      {/* ── User Info & Logout Section ─────────────────────────────── */}
      <div className="border-t border-white/[0.06] bg-black/25 px-3 py-3">
        <div className="rounded-lg border border-white/[0.06] bg-white/[0.025] p-2.5">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-[#eaf3fb] text-[11px] font-bold tracking-wide text-[#00529b]">
              {initials}
              <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border-[1.5px] border-[#061627] bg-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold leading-tight text-white">{displayName}</p>
              <div className="mt-0.5 flex items-center gap-1 text-[10px] text-blue-200/50">
                {isAdmin ? (
                  <Shield size={9.5} className="text-amber-400" />
                ) : (
                  <User size={9.5} className="text-sky-300" />
                )}
                <span className="truncate">{roleLabel}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari sesi"
            className="mt-2.5 flex min-h-[38px] w-full items-center justify-center gap-1.5 rounded-md border border-white/[0.08] bg-white/[0.04] py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
            aria-label="Keluar"
          >
            <LogOut size={13} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Sidebar