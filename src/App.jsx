import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import AppShell from './components/AppShell'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { isSupabaseConfigured, supabase } from './services/supabase'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import PendingApprovalPage from './pages/auth/PendingApprovalPage'
import {
  deleteAppointment as deleteAppointmentRequest,
  deleteCustomer as deleteCustomerRequest,
  fetchAppointments,
  fetchCustomers,
  mapAppointmentFromDb,
  mapCustomerFromDb,
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
const adminOnlyPages = ['admin-users', 'audit-log']

function MainWorkspace() {
  const { user, profile, isApproved, isAdmin, isRM, role } = useAuth()
  const [workspace, setWorkspace] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [backendError, setBackendError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // Build a safe currentUser object for passing into service calls (audit attribution, RLS)
  // Identity is always sourced from Supabase session – never from frontend inputs
  const currentUser = useMemo(() => ({
    id: user?.id || null,
    email: user?.email || null,
    nama: profile?.nama || user?.email?.split('@')[0] || 'Pengguna',
    role: profile?.role || 'rm',
  }), [user?.id, user?.email, profile?.nama, profile?.role])

  const effectivePage = (adminOnlyPages.includes(activePage) && !isAdmin) ? 'dashboard' : activePage
  const Page = pages[effectivePage] || DashboardPage

  const isFetchingRef = useRef(false)
  const debounceTimerRef = useRef(null)
  const lastFocusFetchRef = useRef(0)

  const reloadWorkspaceSilent = useCallback(async () => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      const filterUser = isAdmin ? null : { id: user?.id, role: profile?.role || 'rm' }
      const [customers, appointments, followUps] = await Promise.all([
        fetchCustomers(),
        fetchAppointments(filterUser),
        fetchFollowUps(filterUser),
      ])
      setWorkspace({ customers, appointments, followUps: followUps || [] })
    } catch (err) {
      console.warn('Gagal memuat ulang data di latar belakang:', err)
    } finally {
      isFetchingRef.current = false
    }
  }, [isAdmin, user, profile])

  const scheduleDebouncedReload = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      reloadWorkspaceSilent()
    }, 250)
  }, [reloadWorkspaceSilent])

  const handleNavigate = useCallback((targetPage) => {
    if (adminOnlyPages.includes(targetPage) && !isAdmin) {
      setToast('Akses ditolak: Halaman ini hanya dapat diakses oleh Administrator.')
      setActivePage('dashboard')
      return
    }
    setActivePage(targetPage)
  }, [isAdmin])

  useEffect(() => {
    let isActive = true

    const loadWorkspace = async () => {
      setIsLoading(true)
      setBackendError('')
      try {
        // Nasabah are shared by approved RMs within this branch app; RLS enforces the same scope in Supabase.
        const filterUser = isAdmin ? null : { id: user?.id, role: profile?.role || 'rm' }
        const [customers, appointments, followUps] = await Promise.all([
          fetchCustomers(),
          fetchAppointments(filterUser),
          fetchFollowUps(filterUser),
        ])
        if (isActive) setWorkspace({ customers, appointments, followUps: followUps || [] })
      } catch (error) {
        console.error('Gagal memuat data Call Plan.', error)
        if (isActive) {
          setBackendError(error instanceof Error ? error.message : 'Data e-VisitBRI gagal dimuat.')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadWorkspace()
    return () => {
      isActive = false
    }
  }, [reloadKey, user?.id, isAdmin, profile?.role])

  // Realtime subscription & focus refetch untuk jadwal kunjungan & nasabah (monitoring terpusat)
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !user?.id) return undefined

    let isSubscribed = true
    const channelName = `realtime-workspace-${user.id}-${Date.now()}`

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jadwal_kunjungans',
        },
        (payload) => {
          if (!isSubscribed) return

          // Optimistic local update untuk event UPDATE instan
          if (payload.eventType === 'UPDATE' && payload.new) {
            const mapped = mapAppointmentFromDb(payload.new)
            setWorkspace((current) => {
              if (!current?.appointments) return current
              const exists = current.appointments.some((a) => String(a.id) === String(mapped.id))
              if (isAdmin) {
                return {
                  ...current,
                  appointments: exists
                    ? current.appointments.map((a) => String(a.id) === String(mapped.id) ? mapped : a)
                    : [...current.appointments, mapped],
                }
              }
              // Untuk RM: hanya jika jadwal milik RM yang bersangkutan
              if (mapped.rmId === user.id || !mapped.rmId) {
                return {
                  ...current,
                  appointments: exists
                    ? current.appointments.map((a) => String(a.id) === String(mapped.id) ? mapped : a)
                    : [...current.appointments, mapped],
                }
              }
              // Jika jadwal dipindahkan dari RM ini ke RM lain:
              return {
                ...current,
                appointments: current.appointments.filter((a) => String(a.id) !== String(mapped.id)),
              }
            })
          }

          // Sinkronisasi penuh secara debounced
          if (isAdmin) {
            scheduleDebouncedReload()
          } else {
            const newRmId = payload.new?.rm_id
            const oldRmId = payload.old?.rm_id
            const isRelevant = !newRmId || newRmId === user.id || oldRmId === user.id
            if (isRelevant) {
              scheduleDebouncedReload()
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'nasabahs',
        },
        (payload) => {
          if (!isSubscribed) return

          // Optimistic update pada tabel nasabah (status monitoring terpusat)
          if (payload.eventType === 'UPDATE' && payload.new) {
            const mapped = mapCustomerFromDb(payload.new)
            setWorkspace((current) => {
              if (!current?.customers) return current
              const exists = current.customers.some((c) => String(c.id) === String(mapped.id))
              return {
                ...current,
                customers: exists
                  ? current.customers.map((c) => String(c.id) === String(mapped.id) ? { ...c, ...mapped } : c)
                  : [mapped, ...current.customers],
              }
            })
          } else if (payload.eventType === 'INSERT' && payload.new) {
            const mapped = mapCustomerFromDb(payload.new)
            setWorkspace((current) => {
              if (!current?.customers) return current
              const exists = current.customers.some((c) => String(c.id) === String(mapped.id))
              if (exists) return current
              return {
                ...current,
                customers: [mapped, ...current.customers],
              }
            })
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setWorkspace((current) => {
              if (!current?.customers) return current
              return {
                ...current,
                customers: current.customers.filter((c) => String(c.id) !== String(payload.old.id)),
              }
            })
          }

          // Trigger sinkronisasi penuh debounced untuk menjamin seluruh data relasional sinkron
          scheduleDebouncedReload()
        }
      )
      .subscribe()

    // Refetch otomatis saat browser/tab kembali aktif/fokus
    const handleFocusOrVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        const now = Date.now()
        if (now - lastFocusFetchRef.current > 6000) {
          lastFocusFetchRef.current = now
          scheduleDebouncedReload()
        }
      }
    }

    window.addEventListener('focus', handleFocusOrVisible)
    document.addEventListener('visibilitychange', handleFocusOrVisible)

    return () => {
      isSubscribed = false
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
      window.removeEventListener('focus', handleFocusOrVisible)
      document.removeEventListener('visibilitychange', handleFocusOrVisible)
      supabase.removeChannel(channel)
    }
  }, [user?.id, isAdmin, scheduleDebouncedReload])

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
      {backendError ? (
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-rose-200 bg-white p-6 text-center shadow-xs">
          <p className="text-sm font-bold text-slate-900">Koneksi Database Belum Tersedia</p>
          <p className="mt-2 text-xs leading-5 text-rose-700" role="alert">{backendError}</p>
          <button onClick={() => setReloadKey((current) => current + 1)} className="button-primary mx-auto mt-4">
            <RefreshCw size={14} /> Coba lagi
          </button>
        </div>
      ) : isLoading || !workspace ? (
        <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
          <LoaderCircle className="mr-2 size-5 animate-spin" />Memuat data e-VisitBRI...
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
            currentUserId={currentUser.id}
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
  const { user, profile, isApproved, isLoading } = useAuth()
  const [authView, setAuthView] = useState('login')

  if (isLoading || (user && !profile)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#002347] text-white">
        <div className="text-center">
          <LoaderCircle className="mx-auto size-8 animate-spin text-[#f37021]" />
          <p className="mt-3 text-sm font-semibold tracking-wide">Memuat e-VisitBRI...</p>
        </div>
      </div>
    )
  }

  // If user is not logged in:
  if (!user) {
    if (authView === 'register') return <RegisterPage onNavigate={setAuthView} />
    if (authView === 'forgot-password') return <ForgotPasswordPage onNavigate={setAuthView} />
    return <LoginPage onNavigate={setAuthView} />
  }

  // If user is logged in, but not approved yet:
  if (!isApproved) {
    return <PendingApprovalPage />
  }

  // Authenticated & Approved workspace
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
