import { useState } from 'react'
import { Compass, Eye, EyeOff, LoaderCircle, Lock, Mail, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../context/useAuth'

function LoginPage({ onNavigate }) {
  const { signIn, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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
        setError('Email belum dikonfirmasi. Periksa kotak masuk atau spam email Anda.')
      } else {
        setError(msg || 'Gagal masuk. Periksa koneksi internet lalu coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo and Brand Header */}
        <div className="mb-8 text-center">
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

        {/* Card Box */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs sm:p-9">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">Masuk ke Portal Internal</h2>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan email korporat atau akun yang telah terdaftar.
            </p>
          </div>

          {!isConfigured && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="font-bold">Konfigurasi Supabase Diperlukan</p>
                  <p className="mt-1 text-[11px] text-amber-800">
                    Atur <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">VITE_SUPABASE_URL</code> dan <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">VITE_SUPABASE_ANON_KEY</code> pada file <code className="font-mono">.env</code> untuk mengaktifkan autentikasi cloud.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="form-label">
              Alamat Email
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rm.nama@bri.co.id"
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
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-[#00529b] focus:ring-[#00529b]"
                />
                <span>Ingat saya</span>
              </label>
              <button
                type="button"
                onClick={() => onNavigate('forgot-password')}
                className="text-xs font-semibold text-[#00529b] hover:underline"
              >
                Lupa kata sandi?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !isConfigured}
              className="button-orange w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle size={15} className="animate-spin" />
                  Memverifikasi...
                </>
              ) : (
                'Masuk Sekarang'
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center text-xs text-slate-500">
            Belum memiliki akun?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-bold text-[#00529b] hover:underline"
            >
              Daftar sebagai RM
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-[11px] text-slate-400">
          Dilindungi oleh Supabase Authentication & Row Level Security (RLS)
        </p>
      </div>
    </div>
  )
}

export default LoginPage
