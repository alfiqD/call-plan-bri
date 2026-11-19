import { useState } from 'react'
import { AlertCircle, LoaderCircle, LogOut, Shield, User } from 'lucide-react'
import Modal from './Modal'

export function LogoutConfirmationModal({ isOpen, onClose, onConfirm, user, profile, role }) {
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const displayName = profile?.nama || user?.user_metadata?.full_name || 'Petugas RM'
  const displayEmail = profile?.email || user?.email || 'pegawai@bri.co.id'
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
    <Modal
      title="Konfirmasi Keluar"
      description="Sesi kerja Anda saat ini akan diakhiri."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* User preview */}
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-xs font-bold text-[#00529b]">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-slate-900">{displayName}</p>
            <p className="truncate text-[11px] text-slate-500">{displayEmail}</p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-600">
              {isAdmin ? <Shield size={11} className="text-amber-600" /> : <User size={11} className="text-blue-600" />}
              <span>{roleLabel}</span>
            </div>
          </div>
        </div>

        {/* Warning info */}
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="text-[11px] leading-relaxed">
            Pastikan seluruh data kunjungan dan tindak lanjut nasabah telah disimpan sebelum keluar.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="button-secondary !min-h-[44px] w-full sm:w-auto"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="button-danger !min-h-[44px] w-full sm:w-auto"
          >
            {loading ? (
              <>
                <LoaderCircle size={14} className="animate-spin" />
                <span>Mengeluarkan...</span>
              </>
            ) : (
              <>
                <LogOut size={14} />
                <span>Ya, Keluar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default LogoutConfirmationModal
