import { useState, useMemo } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  LoaderCircle,
  Lock,
  Mail,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useAuth } from '../../context/useAuth'
import BrandWordmark from '../../components/BrandWordmark'

function RegisterPage({ onNavigate }) {
  const { signUp, isConfigured } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [jenisRm, setJenisRm] = useState('RMFT')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: 'Belum diisi', color: 'bg-slate-200' }
    let score = 0
    if (password.length >= 6) score += 1
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1

    if (score <= 1) return { score: 1, label: 'Lemah (min. 6 karakter)', color: 'bg-rose-500' }
    if (score <= 2) return { score: 2, label: 'Cukup Aman', color: 'bg-amber-500' }
    return { score: 3, label: 'Kuat', color: 'bg-emerald-500' }
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

    if (!jenisRm || !['RMFT', 'RMSME'].includes(jenisRm)) {
      setError('Pilih jenis spesialisasi Relationship Manager (RMFT atau RMSME).')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setError('Format email tidak valid (contoh: nama@bri.co.id).')
      return
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.')
      return
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }

    setLoading(true)
    try {
      await signUp(cleanEmail, password, cleanFullName, jenisRm)
      setSuccess(true)
    } catch (err) {
      console.error('Pendaftaran gagal:', err)
      const msg = err.message || ''
      if (msg.includes('User already registered')) {
        setError('Alamat email ini sudah terdaftar. Silakan masuk ke akun Anda.')
      } else if (msg.toLowerCase().includes('rate limit')) {
        setError('Batas pengiriman email terlampaui. Tunggu beberapa saat lalu coba lagi.')
      } else {
        setError(msg || 'Pendaftaran gagal. Periksa koneksi internet lalu coba lagi.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page flex min-h-screen items-center justify-center p-3 sm:p-6">
      <div className="auth-card p-4 sm:p-8">
        {success ? (
          <div className="py-4 text-center">
            <div className="mb-4">
              <BrandWordmark className="text-2xl" />
            </div>
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={32} />
            </div>
            <h1 className="mt-4 text-lg font-bold text-slate-900">
              Pendaftaran Berhasil
            </h1>
            <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
              Akun untuk <strong className="text-slate-800">{email}</strong> telah terdaftar.
            </p>

            <div className="my-4 rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-left text-xs text-blue-900">
              <div className="flex items-start gap-2">
                <ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#00529b]" />
                <p className="text-[11px] leading-relaxed">
                  Akun berstatus <b>Menunggu Persetujuan</b>. Hubungi Administrator untuk mengaktifkan akun Anda.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="button-primary !min-h-[44px] w-full"
            >
              <span>Lanjut ke Halaman Masuk</span>
              <ArrowRight size={14} />
            </button>
          </div>
        ) : (
          <div>
            {/* Brand Header */}
            <div className="text-center pb-4 border-b border-slate-100">
              <BrandWordmark className="text-2xl" />
              <p className="mt-1 text-xs text-slate-500">
                Bank BRI KCP Iskandar Palembang
              </p>
              <h1 className="mt-3 text-lg font-bold text-slate-900">
                Daftar Akun RM
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Pendaftaran akun Relationship Manager
              </p>
            </div>

            {/* Concise notice */}
            <div className="mt-3.5 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-2.5 text-xs text-blue-900">
              <Info size={14} className="mt-0.5 shrink-0 text-[#00529b]" />
              <p className="text-[11px] leading-relaxed">
                Akun baru memiliki peran RM dan memerlukan persetujuan Admin sebelum dapat digunakan.
              </p>
            </div>

            {error && (
              <div
                className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Nama Lengkap</span>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Ahmad Fauzi"
                    required
                    maxLength={150}
                    className="form-control !pl-10 text-xs"
                  />
                </div>
              </label>

              {/* Pilihan Jenis RM (Wajib) */}
              <div>
                <span className="block text-xs font-semibold text-slate-700">
                  Jenis Relationship Manager <span className="text-rose-500">*</span>
                </span>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  Pilih divisi penugasan spesialisasi Anda di Bank BRI.
                </p>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <label
                    className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition-all ${
                      jenisRm === 'RMFT'
                        ? 'border-[#00529b] bg-[#f0f6fc] shadow-[0_0_0_1px_#00529b]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenisRm"
                      value="RMFT"
                      checked={jenisRm === 'RMFT'}
                      onChange={() => setJenisRm('RMFT')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">RMFT</span>
                      <span
                        className={`size-3.5 rounded-full border flex items-center justify-center ${
                          jenisRm === 'RMFT'
                            ? 'border-[#00529b] bg-[#00529b]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {jenisRm === 'RMFT' && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <span className="mt-0.5 text-[10.5px] font-semibold text-[#00529b]">
                      Funding & Transaction
                    </span>
                    <span className="mt-1 text-[10px] leading-tight text-slate-500">
                      Penghimpunan dana, CASA, giro, deposito, & transaksi
                    </span>
                  </label>

                  <label
                    className={`relative flex cursor-pointer flex-col rounded-lg border p-3 transition-all ${
                      jenisRm === 'RMSME'
                        ? 'border-[#00529b] bg-[#f0f6fc] shadow-[0_0_0_1px_#00529b]'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="jenisRm"
                      value="RMSME"
                      checked={jenisRm === 'RMSME'}
                      onChange={() => setJenisRm('RMSME')}
                      className="sr-only"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">RMSME</span>
                      <span
                        className={`size-3.5 rounded-full border flex items-center justify-center ${
                          jenisRm === 'RMSME'
                            ? 'border-[#00529b] bg-[#00529b]'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {jenisRm === 'RMSME' && <span className="size-1.5 rounded-full bg-white" />}
                      </span>
                    </div>
                    <span className="mt-0.5 text-[10.5px] font-semibold text-[#00529b]">
                      Small Medium Enterprise
                    </span>
                    <span className="mt-1 text-[10px] leading-tight text-slate-500">
                      Penyaluran kredit & pembiayaan sektor usaha UMKM
                    </span>
                  </label>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-semibold text-slate-700">Alamat Email</span>
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

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Kata Sandi</span>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      required
                      autoComplete="new-password"
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

                <label className="block">
                  <span className="text-xs font-semibold text-slate-700">Konfirmasi Sandi</span>
                  <div className="relative mt-1">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ulangi kata sandi"
                      required
                      autoComplete="new-password"
                      className="form-control !pl-10 text-xs"
                    />
                  </div>
                </label>
              </div>

              {password.length > 0 && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>Kekuatan sandi: <b className="text-slate-700">{passwordStrength.label}</b></span>
                  {passwordsMatch && (
                    <span className="font-semibold text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Cocok
                    </span>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isConfigured}
                className="button-primary !min-h-[44px] w-full mt-2"
              >
                {loading ? (
                  <>
                    <LoaderCircle size={15} className="animate-spin text-white" />
                    <span>Mendaftarkan...</span>
                  </>
                ) : (
                  <>
                    <span>Daftar Akun</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 border-t border-slate-100 pt-3.5 text-center">
              <p className="text-xs text-slate-600">
                Sudah memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="font-bold text-[#00529b] hover:underline"
                >
                  Masuk di sini
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RegisterPage
