import { useState } from 'react'
import { AlertCircle, Compass, LoaderCircle, LogOut, Shield, User, X } from 'lucide-react'

export function LogoutConfirmationModal({ isOpen, onClose, onConfirm, user, profile, role }) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
  const displayEmail = profile?.email || user?.email || 'rm@bri.co.id'
  const isAdmin = role === 'admin'
  const roleLabel = isAdmin ? 'Administrator' : 'Relationship Manager'
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'RM'

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onConfirm()
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with BRI Signature Accent */}
        <div className="relative bg-gradient-to-r from-[#002D62] via-[#00529C] to-[#003B7A] p-6 text-white">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="absolute right-4 top-4 rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
            aria-label="Tutup dialog"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md text-white ring-1 ring-white/30">
              <Compass size={24} strokeWidth={2.2} />
              <span className="absolute -bottom-0.5 right-1 size-2.5 rounded-full bg-[#f37021] ring-2 ring-[#002D62]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-white">Call<span className="text-[#f37021]">Plan</span></span>
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">Bank BRI</span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">KCP Iskandar Palembang</p>
            </div>
          </div>

          <h2 id="logout-modal-title" className="mt-4 text-lg font-bold text-white">
            Konfirmasi Keluar Akun
          </h2>
          <p className="mt-0.5 text-xs text-blue-100/90 leading-relaxed">
            Apakah Anda yakin ingin mengakhiri sesi kerja pada sistem Call Plan?
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Active User Card Preview */}
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-[#f8fafc] p-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-sm font-black text-[#00529C] ring-2 ring-[#00529C]/15">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-900">{displayName}</p>
              <p className="truncate text-[11px] text-slate-500">{displayEmail}</p>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-600">
                {isAdmin ? (
                  <Shield size={11} className="text-amber-600" />
                ) : (
                  <User size={11} className="text-blue-600" />
                )}
                <span className="font-semibold">{roleLabel}</span>
              </div>
            </div>
          </div>

          {/* Warning / Reminder Box */}
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-900">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[11px] leading-relaxed text-amber-800">
              Pastikan Anda telah menyelesaikan dan menyimpan laporan kunjungan nasabah atau tindak lanjut sebelum keluar.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="button-secondary w-full sm:w-auto px-5 py-2.5 text-xs font-semibold rounded-xl"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-700 active:scale-[0.99] transition disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Mengeluarkan...
                </>
              ) : (
                <>
                  <LogOut size={15} />
                  Ya, Keluar dari Akun
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LogoutConfirmationModal
