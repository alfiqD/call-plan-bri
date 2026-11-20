import {
  CalendarDays,
  Home,
  ShieldCheck,
  User,
  UsersRound,
} from 'lucide-react'

function AdminBottomNav({
  activePage,
  isProfileOpen,
  onNavigate,
  onOpenProfile,
  urgentFollowUpCount = 0,
}) {
  const menuItems = [
    {
      id: 'dashboard',
      label: 'Beranda',
      icon: Home,
      isActive: activePage === 'dashboard' && !isProfileOpen,
      onClick: () => {
        onNavigate('dashboard')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    },
    {
      id: 'customers',
      label: 'Nasabah',
      icon: UsersRound,
      isActive: activePage === 'customers' && !isProfileOpen,
      onClick: () => onNavigate('customers'),
    },
    {
      id: 'schedule',
      label: 'Jadwal',
      icon: CalendarDays,
      isActive: activePage === 'schedule' && !isProfileOpen,
      onClick: () => onNavigate('schedule'),
    },
    {
      id: 'admin-users',
      label: 'Pengguna',
      icon: ShieldCheck,
      isActive: activePage === 'admin-users' && !isProfileOpen,
      onClick: () => onNavigate('admin-users'),
    },
    {
      id: 'profile',
      label: 'Profil',
      icon: User,
      isActive: isProfileOpen || ['audit-log', 'follow-up', 'reports'].includes(activePage),
      onClick: onOpenProfile,
      hasBadge: urgentFollowUpCount > 0,
    },
  ]

  return (
    <nav
      aria-label="Navigasi bawah Administrator"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_20px_-4px_rgba(15,23,42,0.08)] backdrop-blur-md lg:hidden"
    >
      <div className="grid h-16 grid-cols-5">
        {menuItems.map(({ id, label, icon: Icon, isActive, onClick, hasBadge }) => (
          <button
            key={id}
            type="button"
            onClick={onClick}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex min-h-[48px] min-w-0 flex-col items-center justify-center gap-1 px-1 py-1 text-[10.5px] transition-all duration-150 select-none touch-manipulation active:scale-95 ${isActive
              ? 'font-bold text-[#00529b]'
              : 'font-medium text-slate-500 hover:text-slate-800'
              }`}
          >
            {/* Top Indicator Accent: BRI Orange */}
            {isActive && (
              <span
                className="absolute inset-x-1/2 top-0 h-[3px] w-9 -translate-x-1/2 rounded-b-full bg-[#f37021] shadow-[0_1px_6px_rgba(243,112,33,0.55)] animate-in fade-in zoom-in-90 duration-150"
                aria-hidden="true"
              />
            )}

            <div className="relative flex items-center justify-center">
              <Icon
                size={20}
                strokeWidth={isActive ? 2.4 : 1.8}
                className={`transition-colors duration-150 ${isActive
                  ? 'text-[#00529b]'
                  : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                aria-hidden="true"
              />

              {/* Notification Badge if applicable */}
              {hasBadge && (
                <span
                  className="absolute -right-1.5 -top-1 size-2 rounded-full bg-[#f37021] ring-2 ring-white"
                  aria-label="Pemberitahuan aktif"
                />
              )}
            </div>

            <span className="max-w-full truncate tracking-tight">
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  )
}

export default AdminBottomNav
