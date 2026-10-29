import { useState } from 'react'
import { ArrowLeft, CheckCircle2, Compass, LoaderCircle, Mail } from 'lucide-react'
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
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">Tautan Terkirim!</h2>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                Instruksi reset kata sandi telah dikirim ke <span className="font-semibold text-slate-800">{email}</span>. Periksa kotak masuk atau spam email Anda.
              </p>
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
              <div className="mb-6">
                <h2 className="text-lg font-bold text-slate-900">Lupa Kata Sandi?</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Masukkan email akun Anda. Kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
                </p>
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <label className="form-label">
                  Email Akun
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

                <button
                  type="submit"
                  disabled={loading || !isConfigured}
                  className="button-orange w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <LoaderCircle size={15} className="animate-spin" />
                      Mengirim Tautan...
                    </>
                  ) : (
                    'Kirim Tautan Reset'
                  )}
                </button>
              </form>
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

export default ForgotPasswordPage
