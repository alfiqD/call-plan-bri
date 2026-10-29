import { Clock, LogOut, RefreshCw, ShieldAlert, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/useAuth'

function PendingApprovalPage() {
  const { profile, user, refreshProfile, signOut } = useAuth()
  const [checking, setChecking] = useState(false)
  const isRejected = profile?.status === 'rejected'

  const handleRefresh = async () => {
    setChecking(true)
    await refreshProfile()
    setChecking(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-8 text-center shadow-xl shadow-slate-200/50 sm:p-10">
          <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${isRejected ? 'bg-rose-50 text-rose-600 ring-8 ring-rose-50/50' : 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/50'}`}>
            {isRejected ? <ShieldAlert size={34} /> : <Clock size={34} />}
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-900">
            {isRejected ? 'Akses Akun Ditolak' : 'Menunggu Persetujuan Admin'}
          </h1>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            {isRejected
              ? 'Akun Anda saat ini tidak diizinkan untuk mengakses sistem CallPlan. Hubungi Administrator Cabang untuk informasi lebih lanjut.'
              : 'Akun Anda telah berhasil didaftarkan tetapi memerlukan verifikasi dan persetujuan dari Administrator sebelum dapat mengakses data nasabah dan jadwal kunjungan.'}
          </p>

          <div className="my-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left text-xs text-slate-700">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-slate-400">Nama:</span>
              <span className="col-span-2 font-semibold text-slate-800">{profile?.nama || user?.user_metadata?.full_name || '-'}</span>
              <span className="text-slate-400">Email:</span>
              <span className="col-span-2 font-semibold text-slate-800">{profile?.email || user?.email || '-'}</span>
              <span className="text-slate-400">Role:</span>
              <span className="col-span-2 uppercase font-semibold text-slate-800">{profile?.role || 'RM'}</span>
              <span className="text-slate-400">Status:</span>
              <span className="col-span-2">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                  {profile?.status || 'pending'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={checking}
              className="button-primary"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              {checking ? 'Memeriksa...' : 'Cek Status Persetujuan'}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="button-secondary"
            >
              <LogOut size={14} /> Keluar
            </button>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
            <UserCheck className="mr-1 inline size-3.5 text-emerald-500" />
            Keamanan Data Perbankan · Kebijakan Akses Berbasis Role (RBAC) & RLS
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage
