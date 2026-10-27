import { lazy, Suspense, useEffect, useState } from 'react'
import { LoaderCircle, RefreshCw } from 'lucide-react'
import AppShell from './components/AppShell'
import {
  deleteAppointment as deleteAppointmentRequest,
  deleteCustomer as deleteCustomerRequest,
  fetchAppointments,
  fetchCustomers,
  isApiConfigured,
  saveAppointment as saveAppointmentRequest,
  saveCustomer as saveCustomerRequest,
} from './services/jadwalKunjungan'

const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const CustomersPage = lazy(() => import('./pages/CustomersPage'))
const SchedulePage = lazy(() => import('./pages/SchedulePage'))
const ReportsPage = lazy(() => import('./pages/ReportsPage'))

const pages = {
  dashboard: DashboardPage,
  customers: CustomersPage,
  schedule: SchedulePage,
  reports: ReportsPage,
}

function App() {
  const [workspace, setWorkspace] = useState(null)
  const [activePage, setActivePage] = useState('dashboard')
  const [toast, setToast] = useState('')
  const [apiError, setApiError] = useState(
    isApiConfigured() ? '' : 'API Laravel belum dikonfigurasi. Atur VITE_API_BASE_URL pada file .env React.',
  )
  const [isLoading, setIsLoading] = useState(isApiConfigured())
  const [reloadKey, setReloadKey] = useState(0)
  const Page = pages[activePage]

  useEffect(() => {
    if (!isApiConfigured()) return undefined
    let isActive = true

    const loadWorkspace = async () => {
      setIsLoading(true)
      setApiError('')
      try {
        const [customers, appointments] = await Promise.all([
          fetchCustomers(),
          fetchAppointments(),
        ])
        if (isActive) setWorkspace({ customers, appointments })
      } catch (error) {
        console.error('Gagal memuat data Call Plan dari API Laravel.', error)
        if (isActive) {
          setApiError(error instanceof Error ? error.message : 'Data dari API Laravel gagal dimuat.')
        }
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadWorkspace()
    return () => {
      isActive = false
    }
  }, [reloadKey])

  useEffect(() => {
    if (!toast) return undefined
    const timeout = window.setTimeout(() => setToast(''), 3200)
    return () => window.clearTimeout(timeout)
  }, [toast])

  const saveCustomer = async (customer) => {
    const savedCustomer = await saveCustomerRequest(customer)
    setWorkspace((current) => {
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
    await deleteCustomerRequest(customerId)
    setWorkspace((current) => ({
      ...current,
      customers: current.customers.filter((customer) => customer.id !== customerId),
    }))
  }

  const saveAppointment = async (appointment) => {
    const savedAppointment = await saveAppointmentRequest(appointment)
    setWorkspace((current) => {
      const exists = current.appointments.some((item) => item.id === savedAppointment.id)
      return {
        ...current,
        appointments: exists
          ? current.appointments.map((item) => item.id === savedAppointment.id ? savedAppointment : item)
          : [...current.appointments, savedAppointment],
      }
    })
    return savedAppointment
  }

  const saveVisit = async (appointment) => {
    setWorkspace((current) => ({
      ...current,
      appointments: current.appointments.map((item) => item.id === appointment.id ? appointment : item),
    }))
  }

  const deleteAppointment = async (appointmentId) => {
    await deleteAppointmentRequest(appointmentId)
    setWorkspace((current) => ({
      ...current,
      appointments: current.appointments.filter((appointment) => appointment.id !== appointmentId),
    }))
  }

  return (
    <AppShell activePage={activePage} onNavigate={setActivePage}>
      {apiError ? (
        <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-rose-200 bg-white p-6 text-center shadow-sm">
          <p className="text-sm font-bold text-slate-900">Data API belum tersedia</p>
          <p className="mt-2 text-xs leading-5 text-rose-700" role="alert">{apiError}</p>
          <button onClick={() => setReloadKey((current) => current + 1)} className="button-primary mx-auto mt-4">
            <RefreshCw size={14} /> Coba lagi
          </button>
        </div>
      ) : isLoading || !workspace ? (
        <div className="flex min-h-80 items-center justify-center text-sm text-slate-500">
          <LoaderCircle className="mr-2 size-5 animate-spin" />Memuat data dari Laravel...
        </div>
      ) : (
        <Suspense fallback={<div className="flex min-h-80 items-center justify-center text-sm text-slate-500"><LoaderCircle className="mr-2 size-5 animate-spin" />Memuat halaman...</div>}>
          <Page
            customers={workspace.customers}
            appointments={workspace.appointments}
            onSaveCustomer={saveCustomer}
            onDeleteCustomer={deleteCustomer}
            onSaveAppointment={saveAppointment}
            onDeleteAppointment={deleteAppointment}
            onSaveVisit={saveVisit}
            onNotify={setToast}
            onNavigate={setActivePage}
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

export default App
