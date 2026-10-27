import { lazy, Suspense, useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  MoreHorizontal,
  Navigation,
  Pencil,
  Plus,
  Route,
  Trash2,
} from 'lucide-react'
import AppointmentForm from '../components/AppointmentForm'
import StatusBadge from '../components/StatusBadge'
import VisitUpdateModal from '../components/VisitUpdateModal'
import { formatDate, getAppointmentDateTime, getCustomer, localDateKey } from '../data/workspace'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))

function SchedulePage({
  customers,
  appointments,
  onSaveAppointment,
  onDeleteAppointment,
  onSaveVisit,
  onNotify,
}) {
  const today = localDateKey()
  const [view, setView] = useState('calendar')
  const [month, setMonth] = useState(() => new Date(`${today}T00:00:00`))
  const [selectedDate, setSelectedDate] = useState(today)
  const [statusFilter, setStatusFilter] = useState('Semua status')
  const [modal, setModal] = useState(null)
  const [actionError, setActionError] = useState('')

  const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
  const monthAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.date.startsWith(monthKey))
    .sort((first, second) => `${first.date}${first.time}`.localeCompare(`${second.date}${second.time}`)),
  [appointments, monthKey])
  const filteredAppointments = monthAppointments.filter((appointment) => (
    (view === 'calendar' ? appointment.date === selectedDate : true)
    && (statusFilter === 'Semua status' || appointment.status === statusFilter)
  ))
  const upcoming = appointments
    .filter((appointment) => appointment.status === 'Terjadwal' && getAppointmentDateTime(appointment) >= new Date())
    .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second))
    .slice(0, 4)

  const calendarCells = (() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(firstDay)
    start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start)
      date.setDate(start.getDate() + index)
      return { date, key: localDateKey(date), inMonth: date.getMonth() === month.getMonth() }
    })
  })()

  const changeMonth = (direction) => {
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + direction, 1)
    setMonth(nextMonth)
    setSelectedDate(localDateKey(nextMonth))
  }

  const saveAppointment = async (appointment) => {
    const savedAppointment = await onSaveAppointment(appointment)
    setModal(null)
    setActionError('')
    onNotify('Jadwal kunjungan berhasil disimpan.')
    return savedAppointment
  }

  const saveVisit = async (appointment) => {
    await onSaveVisit(appointment)
    setModal(null)
    onNotify('Hasil kunjungan berhasil diperbarui.')
  }

  const deleteAppointment = async (appointment) => {
    if (!window.confirm('Hapus jadwal kunjungan ini?')) return
    setActionError('')
    try {
      await onDeleteAppointment(appointment.id)
      onNotify('Jadwal kunjungan telah dihapus.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Jadwal gagal dihapus.')
    }
  }

  const appointmentsForDate = (key) => monthAppointments.filter((appointment) => appointment.date === key)
  const showCustomerMap = (customer) => {
    if (customer) setModal({ type: 'map', customer })
  }

  return (
    <>
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs text-slate-500">Rencanakan waktu, lokasi, dan prioritas kunjungan nasabah.</p><p className="mt-2 text-[11px] text-slate-400">Pengingat agenda berikutnya ditampilkan otomatis di panel rute.</p></div>
        <button onClick={() => setModal({ type: 'appointment' })} className="button-primary w-fit"><Plus size={16} /> Buat jadwal</button>
      </div>
      {actionError && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">{actionError}</p>}

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm shadow-slate-200/30 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan sebelumnya"><ArrowLeft size={15} /></button>
            <button onClick={() => setMonth(new Date(`${today}T00:00:00`))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">Hari ini</button>
            <button onClick={() => changeMonth(1)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Bulan berikutnya"><ArrowRight size={15} /></button>
          </div>
          <h2 className="ml-1 text-sm font-bold text-slate-900">{new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month)}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <span className="sr-only">Filter status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-control h-9 min-w-36 appearance-none pr-8 text-[11px]">
              {['Semua status', 'Terjadwal', 'Selesai', 'Reschedule', 'Tidak ditemui'].map((status) => <option key={status}>{status}</option>)}
            </select><ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          </label>
          <div className="flex rounded-lg bg-slate-100 p-1">
            <button onClick={() => setView('calendar')} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${view === 'calendar' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Kalender</button>
            <button onClick={() => setView('list')} className={`rounded-md px-3 py-1.5 text-[10px] font-semibold ${view === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}>Daftar</button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
          {view === 'calendar' ? (
            <>
              <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/70 text-center text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:text-[10px]">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => <div className="py-3" key={day}>{day}</div>)}
              </div>
              <div className="grid grid-cols-7">
                {calendarCells.map(({ date, key, inMonth }) => {
                  const dayAppointments = appointmentsForDate(key)
                  const selected = selectedDate === key
                  return (
                    <button key={key} onClick={() => setSelectedDate(key)} className={`calendar-cell min-h-[76px] border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-[100px] sm:p-2 ${!inMonth ? 'bg-slate-50/50 text-slate-300' : 'text-slate-700'} ${selected ? 'bg-indigo-50/70 ring-1 ring-inset ring-indigo-300' : 'hover:bg-slate-50'}`}>
                      <span className={`flex size-6 items-center justify-center rounded-full text-[10px] font-semibold sm:size-7 sm:text-[11px] ${key === today ? 'bg-indigo-600 text-white' : ''}`}>{date.getDate()}</span>
                      <div className="mt-1 space-y-1">
                        {dayAppointments.slice(0, 2).map((appointment) => <div key={appointment.id} className={`truncate rounded px-1 py-0.5 text-[8px] font-medium sm:px-1.5 sm:text-[9px] ${appointment.status === 'Selesai' ? 'bg-emerald-50 text-emerald-700' : appointment.status === 'Reschedule' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'}`}><span className="hidden sm:inline">{appointment.time} </span>{getCustomer(customers, appointment.customerId)?.name || 'Nasabah'}</div>)}
                        {dayAppointments.length > 2 && <span className="block px-1 text-[8px] text-slate-400 sm:text-[9px]">+{dayAppointments.length - 2} lainnya</span>}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[10px] text-slate-400 sm:px-5">
                <span><span className="mr-1.5 inline-block size-2 rounded-full bg-indigo-600" />Hari ini <span className="mx-2">·</span> Pilih tanggal untuk melihat agendanya</span>
                <span>{monthAppointments.length} jadwal bulan ini</span>
              </div>
            </>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-4"><div><h3 className="text-sm font-bold text-slate-900">Daftar jadwal</h3><p className="mt-1 text-[11px] text-slate-400">{monthAppointments.length} agenda bulan ini</p></div><CalendarDays size={18} className="text-slate-400" /></div>
              {filteredAppointments.map((appointment) => {
                const customer = getCustomer(customers, appointment.customerId)
                return <AppointmentRow key={appointment.id} appointment={appointment} customer={customer} onMap={() => showCustomerMap(customer)} onEdit={() => setModal({ type: 'appointment', appointment })} onVisit={() => setModal({ type: 'visit', appointment })} onDelete={() => deleteAppointment(appointment)} />
              })}
              {!filteredAppointments.length && <div className="px-6 py-12 text-center text-xs text-slate-400">Tidak ada jadwal yang cocok untuk filter ini.</div>}
            </div>
          )}

          {view === 'calendar' && (
            <div className="border-t border-slate-100">
              <div className="flex items-center justify-between px-5 py-4">
                <div><h3 className="text-sm font-bold text-slate-900">Agenda terpilih</h3><p className="mt-1 text-[11px] text-slate-400">{formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
                <button onClick={() => setModal({ type: 'appointment', date: selectedDate })} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-2 text-[10px] font-semibold text-slate-600 hover:border-indigo-200 hover:text-indigo-700"><Plus size={13} /> Tambah</button>
              </div>
              {filteredAppointments.length ? filteredAppointments.map((appointment) => {
                const customer = getCustomer(customers, appointment.customerId)
                return <AppointmentRow key={appointment.id} appointment={appointment} customer={customer} onMap={() => showCustomerMap(customer)} onEdit={() => setModal({ type: 'appointment', appointment })} onVisit={() => setModal({ type: 'visit', appointment })} onDelete={() => deleteAppointment(appointment)} />
              }) : <div className="px-6 pb-7 text-center text-xs text-slate-400">Belum ada kunjungan di tanggal ini.</div>}
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30">
            <div className="flex items-start justify-between">
              <div><h3 className="text-sm font-bold text-slate-900">Pengingat berikutnya</h3><p className="mt-1 text-[11px] text-slate-400">Agenda terdekat yang belum dikunjungi</p></div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600"><AlarmClock size={16} /></span>
            </div>
            <div className="mt-4 space-y-3">
              {upcoming.length ? upcoming.map((appointment) => {
                const customer = getCustomer(customers, appointment.customerId)
                const isToday = appointment.date === today
                return <div key={appointment.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-slate-800">{customer?.name || 'Nasabah dihapus'}</p>{appointment.priority === 'Tinggi' && <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[9px] font-semibold text-rose-600">Prioritas</span>}</div>
                  <p className="mt-1.5 text-[10px] text-slate-500"><Clock3 className="mr-1 inline size-3" />{isToday ? 'Hari ini' : formatDate(appointment.date, { day: 'numeric', month: 'short' })} · {appointment.time}</p>
                  <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-4 text-slate-400"><MapPin className="mt-0.5 size-3 shrink-0" />{customer?.address || 'Lokasi tidak tersedia'}</p>
                  {customer?.address && <button type="button" onClick={() => showCustomerMap(customer)} className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"><Navigation size={12} />Lihat peta & buat rute</button>}
                </div>
              }) : <p className="rounded-lg bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-400">Tidak ada pengingat aktif.</p>}
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2.5 text-[10px] leading-4 text-indigo-700"><AlarmClock className="mt-0.5 size-3.5 shrink-0" />Pengingat terlihat di dashboard ini. Pastikan notifikasi perangkat aktif untuk pengingat di luar aplikasi.</div>
          </section>
          <section className="rounded-2xl bg-slate-900 p-5 text-white">
            <div className="flex items-center gap-2"><Route size={17} className="text-indigo-300" /><h3 className="text-sm font-bold">Prioritaskan perjalanan</h3></div>
            <p className="mt-2 text-[11px] leading-5 text-slate-400">Tandai jadwal penting agar agenda lapanganmu lebih mudah diurutkan.</p>
            <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-300"><span className="size-2 rounded-full bg-rose-400" /> Prioritas tinggi <span className="ml-2 size-2 rounded-full bg-blue-400" /> Normal</div>
          </section>
        </aside>
      </div>
      {modal?.type === 'appointment' && <AppointmentForm customers={customers} appointment={modal.appointment} date={modal.date} onClose={() => setModal(null)} onSubmit={saveAppointment} />}
      {modal?.type === 'visit' && <VisitUpdateModal appointment={modal.appointment} customer={getCustomer(customers, modal.appointment.customerId)} onClose={() => setModal(null)} onSubmit={saveVisit} />}
      {modal?.type === 'map' && <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 text-sm text-white">Memuat peta...</div>}><RouteMapModal customer={modal.customer} onClose={() => setModal(null)} /></Suspense>}
    </>
  )
}

function AppointmentRow({ appointment, customer, onMap, onEdit, onVisit, onDelete }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-4 py-3.5 sm:px-5">
      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 text-slate-600"><span className="text-[10px] font-bold">{appointment.time}</span><span className="mt-0.5 text-[8px] text-slate-400">{appointment.priority === 'Tinggi' ? 'PRIO' : 'AGENDA'}</span></div>
      <div className="min-w-[140px] flex-1"><p className="text-xs font-semibold text-slate-800">{customer?.name || 'Nasabah dihapus'}</p><p className="mt-1 text-[10px] text-slate-500">{appointment.purpose} · {formatDate(appointment.date, { day: 'numeric', month: 'short' })}</p><p className="mt-1 flex items-start gap-1 text-[10px] leading-4 text-slate-400"><MapPin size={10} className="mt-0.5 shrink-0" />{customer?.address || 'Lokasi tidak tersedia'}</p>{customer?.address && <button type="button" onClick={onMap} className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"><Navigation size={11} />Lihat peta & buat rute</button>}</div>
      <StatusBadge status={appointment.status} />
      <div className="flex items-center gap-1">
        {appointment.status === 'Terjadwal' && <button onClick={onVisit} className="rounded-lg bg-indigo-50 px-2.5 py-2 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-100">Check-in</button>}
        <button onClick={onEdit} aria-label="Ubah jadwal" className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-indigo-600"><Pencil size={14} /></button>
        <button onClick={onDelete} aria-label="Hapus jadwal" className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button>
        <button aria-label="Opsi lain" className="hidden rounded-lg p-2 text-slate-300 sm:block"><MoreHorizontal size={14} /></button>
      </div>
    </div>
  )
}

export default SchedulePage
