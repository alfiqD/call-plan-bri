import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, RefreshCw, ShieldAlert } from 'lucide-react'
import AppShell from './components/AppShell'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import PendingApprovalPage from './pages/auth/PendingApprovalPage'
import {
  deleteAppointment as deleteAppointmentRequest,
  deleteCustomer as deleteCustomerRequest,
  fetchAppointments,
  fetchCustomers,
  saveAppointment as saveAppointmentRequest,
  saveCustomer as saveCustomerRequest,
} from './services/jadwalKunjungan'
import {
  cancelFollowUp as cancelFollowUpRequest,
  completeFollowUp as completeFollowUpRequest,
  deleteFollowUp as deleteFollowUpRequest,
  fetchFollowUps,
  saveFollowUp as saveFollowUpRequest,
  calculateFollowUpMetrics,
} from './services/followUp'
import { useNotifications } from './hooks/useNotifications'
import { notifyScheduleChange } from './services/notificationService'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const FollowUpPage = lazy(() => import('./pages/FollowUpPage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'))
const AuditLogPage = lazy(() => import('./pages/admin/AuditLogPage'))

const pages = {
  dashboard: DashboardPage,
  customers: CustomersPage,
  schedule: SchedulePage,
  'follow-up': FollowUpPage,
  reports: ReportsPage,
  'admin-users': AdminUsersPage,
  'audit-log': AuditLogPage,
}

function MainWorkspace() {
  const { user, profile, isApproved, isAdmin, isRM, role, isConfigured } = useAuth()
  const [workspace, setWorkspace] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [backendError, setBackendError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [hideNotice, setHideNotice] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  // Build a safe currentUser object for passing into service calls (audit attribution, RLS)
  // Identity is always sourced from Supabase session – never from frontend inputs
  const currentUser = useMemo(() => ({
    id: user?.id || null,
    email: user?.email || null,
    nama: profile?.nama || user?.email?.split('@')[0] || 'Pengguna',
    role: profile?.role || 'rm',
  }), [user?.id, user?.email, profile?.nama, profile?.role])

  const adminOnly = ['admin-users', 'audit-log']
  const effectivePage = (adminOnly.includes(activePage) && !isAdmin) ? 'dashboard' : activePage
  const Page = pages[effectivePage] || DashboardPage

  const handleNavigate = (targetPage) => {
    if (adminOnly.includes(targetPage) && !isAdmin) {
      setToast('Akses ditolak: Halaman ini hanya dapat diakses oleh Administrator.')
      setActivePage('dashboard')
      return
    }
    setActivePage(targetPage)
  }

  useEffect(() => {
    let isActive = true

    const loadWorkspace = async () => {
      setIsLoading(true)
      setBackendError('')
      try {
        // Pass currentUser for RM data isolation in local/mock mode.
        // Supabase RLS enforces isolation server-side based on auth.uid().
        const filterUser = isAdmin ? null : { id: user?.id, role: profile?.role || 'rm' }
        const [customers, appointments, followUps] = await Promise.all([
          fetchCustomers(filterUser),
          fetchAppointments(filterUser),
          fetchFollowUps(filterUser),
        ])
        if (isActive) setWorkspace({ customers, appointments, followUps: followUps || [] })
      } catch (error) {
        console.error('Gagal memuat data Call Plan.', error)
        if (isActive) {
          setBackendError(error instanceof Error ? error.message : 'Data Call Plan gagal dimuat.')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadWorkspace()
    return () => {
      isActive = false
    }
  }, [reloadKey, user?.id])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3500)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const followUps = workspace?.followUps
  const urgentFollowUpCount = useMemo(() => {
    if (!followUps) return 0
    return calculateFollowUpMetrics(followUps).urgentCount
  }, [followUps])

  const notificationState = useNotifications({
    appointments: workspace?.appointments || [],
    followUps: workspace?.followUps || [],
    role,
    onNavigate: handleNavigate,
  })

  const saveCustomer = async (customer) => {
    const savedCustomer = await saveCustomerRequest(customer, currentUser)
    setWorkspace((current) => {
      if (!current) return { customers: [savedCustomer], appointments: [], followUps: [] }
      const exists = current.customers.some((item) => item.id === savedCustomer.id)
      return {
        ...current,
        customers: exists
          ? current.customers.map((item) => item.id === savedCustomer.id ? savedCustomer : item)
          : [savedCustomer, ...current.customers],
      }
    })
    return savedCustomer
  }

  const deleteCustomer = async (customerId) => {
    await deleteCustomerRequest(customerId, currentUser)
    setWorkspace((current) => ({
      ...current,
      customers: current.customers.filter((customer) => customer.id !== customerId),
    }))
  }

  const saveAppointment = async (appointment) => {
    const isUpdate = (workspace?.appointments || []).some((item) => item.id === appointment.id)
    const savedAppointment = await saveAppointmentRequest(appointment, currentUser)
    setWorkspace((current) => {
      if (!current) return { customers: [], appointments: [savedAppointment], followUps: [] }
      const exists = current.appointments.some((item) => item.id === savedAppointment.id)
      return {
        ...current,
        appointments: exists
          ? current.appointments.map((item) => item.id === savedAppointment.id ? savedAppointment : item)
          : [...current.appointments, savedAppointment],
      }
    })
    if (isUpdate) {
      notifyScheduleChange(
        'Jadwal Kunjungan Diperbarui',
        'Jadwal kunjungan Anda telah berhasil disimpan.',
        () => handleNavigate('schedule')
      )
    }
    return savedAppointment
  }

  const saveVisit = async (appointment) => {
    setWorkspace((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointment.id ? appointment : item),
    }))
  }

  const deleteAppointment = async (appointmentId) => {
    await deleteAppointmentRequest(appointmentId, currentUser)
    setWorkspace((current) => ({
      ...current,
      appointments: current.appointments.filter((appointment) => appointment.id !== appointmentId),
    }))
  }

  const saveFollowUp = async (followUp) => {
    const savedFollowUp = await saveFollowUpRequest(followUp, currentUser)
    setWorkspace((current) => {
      if (!current) return { customers: [], appointments: [], followUps: [savedFollowUp] }
      const exists = (current.followUps || []).some((item) => String(item.id) === String(savedFollowUp.id))
      return {
        ...current,
        followUps: exists
          ? current.followUps.map((item) => String(item.id) === String(savedFollowUp.id) ? savedFollowUp : item)
          : [savedFollowUp, ...(current.followUps || [])],
      }
    })
    return savedFollowUp
  }

  const completeFollowUp = async (followUpId, resultNotes) => {
    const updated = await completeFollowUpRequest(followUpId, resultNotes, currentUser)
    setWorkspace((current) => ({
      ...current,
      followUps: (current?.followUps || []).map((item) =>
        String(item.id) === String(followUpId)
          ? (updated || { ...item, status: 'Selesai', resultNotes, completedAt: new Date().toISOString() })
          : item
      ),
    }))
  }

  const cancelFollowUp = async (followUpId) => {
    const updated = await cancelFollowUpRequest(followUpId, currentUser)
    setWorkspace((current) => ({
      ...current,
      followUps: (current?.followUps || []).map((item) =>
        String(item.id) === String(followUpId)
          ? (updated || { ...item, status: 'Dibatalkan' })
          : item
      ),
    }))
  }

  const deleteFollowUp = async (followUpId) => {
    await deleteFollowUpRequest(followUpId, currentUser)
    setWorkspace((current) => ({
      ...current,
      followUps: (current?.followUps || []).filter((item) => String(item.id) !== String(followUpId)),
    }))
  }

  return (
    <AppShell
      activePage={effectivePage}
      onNavigate={handleNavigate}
      urgentFollowUpCount={urgentFollowUpCount}
      notificationState={notificationState}
    >
      {!isConfigured && !hideNotice && (
        <div className="mb-6 flex items-start justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50/80 p-4 text-xs leading-5 text-blue-900 shadow-sm">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-blue-600" />
            <div>
              <p className="font-bold">Mode Mandiri Aktif (Laravel Tidak Diperlukan Lagi)</p>
              <p className="mt-0.5 text-[11px] text-blue-800">
                Aplikasi berjalan mandiri tanpa perlu menyalakan server Laravel. Untuk beralih ke database Supabase PostgreSQL & Auth online, isi <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">VITE_SUPABASE_URL</code> dan <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">VITE_SUPABASE_ANON_KEY</code> pada file <code className="font-mono">.env</code>.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setHideNotice(true)}
            className="rounded-lg px-2 py-0.5 text-sm font-bold text-blue-500 hover:bg-blue-100"
            aria-label="Tutup pemberitahuan"
          >
            ✕
          </button>
        </div>
      )}

      {backendError ? (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-900">Koneksi Database Belum Tersedia</p>
          <p className="mt-2 text-xs leading-5 text-rose-700" role="alert">{backendError}</p>
          <button onClick={() => setReloadKey((current) => current + 1)} className="button-primary mx-auto mt-4">
            <RefreshCw size={14} /> Coba lagi
          </button>
        </div>
      ) : isLoading || !workspace ? (
        <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
          <LoaderCircle className="mr-2 size-5 animate-spin" />Memuat data Call Plan...
        </div>
      ) : (
        <Suspense fallback={<div className="flex min-h-80 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 size-5 animate-spin" />Memuat modul...</div>}>
          <Page
            customers={workspace.customers}
            appointments={workspace.appointments}
            followUps={workspace.followUps || []}
            onSaveCustomer={saveCustomer}
            onDeleteCustomer={deleteCustomer}
            onSaveAppointment={saveAppointment}
            onDeleteAppointment={deleteAppointment}
            onSaveVisit={saveVisit}
            onSaveFollowUp={saveFollowUp}
            onCompleteFollowUp={completeFollowUp}
            onCancelFollowUp={cancelFollowUp}
            onDeleteFollowUp={deleteFollowUp}
            onNotify={setToast}
            onNavigate={handleNavigate}
            isAdmin={isAdmin}
            isRM={isRM}
            role={role}
            isApproved={isApproved}
          />
        </Suspense>
      )}

      {toast && (
        <div className="toast-message" role="status">
          <span className="flex size-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">✓</span>
          {toast}
        </div>
      )}
    </AppShell>
  )
}

function AppContent() {
  const { user, isApproved, isLoading, isConfigured } = useAuth()
  const [authView, setAuthView] = useState('login')

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7fb] text-slate-500">
        <LoaderCircle className="mr-2 size-6 animate-spin text-indigo-600" />
        <span className="text-sm font-semibold">Memeriksa autentikasi...</span>
      </div>
    )
  }

  // If Supabase is configured and user is not logged in:
  if (isConfigured && !user) {
    if (authView === 'register') return <RegisterPage onNavigate={setAuthView} />
    if (authView === 'forgot-password') return <ForgotPasswordPage onNavigate={setAuthView} />
    return <LoginPage onNavigate={setAuthView} />
  }

  // If Supabase is configured and user is logged in, but not approved yet:
  if (isConfigured && user && !isApproved) {
    return <PendingApprovalPage />
  }

  // Authenticated & Approved workspace (or dev preview mode when unconfigured)
  return <MainWorkspace />
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
