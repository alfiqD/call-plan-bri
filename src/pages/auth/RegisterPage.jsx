import { useState, useMemo } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  User,
  UserCheck,
} from 'lucide-react'
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

  // Password strength evaluation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Belum diisi', color: 'bg-slate-200' }
    let score = 0
    if (password.length >= 6) score += 1
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score <= 1) return { score: 1, label: 'Lemah (min. 6 karakter)', color: 'bg-rose-500' }
    if (score <= 3) return { score: 2, label: 'Cukup Aman', color: 'bg-amber-500' }
    return { score: 3, label: 'Sangat Kuat & Aman', color: 'bg-emerald-500' }
  }, [password])

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const cleanEmail = email.trim().toLowerCase()
    const cleanFullName = fullName.trim()

    if (!cleanFullName || !cleanEmail || !password || !confirmPassword) {
      setError('Semua kolom formulir pendaftaran wajib diisi.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid. Pastikan format email benar (contoh: nama@bri.co.id).')
      return
    }

    if (password.length < 6) {
      setError('Kata sandi minimal harus 6 karakter demi standar keamanan perbankan.')
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
        setError('Alamat email ini sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.')
      } else if (msg.toLowerCase().includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
        setError('Batas pengiriman email Supabase terlampaui. Tunggu beberapa saat sebelum mencoba kembali.')
      } else if (msg.toLowerCase().includes('invalid') && msg.toLowerCase().includes('email')) {
        setError('Email ini ditolak oleh server autentikasi. Pastikan menggunakan format email aktif yang valid.')
      } else {
        setError(msg || 'Pendaftaran gagal. Periksa koneksi internet lalu coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page relative flex min-h-screen items-center justify-center p-4 sm:p-6 lg:p-8 selection:bg-[#f37021] selection:text-white">
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

      {/* Main Container Card */}
      <div className="auth-card relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-2xl shadow-[#001736]/60 backdrop-blur-xl">
        <div className="grid grid-cols-1 xl:grid-cols-12">
          {/* Left Showcase Panel */}
          <div className="auth-showcase relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#002046] via-[#003875] to-[#00529C] p-8 text-white xl:col-span-5 xl:p-10">
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-[#f37021]/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00529C]/40 blur-2xl" />

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
                  <span className="size-1.5 rounded-full bg-[#f37021]" />
                  Pendaftaran Petugas RM
                </span>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-white lg:text-3xl lg:leading-tight">
                  Bergabung ke Portal Call Plan Bank BRI.
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-blue-100/90 lg:text-[13px]">
                  Daftarkan diri Anda sebagai Relationship Manager untuk mulai mencatat debitur, merencanakan jadwal kunjungan, serta memantau tindak lanjut secara real-time.
                </p>
              </div>

              {/* Onboarding Highlights */}
              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xs ring-1 ring-white/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#00529C]/80 text-[#f37021]">
                    <UserCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Verifikasi Akun Otomatis</h3>
                    <p className="mt-0.5 text-[11px] text-blue-100/80">
                      Akun baru terhubung dengan skema otorisasi dan persetujuan Admin Cabang.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xs ring-1 ring-white/10">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#00529C]/80 text-emerald-400">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Unit Kerja Terintegrasi</h3>
                    <p className="mt-0.5 text-[11px] text-blue-100/80">
                      Terhubung langsung ke basis data debitur KCP Iskandar Palembang.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative mt-8 border-t border-white/15 pt-5 text-[11px] text-blue-200/90">
              <div className="flex items-center gap-2">
                <Shield size={14} className="shrink-0 text-[#f37021]" />
                <span>Kepatuhan Standar Perbankan & Privasi Data Nasabah</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel */}
          <div className="auth-form-panel flex flex-col justify-between p-7 sm:p-10 xl:col-span-7">
            {success ? (
              <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/70">
                  <CheckCircle2 size={42} strokeWidth={2.3} />
                </div>
                <span className="mt-4 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  Registrasi Sukses
                </span>
                <h2 className="mt-2 text-2xl font-black text-slate-900">
                  Pendaftaran Berhasil!
                </h2>
                <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-600">
                  Akun untuk <span className="font-bold text-slate-800">{email}</span> telah dibuat di sistem Call Plan Bank BRI.
                </p>

                {/* Account Details Box */}
                <div className="my-6 w-full max-w-sm rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-left text-xs">
                  <div className="flex items-start gap-2.5">
                    <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#00529C]" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">Tahap Verifikasi Admin Cabang</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
                        Demi kepatuhan data nasabah perbankan, akun baru otomatis berstatus <b>Menunggu Persetujuan</b>. Silakan hubungi Administrator KCP Iskandar Palembang untuk mengaktifkan akses.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f37021] to-[#e0590d] py-3 text-xs font-bold text-white shadow-lg shadow-[#f37021]/25 hover:from-[#ff7a00] hover:to-[#e55302] transition"
                >
                  <span>Lanjut ke Halaman Masuk</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            ) : (
              <div>
                {/* Header inside Form */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#00529C]">
                      <span className="size-1.5 rounded-full bg-[#00529C]" />
                      Registrasi Akun Baru
                    </div>
                    <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">
                      Daftar Akun RM
                    </h1>
                    <p className="text-xs text-slate-500">
                      Lengkapi data untuk mendaftar sebagai Relationship Manager.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="flex items-center gap-1 text-xs font-bold text-[#00529C] hover:text-[#f37021] transition"
                  >
                    <ArrowLeft size={14} />
                    <span className="hidden sm:inline">Masuk</span>
                  </button>
                </div>

                {/* Banking Policy Notice */}
                <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900">
                  <Info size={16} className="mt-0.5 shrink-0 text-[#00529C]" />
                  <p className="text-[11px] leading-relaxed text-blue-950">
                    Akun baru otomatis ditetapkan dengan role <b>Relationship Manager (RM)</b> dan membutuhkan persetujuan Administrator sebelum akses penuh diberikan.
                  </p>
                </div>

                {/* Error Box */}
                {error && (
                  <div
                    className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                    role="alert"
                  >
                    <ShieldCheck size={15} className="mt-0.5 shrink-0 text-rose-600" />
                    <p className="text-[11px] leading-relaxed">{error}</p>
                  </div>
                )}

                {/* Register Form */}
                <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Nama Lengkap</span>
                    <div className="relative mt-1">
                      <User className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Contoh: Ahmad Fauzi"
                        required
                        maxLength={150}
                        className="form-control !pl-11 !pr-4 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15"
                      />
                    </div>
                  </label>

                  <label className="block">
                    <span className="text-xs font-bold text-slate-700">Alamat Email Dinas / Pribadi</span>
                    <div className="relative mt-1">
                      <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nama.lengkap@bri.co.id"
                        required
                        autoComplete="email"
                        className="form-control !pl-11 !pr-4 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15"
                      />
                    </div>
                  </label>

                  <div className="block">
                    <span className="text-xs font-bold text-slate-700">Unit Kerja / Cabang Penugasan</span>
                    <div className="relative mt-1 flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 size={16} className="shrink-0 text-[#00529C]" />
                        <span className="truncate font-semibold text-slate-900">Bank BRI KCP Iskandar Palembang</span>
                      </div>
                      <span className="shrink-0 rounded bg-blue-100/70 px-2 py-0.5 text-[10px] font-bold text-[#00529C]">
                        Cabang Utama
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="flex items-center justify-between h-5">
                        <span className="text-xs font-bold text-slate-700">Kata Sandi</span>
                      </div>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min. 6 karakter"
                          required
                          autoComplete="new-password"
                          className="form-control !pl-11 !pr-11 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                          aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </label>

                    <label className="block">
                      <div className="flex items-center justify-between h-5">
                        <span className="text-xs font-bold text-slate-700">Konfirmasi Sandi</span>
                        {passwordsMatch && (
                          <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5">
                            <CheckCircle2 size={11} /> Cocok
                          </span>
                        )}
                      </div>
                      <div className="relative mt-1">
                        <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi kata sandi"
                          required
                          autoComplete="new-password"
                          className={`form-control !pl-11 !pr-4 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15 ${
                            confirmPassword.length > 0 && !passwordsMatch ? 'border-rose-400' : ''
                          }`}
                        />
                      </div>
                    </label>
                  </div>

                  {/* Password Strength Indicator */}
                  {password.length > 0 && (
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-[11px]">
                      <div className="flex items-center justify-between text-slate-600">
                        <span>Kekuatan Kata Sandi:</span>
                        <span className="font-bold text-slate-800">{passwordStrength.label}</span>
                      </div>
                      <div className="mt-1.5 flex gap-1.5">
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'}`} />
                        <div className={`h-1.5 flex-1 rounded-full transition-colors ${passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'}`} />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !isConfigured}
                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f37021] to-[#e0590d] py-3 text-xs font-bold text-white shadow-lg shadow-[#f37021]/25 hover:from-[#ff7a00] hover:to-[#e55302] active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <LoaderCircle size={16} className="animate-spin text-white" />
                        Mendaftarkan Akun RM...
                      </>
                    ) : (
                      <>
                        <span>Daftar Sekarang</span>
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Switcher */}
                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                  <p className="text-xs text-slate-600">
                    Sudah memiliki akun terdaftar?{' '}
                    <button
                      type="button"
                      onClick={() => onNavigate('login')}
                      className="font-bold text-[#00529C] hover:text-[#f37021] hover:underline transition"
                    >
                      Masuk di sini
                    </button>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage
