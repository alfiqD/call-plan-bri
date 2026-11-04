import { useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Compass,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  Zap,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'

function LoginPage({ onNavigate }) {
  const { signIn, signInDemo, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    if (!email || !password) {
      setError('Email dan kata sandi wajib diisi.')
      return
    }

    setLoading(true)
    try {
      await signIn(email, password, rememberMe)
    } catch (err) {
      console.error('Login gagal:', err)
      const msg = err.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError('Email atau kata sandi tidak sesuai. Periksa kembali data login Anda.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Email belum dikonfirmasi. Periksa kotak masuk atau folder spam email Anda.')
      } else {
        setError(msg || 'Gagal masuk. Periksa koneksi internet lalu coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = async (role) => {
    setError('')
    setDemoLoading(role)
    try {
      await new Promise((r) => setTimeout(r, 200))
      signInDemo(role)
    } catch (err) {
      console.error('Demo login error:', err)
      setError('Gagal masuk mode demo. Silakan coba lagi.')
    } finally {
      setDemoLoading('')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#001736] via-[#002D62] to-[#004785] p-4 sm:p-6 lg:p-8 selection:bg-[#f37021] selection:text-white">
      {/* Decorative Background Geometric Shapes & Gradients */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-48 -top-48 size-96 rounded-full bg-[#00529C]/30 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 size-96 rounded-full bg-[#f37021]/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 size-80 -translate-x-1/2 rounded-full bg-[#002D62]/40 blur-2xl" />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      {/* Main Split-Screen Container Card */}
      <div className="relative z-10 w-full max-w-5xl overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-2xl shadow-[#001736]/60 backdrop-blur-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12">
          {/* Left Showcase Panel (BRI Corporate Branding & System Highlights) */}
          <div className="relative flex flex-col justify-between overflow-hidden bg-gradient-to-br from-[#002046] via-[#003875] to-[#00529C] p-8 text-white lg:col-span-5 lg:p-10">
            {/* Ambient Accent inside Left Panel */}
            <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-[#f37021]/20 blur-2xl" />
            <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#00529C]/40 blur-2xl" />

            {/* Top Brand Identity */}
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

              {/* Headline & Value Proposition */}
              <div className="mt-8 lg:mt-12">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-blue-100 backdrop-blur-xs ring-1 ring-white/15">
                  <span className="size-1.5 rounded-full bg-[#f37021]" />
                  Portal Internal Monitoring Nasabah
                </span>
                <h2 className="mt-4 text-2xl font-black tracking-tight text-white lg:text-3xl lg:leading-tight">
                  Perencanaan & Monitoring Kunjungan Terpadu.
                </h2>
                <p className="mt-3 text-xs leading-relaxed text-blue-100/90 lg:text-[13px]">
                  Tingkatkan efektivitas Relationship Manager dalam pembinaan, retensi, serta akuisisi nasabah Bank BRI dengan jadwal cerdas dan geotagging akurat.
                </p>
              </div>

              {/* 3 Core System Features */}
              <div className="mt-8 space-y-3.5">
                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xs ring-1 ring-white/10 transition hover:bg-white/15">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#00529C]/80 text-[#f37021] shadow-xs">
                    <CalendarDays size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Agenda & Rute Kunjungan Fleksibel</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-blue-100/80">
                      Jadwal terorganisir lengkap dengan rute optimal dan navigasi maps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xs ring-1 ring-white/10 transition hover:bg-white/15">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#00529C]/80 text-emerald-400 shadow-xs">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Geotagging & Check-in GPS</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-blue-100/80">
                      Validasi kehadiran lapangan otomatis dengan radius lokasi presisi.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-white/10 p-3 backdrop-blur-xs ring-1 ring-white/10 transition hover:bg-white/15">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#00529C]/80 text-amber-300 shadow-xs">
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">Keamanan Standar Perbankan</h3>
                    <p className="mt-0.5 text-[11px] leading-snug text-blue-100/80">
                      Hak akses berbasis peran (RBAC), Row Level Security & Audit Log.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Compliance & Security Seal */}
            <div className="relative mt-8 border-t border-white/15 pt-5 text-[11px] text-blue-200/90">
              <div className="flex items-center gap-2">
                <Shield size={14} className="shrink-0 text-[#f37021]" />
                <span>PT Bank Rakyat Indonesia (Persero) Tbk · Berizin & Diawasi OJK</span>
              </div>
            </div>
          </div>

          {/* Right Form Panel (Login Credentials & Quick Demo) */}
          <div className="flex flex-col justify-between p-7 sm:p-10 lg:col-span-7">
            <div>
              {/* Header inside Form Panel */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-[#00529C]">
                    <span className="size-1.5 rounded-full bg-[#00529C]" />
                    Portal Masuk Internal
                  </div>
                  <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-900">
                    Masuk ke Akun Anda
                  </h1>
                  <p className="text-xs text-slate-500">
                    Gunakan email korporat atau kredensial yang telah disetujui.
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <span className="block text-[11px] font-bold text-[#00529C]">Bank BRI</span>
                  <span className="block text-[10px] text-slate-400">Unit Palembang</span>
                </div>
              </div>

              {/* Quick Demo Access Shortcuts */}
              <div className="mt-5 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-orange-50/40 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                    <Zap size={13} className="text-[#f37021]" />
                    Akses Cepat Mode Demo:
                  </span>
                  <span className="text-[10px] font-medium text-slate-400">1-Klik Langsung Masuk</span>
                </div>
                <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleQuickDemo('rm')}
                    disabled={Boolean(demoLoading) || loading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-[#00529C] shadow-xs hover:border-[#00529C] hover:bg-blue-50/50 active:scale-[0.99] transition disabled:opacity-50"
                  >
                    {demoLoading === 'rm' ? (
                      <LoaderCircle size={14} className="animate-spin text-[#00529C]" />
                    ) : (
                      <User size={14} className="text-[#00529C]" />
                    )}
                    <span>Masuk sebagai RM (Ahmad)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickDemo('admin')}
                    disabled={Boolean(demoLoading) || loading}
                    className="flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 shadow-xs hover:border-amber-400 hover:bg-amber-50/50 active:scale-[0.99] transition disabled:opacity-50"
                  >
                    {demoLoading === 'admin' ? (
                      <LoaderCircle size={14} className="animate-spin text-amber-700" />
                    ) : (
                      <Shield size={14} className="text-amber-600" />
                    )}
                    <span>Masuk sebagai Admin</span>
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-5 text-center text-xs text-slate-400">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200" />
                </div>
                <span className="relative bg-white px-3 text-[11px] font-medium text-slate-500">
                  atau masuk dengan akun terdaftar
                </span>
              </div>

              {/* Supabase Status Alert (if not configured) */}
              {!isConfigured && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex items-start gap-2">
                    <ShieldAlert size={15} className="mt-0.5 shrink-0 text-amber-600" />
                    <p className="text-[11px] leading-relaxed">
                      Mode Demo lokal aktif. Anda dapat langsung masuk menggunakan tombol <b>Akses Cepat Demo</b> di atas.
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div
                  className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
                  role="alert"
                >
                  <ShieldAlert size={15} className="mt-0.5 shrink-0 text-rose-600" />
                  <p className="text-[11px] leading-relaxed">{error}</p>
                </div>
              )}

              {/* Form Controls */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Email Akun / Korporat</span>
                  <div className="relative mt-1">
                    <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="rm.ahmad@bri.co.id"
                      required
                      autoComplete="email"
                      className="form-control !pl-11 !pr-4 text-xs font-medium focus:border-[#00529C] focus:ring-2 focus:ring-[#00529C]/15"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="text-xs font-bold text-slate-700">Kata Sandi</span>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
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

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded border-slate-300 text-[#00529C] focus:ring-[#00529C]"
                    />
                    <span>Ingat saya</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => onNavigate('forgot-password')}
                    className="text-xs font-semibold text-[#00529C] hover:text-[#f37021] hover:underline transition"
                  >
                    Lupa kata sandi?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading || Boolean(demoLoading)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#f37021] to-[#e0590d] py-3 text-xs font-bold text-white shadow-lg shadow-[#f37021]/25 hover:from-[#ff7a00] hover:to-[#e55302] active:scale-[0.99] transition disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin text-white" />
                      Memverifikasi Akun...
                    </>
                  ) : (
                    <>
                      <span>Masuk Sekarang</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Footer with Register Switcher & Security Assurance */}
            <div className="mt-8 border-t border-slate-100 pt-5 text-center">
              <p className="text-xs text-slate-600">
                Belum memiliki akun Relationship Manager?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('register')}
                  className="font-bold text-[#00529C] hover:text-[#f37021] hover:underline transition"
                >
                  Daftar Akun RM Baru
                </button>
              </p>
              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-slate-400">
                <CheckCircle2 size={13} className="text-emerald-500" />
                <span>Dilindungi Enkripsi TLS 256-bit & Otentikasi Supabase</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
