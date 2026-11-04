import { Clock, Compass, LogOut, RefreshCw, ShieldAlert, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../context/useAuth'

function PendingApprovalPage() {
  const { profile, user, refreshProfile, signOut } = useAuth()
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
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#001736] via-[#002D62] to-[#004785] p-4 sm:p-6 lg:p-8">
      {/* Decorative Background Elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 size-96 rounded-full bg-[#00529C]/30 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 size-96 rounded-full bg-[#f37021]/20 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-2xl shadow-[#001736]/60 backdrop-blur-xl">
          {/* Top BRI Brand Header */}
          <div className="bg-gradient-to-r from-[#002046] via-[#003875] to-[#00529C] p-6 text-white text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/25">
              <Compass size={26} strokeWidth={2.3} className="text-white" />
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-white">
                Call<span className="text-[#f37021]">Plan</span>
              </span>
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-white">
                Bank BRI
              </span>
            </div>
            <p className="text-[11px] text-blue-100 font-medium">KCP Iskandar Palembang</p>
          </div>

          {/* Card Body */}
          <div className="p-8 text-center sm:p-10">
            <div className={`mx-auto flex size-16 items-center justify-center rounded-full ${isRejected ? 'bg-rose-50 text-rose-600 ring-8 ring-rose-50/70' : 'bg-amber-50 text-amber-600 ring-8 ring-amber-50/70'}`}>
              {isRejected ? <ShieldAlert size={34} /> : <Clock size={34} />}
            </div>

            <h1 className="mt-5 text-xl font-black text-slate-900">
              {isRejected ? 'Akses Akun Ditolak' : 'Menunggu Persetujuan Admin'}
            </h1>

            <p className="mt-2 text-xs leading-relaxed text-slate-600">
              {isRejected
                ? 'Akun Anda saat ini tidak diizinkan untuk mengakses sistem CallPlan. Hubungi Administrator Cabang untuk informasi lebih lanjut.'
                : 'Akun Anda telah berhasil didaftarkan tetapi memerlukan verifikasi dan persetujuan dari Administrator sebelum dapat mengakses data nasabah dan jadwal kunjungan.'}
            </p>

            <div className="my-6 rounded-2xl border border-slate-100 bg-[#f8fafc] p-4 text-left text-xs text-slate-700">
              <div className="grid grid-cols-3 gap-2.5">
                <span className="text-slate-400">Nama:</span>
                <span className="col-span-2 font-bold text-slate-900">{profile?.nama || user?.user_metadata?.full_name || '-'}</span>
                <span className="text-slate-400">Email:</span>
                <span className="col-span-2 font-semibold text-slate-800 truncate">{profile?.email || user?.email || '-'}</span>
                <span className="text-slate-400">Role:</span>
                <span className="col-span-2 uppercase font-bold text-slate-900">{profile?.role || 'RM'}</span>
                <span className="text-slate-400">Status:</span>
                <span className="col-span-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${isRejected ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                    {profile?.status || 'pending'}
                  </span>
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                type="button"
                onClick={handleRefresh}
                disabled={checking}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529C] to-[#003B7A] px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-900/20 hover:from-[#004785] hover:to-[#002D62] transition disabled:opacity-60"
              >
                <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                <span>{checking ? 'Memeriksa...' : 'Cek Status Persetujuan'}</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={loggingOut}
                className="flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100/80 active:scale-[0.99] transition disabled:opacity-60"
              >
                <LogOut size={14} />
                <span>{loggingOut ? 'Mengeluarkan...' : 'Keluar dari Akun'}</span>
              </button>
            </div>

            <div className="mt-8 border-t border-slate-100 pt-4 text-[11px] text-slate-400">
              <UserCheck className="mr-1 inline size-3.5 text-emerald-500" />
              Keamanan Data Perbankan · Kebijakan Akses Berbasis Role (RBAC) & RLS
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PendingApprovalPage
