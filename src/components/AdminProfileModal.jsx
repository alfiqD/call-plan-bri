import {
  Bell,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  HelpCircle,
  LogOut,
  Mail,
  Shield,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react'

function AdminProfileModal({
  isOpen,
  onClose,
  user,
  profile,
  onNavigate,
  urgentFollowUpCount = 0,
  onOpenSettings,
  onOpenLogout,
}) {
  if (!isOpen) return null

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Administrator'
  const displayEmail = profile?.email || user?.email || 'admin@bri.co.id'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'AD'

  const assignedArea = profile?.assigned_area || 'KCP Iskandar Palembang'

  const accountStatus = profile?.status || 'approved'
  const statusConfig = {
    approved: {
      label: 'Aktif (Disetujui)',
      className: 'text-emerald-700',
      icon: CheckCircle2,
    },
    pending: {
      label: 'Menunggu Persetujuan',
      className: 'text-amber-700',
      icon: Clock,
    },
    rejected: {
      label: 'Ditolak',
      className: 'text-rose-700',
      icon: XCircle,
    },
  }[accountStatus] || {
    label: 'Status Tidak Diketahui',
    className: 'text-slate-500',
    icon: HelpCircle,
  }

  const StatusIcon = statusConfig.icon

  const handleMenuClick = (action) => {
    onClose()
    action()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-xs transition-opacity lg:hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-profile-modal-title"
    >
      <div
        className="relative w-full max-w-lg rounded-t-2xl border-t border-slate-200/80 bg-white p-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(15,23,42,0.15)] animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle pill */}
        <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-300" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              <Shield size={15} />
            </span>
            <h2 id="admin-profile-modal-title" className="text-sm font-bold text-slate-900">
              Profil & Akun Administrator
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* Profile Card Summary */}
        <div className="mt-3.5 rounded-xl border border-amber-100 bg-[linear-gradient(135deg,#fdfcf9_0%,#ffffff_100%)] p-3.5 shadow-[0_1px_2px_rgba(243,112,33,0.04)]">
          <div className="flex items-start gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-[#00529b] text-sm font-bold text-white shadow-xs">
              {initials}
              <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500" title="Online" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-bold text-slate-900">{displayName}</p>
              </div>
              <p className="mt-0.5 flex items-center gap-1 truncate font-mono text-[11px] text-slate-500">
                <Mail size={11} className="shrink-0 text-slate-400" />
                <span className="truncate">{displayEmail}</span>
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700">
                  <Shield size={10} className="text-amber-600" />
                  <span>Administrator</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] text-slate-600">
                  <Building2 size={10} className="text-[#00529b]" />
                  <span>{assignedArea}</span>
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-amber-100/70 pt-2.5 text-[11px] text-slate-600">
            <span className="text-slate-500">Peran Sistem:</span>
            <span className="font-semibold text-slate-800">Supervisi & Administrasi</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600">
            <span className="text-slate-500">Status Akun:</span>
            <span className={`inline-flex items-center gap-1 font-semibold ${statusConfig.className}`}>
              <StatusIcon size={12} />
              <span>{statusConfig.label}</span>
            </span>
          </div>
        </div>

        {/* Menu Navigasi Khusus Admin */}
        <div className="mt-3.5 space-y-1">
          <p className="px-1 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
            Menu Administrasi & Pengawasan
          </p>

          <button
            type="button"
            onClick={() => handleMenuClick(() => onNavigate('admin-users'))}
            className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-700">
                <ShieldCheck size={15} />
              </span>
              <div>
                <span className="block text-slate-800">Kelola Pengguna</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Persetujuan akun RM & manajemen peran</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => handleMenuClick(() => onNavigate('audit-log'))}
            className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-[#00529b]/10 text-[#00529b]">
                <Shield size={15} />
              </span>
              <div>
                <span className="block text-slate-800">Audit Log</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Rekam jejak aktivitas sistem</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => handleMenuClick(() => onNavigate('follow-up'))}
            className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-[#00529b]/10 text-[#00529b]">
                <CalendarClock size={15} />
              </span>
              <div>
                <span className="block text-slate-800">Follow-up Nasabah</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Pengawasan tindak lanjut seluruh RM</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {urgentFollowUpCount > 0 && (
                <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {urgentFollowUpCount}
                </span>
              )}
              <ChevronRight size={14} className="text-slate-400" />
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleMenuClick(() => onNavigate('reports'))}
            className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-[#00529b]/10 text-[#00529b]">
                <ClipboardList size={15} />
              </span>
              <div>
                <span className="block text-slate-800">Status Kunjungan</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Rekapitulasi status & ekspor laporan</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => handleMenuClick(onOpenSettings)}
            className="flex w-full items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 p-2.5 text-left text-xs font-semibold text-slate-700 transition hover:border-slate-200 hover:bg-slate-100 active:bg-slate-200/70"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-[#00529b]/10 text-[#00529b]">
                <Bell size={15} />
              </span>
              <div>
                <span className="block text-slate-800">Pengaturan Notifikasi</span>
                <span className="block text-[10.5px] font-normal text-slate-500">Izin browser & preferensi pengingat</span>
              </div>
            </div>
            <ChevronRight size={14} className="text-slate-400" />
          </button>
        </div>

        {/* Logout Button */}
        <div className="mt-4 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => handleMenuClick(onOpenLogout)}
            className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 active:bg-rose-200/80"
          >
            <LogOut size={15} />
            <span>Keluar dari Aplikasi</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminProfileModal
