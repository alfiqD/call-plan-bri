import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Compass, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldCheck, User } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

function RegisterPage({ onNavigate }) {
  const { signUp, isConfigured } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanFullName = fullName.trim()

    if (!cleanFullName || !cleanEmail || !password || !confirmPassword) {
      setError('Semua kolom formulir wajib diisi.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid. Pastikan format email benar (contoh: nama@domain.com).')
      return
    }

    if (password.length < 6) {
      setError('Kata sandi minimal harus 6 karakter demi keamanan.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.')
      return
    }

    setLoading(true)
    try {
      await signUp(cleanEmail, password, cleanFullName)
      setSuccess(true)
    } catch (err) {
      console.error('Pendaftaran gagal:', err)
      const msg = err.message || ''
      if (msg.includes('User already registered')) {
        setError('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.')
      } else if (msg.toLowerCase().includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        setError('Batas pengiriman email Supabase terlampaui. Tunggu beberapa menit, atau matikan opsi "Confirm email" di Supabase Dashboard.')
      } else if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
        setError('Email ini ditolak oleh server autentikasi (format tidak valid atau tidak dapat menerima surat). Pastikan menggunakan email aktif yang valid.')
      } else {
        setError(msg || 'Pendaftaran gagal. Periksa koneksi internet lalu coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="relative mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#00529b] text-white shadow-lg shadow-blue-900/20">
            <Compass size={28} strokeWidth={2.2} />
            <span className="absolute bottom-1.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-[#f37021]" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900">
            Call<span className="text-[#f37021]">Plan</span>
          </h1>
          <p className="mt-1 text-xs font-bold tracking-widest text-[#00529b] uppercase">
            Bank BRI KCP Iskandar Palembang
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs sm:p-9">
          {success ? (
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">Pendaftaran Berhasil!</h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Akun untuk <span className="font-semibold text-slate-800">{email}</span> telah dibuat.
              </p>

              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-left text-xs leading-5 text-indigo-900">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-indigo-600" />
                  <div>
                    <p className="font-bold">Verifikasi & Persetujuan Admin</p>
                    <p className="mt-1 text-[11px] text-indigo-800">
                      Demi mematuhi kebijakan data perbankan, akun baru akan berada dalam status <b>Menunggu Persetujuan</b>. Hubungi Administrator untuk mengaktifkan akun Anda.
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="button-primary mt-6 w-full"
              >
                Kembali ke Halaman Masuk
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">Daftar Akun Baru</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Lengkapi data Anda untuk mendaftar sebagai Relationship Manager.
                </p>
              </div>

              {/* Security info alert */}
              <div className="mb-5 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
                <p className="text-[11px] leading-4">
                  Akun publik akan otomatis memiliki role <b>RM</b> dan status <b>Pending Approval</b> hingga disetujui Admin.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="form-label">
                  Nama Lengkap
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Andi Rahman"
                      required
                      maxLength={150}
                      className="form-control pl-10"
                    />
                  </div>
                </label>

                <label className="form-label">
                  Email Korporat / Pribadi
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="andi.rahman@bri.co.id"
                      required
                      autoComplete="email"
                      className="form-control pl-10"
                    />
                  </div>
                </label>

                <label className="form-label">
                  Kata Sandi
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 6 karakter"
                      required
                      autoComplete="new-password"
                      className="form-control pl-10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <label className="form-label">
                  Konfirmasi Kata Sandi
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      required
                      autoComplete="new-password"
                      className="form-control pl-10"
                    />
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="button-orange mt-2 w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      Mendaftarkan Akun...
                    </>
                  ) : (
                    'Daftar Sekarang'
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="font-bold text-[#00529b] hover:underline"
                >
                  Masuk di sini
                </button>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => onNavigate('login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft size={14} /> Kembali ke Halaman Masuk
          </button>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
