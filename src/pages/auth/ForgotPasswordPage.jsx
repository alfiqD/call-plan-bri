import { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  Mail,
  ShieldAlert,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import BrandWordmark from '../../components/BrandWordmark'

function ForgotPasswordPage({ onNavigate }) {
  const { resetPassword } = useAuth()
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
      setError(err.message || 'Gagal mengirim email pemulihan kata sandi.')
    } finally {
      setLoading(false)
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
          <h1 className="mt-3 text-lg font-bold text-slate-900">
            {sent ? 'Tautan Terkirim' : 'Lupa Kata Sandi'}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {sent
              ? 'Periksa kotak masuk atau spam email Anda'
              : 'Masukkan email untuk mengatur ulang kata sandi'}
          </p>
        </div>

        {sent ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <p className="mt-4 text-xs text-slate-600 leading-relaxed">
              Tautan pemulihan kata sandi telah dikirim ke <strong className="text-slate-800">{email}</strong>.
            </p>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="button-primary !min-h-[44px] w-full mt-5"
            >
              <ArrowLeft size={14} />
              <span>Kembali ke Halaman Masuk</span>
            </button>
          </div>
        ) : (
          <div className="mt-4">
            {error && (
              <div
                className="mb-3 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800"
                role="alert"
              >
                <ShieldAlert size={14} className="mt-0.5 shrink-0 text-rose-600" />
                <p className="text-[11px] leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Email Akun</span>
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

              <button
                type="submit"
                disabled={loading}
                className="button-primary !min-h-[44px] w-full mt-2"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin text-white" />
                    <span>Mengirim...</span>
                  </>
                ) : (
                  <span>Kirim Tautan Pemulihan</span>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-3.5 text-center">
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#00529b] hover:underline"
              >
                <ArrowLeft size={13} />
                <span>Kembali ke Halaman Masuk</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ForgotPasswordPage
