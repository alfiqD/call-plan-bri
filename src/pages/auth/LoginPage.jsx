import { useState } from 'react'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  Lock,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import BrandWordmark from '../../components/BrandWordmark'

function LoginPage({ onNavigate }) {
  const { signIn } = useAuth()
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
    <div className="auth-page flex min-h-screen items-center justify-center p-3 sm:p-6">
      <div className="auth-card p-4 sm:p-8">
        {/* Brand Header */}
        <div className="text-center pb-5 border-b border-slate-100">
          <BrandWordmark className="text-2xl" />
          <p className="mt-1 text-xs text-slate-500">
            Bank BRI KCP Iskandar Palembang
          </p>
          <h1 className="mt-4 text-lg font-bold text-slate-900">
            Masuk ke e-VisitBRI
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Sistem Monitoring Kunjungan Nasabah
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800"
            role="alert"
          >
            <ShieldAlert size={14} className="mt-0.5 shrink-0 text-rose-600" />
            <p className="text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Email</span>
            <div className="relative mt-1">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@bri.co.id"
                required
                autoComplete="email"
                className="form-control !pl-10 text-xs"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-slate-700">Kata Sandi</span>
            <div className="relative mt-1">
              <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="form-control !pl-10 !pr-10 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex size-7 items-center justify-center rounded text-slate-400 hover:text-slate-600 transition"
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="size-3.5 rounded border-slate-300 text-[#00529b] focus:ring-[#00529b]"
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
            disabled={loading}
            className="button-primary !min-h-[44px] w-full mt-2"
          >
            {loading ? (
              <>
                <LoaderCircle size={15} className="animate-spin text-white" />
                <span>Memverifikasi...</span>
              </>
            ) : (
              <>
                <span>Masuk</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 border-t border-slate-100 pt-4 text-center">
          <p className="text-xs text-slate-600">
            Belum memiliki akun?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="font-bold text-[#00529b] hover:underline"
            >
              Daftar Akun
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
