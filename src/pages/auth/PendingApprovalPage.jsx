import { useState } from 'react'
import { Clock, LogOut, RefreshCw, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import BrandWordmark from '../../components/BrandWordmark'

function PendingApprovalPage() {
  const { profile, refreshProfile, signOut } = useAuth()
  const [checking, setChecking] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const isRejected = profile?.status === 'rejected'

  const handleRefresh = async () => {
    setChecking(true)
    await refreshProfile()
    setChecking(false)
  }

  const handleSignOut = async () => {
    setLoggingOut(true)
    try {
      await signOut()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="auth-page flex min-h-screen items-center justify-center p-3 sm:p-6">
      <div className="auth-card p-4 sm:p-8">
        <div className="text-center pb-4 border-b border-slate-100">
          <BrandWordmark className="text-2xl" />
          <p className="mt-1 text-xs text-slate-500">
            Bank BRI KCP Iskandar Palembang
          </p>
        </div>

        <div className="py-6 text-center">
          <div
            className={`mx-auto flex size-14 items-center justify-center rounded-full ${
              isRejected ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-[#00529b]'
            }`}
          >
            {isRejected ? <ShieldAlert size={28} /> : <Clock size={28} />}
          </div>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            {isRejected ? 'Akses Akun Ditolak' : 'Menunggu Persetujuan Admin'}
          </h1>
          <p className="mx-auto mt-1.5 text-xs leading-relaxed text-slate-600">
            {isRejected
              ? 'Akun Anda belum disetujui. Hubungi Administrator untuk informasi lebih lanjut.'
              : 'Akun Anda sedang dalam proses verifikasi Admin. Silakan periksa status secara berkala.'}
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={checking}
            className="button-primary !min-h-[44px] w-full disabled:opacity-50"
          >
            <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
            <span>{checking ? 'Memeriksa...' : 'Periksa Status'}</span>
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={loggingOut}
            className="button-secondary !min-h-[44px] w-full disabled:opacity-50"
          >
            <LogOut size={14} />
            <span>Keluar</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage
