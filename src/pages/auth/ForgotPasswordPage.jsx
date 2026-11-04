import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  KeyRound,
  LoaderCircle,
  Mail,
  Shield,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'

function ForgotPasswordPage({ onNavigate }) {
  const { resetPassword, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email) {
      setError('Masukkan alamat email akun Anda.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      setSent(true)
    } catch (err) {
      console.error('Reset password error:', err)
      setError(err.message || 'Gagal mengirim email reset kata sandi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#001736] via-[#002D62] to-[#004785] p-4 sm:p-6 lg:p-8 selection:bg-[#f37021] selection:text-white">
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

      <div className="relative z-10 w-full max-w-4xl overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-2xl shadow-[#001736]/60 backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Showcase */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#002046] via-[#003875] to-[#00529C] p-8 text-white lg:col-span-5 lg:p-10">
            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="relative flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white shadow-inner backdrop-blur-md ring-1 ring-white/25">
                  <Compass size={26} strokeWidth={2.3} className="text-white" />
                  <span className="absolute -bottom-0.5 right-1 size-2.5 rounded-full bg-[#f37021] ring-2 ring-[#002046]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-white">
                      Call<span className="text-[#f37021]">Plan</span>
                    </span>
                    <span className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">
                      BRI
                    </span>
                  </div>
                  <p className="text-[11px] font-medium text-blue-100">
                    KCP Iskandar Palembang
                  </p>
                </div>
              </div>

              <div className="mt-8 lg:mt-12">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-blue-100 backdrop-blur-xs ring-1 ring-white/15">
                  <KeyRound size={12} className="text-[#f37021]" />
                  Pemulihan Akses Akun
                </span>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-white lg:text-3xl lg:leading-tight">
                  Atur Ulang Kata Sandi Akun Anda.
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-blue-100/90">
                  Masukkan email terdaftar Anda untuk menerima tautan pemulihan kata sandi demi keamanan operasional perbankan.
                </p>
              </div>
            </div>

            <div className="relative mt-8 border-t border-white/15 pt-5 text-[11px] text-blue-200/90">
              <div className="flex items-center gap-2">
                <Shield size={14} className="shrink-0 text-[#f37021]" />
                <span>Otentikasi Aman Menggunakan Standar Keamanan TLS Supabase</span>
              </div>
            </div>
          </div>

          {/* Right Form */}
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-7">
            {sent ? (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <div className="flex size-18 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/70">
                  <CheckCircle2 size={38} strokeWidth={2.3} />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-900">
                  Tautan Pemulihan Terkirim!
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-600">
                  Instruksi pemulihan kata sandi telah dikirim ke <span className="font-bold text-slate-800">{email}</span>. Periksa kotak masuk atau spam email Anda.
                </p>

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#00529C] to-[#003B7A] py-3 text-xs font-bold text-white shadow-md shadow-blue-900/20 hover:from-[#004785] hover:to-[#002D62] transition"
                >
                  <ArrowLeft size={15} />
                  <span>Kembali ke Halaman Masuk</span>
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">
                      Lupa Kata Sandi?
                    </h1>
                    <p className="text-xs text-slate-500">
                      Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="flex items-center gap-1 text-xs font-bold text-[#00529C] hover:text-[#f37021] transition"
                  >
                    <ArrowLeft size={14} />
                    <span>Masuk</span>
                  </button>
                </div>

                {error && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0 text-rose-600" />
                    <p className="text-[11px] leading-relaxed">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Email Akun Terdaftar</span>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rm.nama@bri.co.id"
                        required
                        autoComplete="email"
                        className="form-control !pl-11 !pr-4 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15"
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    disabled={loading || !isConfigured}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f37021] to-[#e0590d] py-3 text-xs font-bold text-white shadow-lg shadow-[#f37021]/25 hover:from-[#ff7a00] hover:to-[#e55302] active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin text-white" />
                        Mengirim Tautan...
                      </>
                    ) : (
                      <>
                        <span>Kirim Tautan Pemulihan</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
                  >
                    <ArrowLeft size={14} /> Kembali ke Halaman Masuk
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage
