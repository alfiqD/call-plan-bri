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
  onSaveFollowUp,
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
      {/* Top Header Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Jadwal Kunjungan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Perencanaan agenda dan rute kunjungan nasabah Bank BRI KCP Iskandar Palembang
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'appointment' })}
          className="button-orange w-fit self-start sm:self-auto"
        >
          <Plus size={15} /> Buat Jadwal
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
          {actionError}
        </div>
      )}

      {/* Toolbar: Month Navigation, Status Filter, View Toggle */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
              aria-label="Bulan sebelumnya"
            >
              <ArrowLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date(`${today}T00:00:00`)
                setMonth(now)
                setSelectedDate(today)
              }}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 transition"
              aria-label="Bulan berikutnya"
            >
              <ArrowRight size={16} />
            </button>
          </div>
          <h3 className="ml-1 text-sm font-bold text-slate-900">
            {new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(month)}
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control h-8 min-w-36 appearance-none pr-8 text-xs font-medium"
              aria-label="Filter status kunjungan"
            >
              {['Semua status', 'Terjadwal', 'Selesai', 'Reschedule', 'Tidak ditemui'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                view === 'calendar'
                  ? 'bg-white text-[#00529b] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded px-3 py-1 text-xs font-semibold transition ${
                view === 'list'
                  ? 'bg-white text-[#00529b] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar
            </button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.8fr)]">
        {/* Main Schedule Container */}
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          {view === 'calendar' ? (
            <>
              {/* Day Headers */}
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div className="py-2.5" key={day}>{day}</div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="grid grid-cols-7">
                {calendarCells.map(({ date, key, inMonth }) => {
                  const dayAppointments = appointmentsForDate(key)
                  const selected = selectedDate === key
                  const isToday = key === today
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      className={`min-h-[75px] border-b border-r border-slate-100 p-1.5 text-left transition sm:min-h-[90px] sm:p-2 ${
                        !inMonth ? 'bg-slate-50/40 text-slate-300' : 'text-slate-700'
                      } ${
                        selected
                          ? 'bg-[#eaf3fb]/60 ring-1 ring-inset ring-[#00529b]'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-[#00529b] text-white font-bold' : ''
                      }`}>
                        {date.getDate()}
                      </span>
                      <div className="mt-1 space-y-1">
                        {dayAppointments.slice(0, 2).map((appointment) => {
                          const cust = getCustomer(customers, appointment.customerId)
                          const statusBg = appointment.status === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-700'
                            : appointment.status === 'Reschedule'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-blue-50 text-[#00529b]'
                          return (
                            <div
                              key={appointment.id}
                              className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${statusBg}`}
                            >
                              <span className="font-bold">{appointment.time} </span>
                              {cust?.name || 'Nasabah'}
                            </div>
                          )
                        })}
                        {dayAppointments.length > 2 && (
                          <span className="block px-1 text-[9px] text-slate-400 font-medium">
                            +{dayAppointments.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Agenda Terpilih di Bawah Kalender */}
              <div className="border-t border-slate-200">
                <div className="flex items-center justify-between bg-slate-50/50 px-5 py-3 border-b border-slate-100">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Agenda: {formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {filteredAppointments.length} agenda pada tanggal ini
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'appointment', date: selectedDate })}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Plus size={13} /> Tambah Agenda
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredAppointments.length > 0 ? (
                    filteredAppointments.map((appointment) => {
                      const customer = getCustomer(customers, appointment.customerId)
                      return (
                        <AppointmentRow
                          key={appointment.id}
                          appointment={appointment}
                          customer={customer}
                          onMap={() => showCustomerMap(customer)}
                          onEdit={() => setModal({ type: 'appointment', appointment })}
                          onVisit={() => setModal({ type: 'visit', appointment })}
                          onDelete={() => deleteAppointment(appointment)}
                        />
                      )
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      Tidak ada agenda kunjungan pada tanggal ini.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* List View */
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Daftar Jadwal Kunjungan</h3>
                  <p className="text-[11px] text-slate-500">{filteredAppointments.length} agenda ditemukan</p>
                </div>
                <CalendarDays size={16} className="text-slate-400" />
              </div>
              {filteredAppointments.length > 0 ? (
                filteredAppointments.map((appointment) => {
                  const customer = getCustomer(customers, appointment.customerId)
                  return (
                    <AppointmentRow
                      key={appointment.id}
                      appointment={appointment}
                      customer={customer}
                      onMap={() => showCustomerMap(customer)}
                      onEdit={() => setModal({ type: 'appointment', appointment })}
                      onVisit={() => setModal({ type: 'visit', appointment })}
                      onDelete={() => deleteAppointment(appointment)}
                    />
                  )
                })
              ) : (
                <div className="py-12 text-center text-xs text-slate-400">
                  Tidak ada jadwal yang cocok dengan filter yang dipilih.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Sidebar Widget: Pengingat & Prioritas */}
        <aside className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Pengingat Terdekat
                </h4>
                <p className="text-[11px] text-slate-400">Agenda yang belum dikunjungi</p>
              </div>
              <AlarmClock size={16} className="text-amber-600" />
            </div>

            <div className="mt-3 space-y-2.5">
              {upcoming.length > 0 ? (
                upcoming.map((appointment) => {
                  const customer = getCustomer(customers, appointment.customerId)
                  const isToday = appointment.date === today
                  return (
                    <div key={appointment.id} className="rounded-lg border border-slate-100 p-2.5 hover:bg-slate-50/70 transition">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {customer?.name || 'Nasabah dihapus'}
                        </p>
                        {appointment.priority === 'Tinggi' && (
                          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-600 border border-rose-200">
                            Prio
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500">
                        <Clock3 className="mr-1 inline size-3 text-slate-400" />
                        {isToday ? 'Hari Ini' : formatDate(appointment.date, { day: 'numeric', month: 'short' })} · {appointment.time}
                      </p>
                      {customer?.address && (
                        <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-400 line-clamp-1">
                          <MapPin className="mt-0.5 size-3 shrink-0" />
                          {customer.address}
                        </p>
                      )}
                      {customer?.address && (
                        <button
                          type="button"
                          onClick={() => showCustomerMap(customer)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-semibold text-[#00529b] hover:underline"
                        >
                          <Navigation size={10} /> Lihat Rute & Peta
                        </button>
                      )}
                    </div>
                  )
                })
              ) : (
                <p className="py-4 text-center text-xs text-slate-400">Tidak ada pengingat aktif.</p>
              )}
            </div>
          </section>

          {/* Tips Info Card */}
          <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-[#003b70]">
            <div className="flex items-center gap-2 font-bold text-[#00529b]">
              <Route size={15} />
              <span>Prioritas Kunjungan Lapangan</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-600">
              Check-in dapat dilakukan setelah tiba di lokasi nasabah. Data check-in GPS otomatis tervalidasi dalam radius radius bank.
            </p>
            <div className="mt-3 flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-rose-500" /> Prioritas Tinggi
              </span>
              <span className="flex items-center gap-1">
                <span className="size-2 rounded-full bg-[#00529b]" /> Normal
              </span>
            </div>
          </section>
        </aside>
      </div>

      {/* Modals */}
      {modal?.type === 'appointment' && (
        <AppointmentForm
          customers={customers}
          appointment={modal.appointment}
          date={modal.date}
          onClose={() => setModal(null)}
          onSubmit={saveAppointment}
        />
      )}
      {modal?.type === 'visit' && (
        <VisitUpdateModal
          appointment={modal.appointment}
          customer={getCustomer(customers, modal.appointment.customerId)}
          onClose={() => setModal(null)}
          onSubmit={saveVisit}
          onScheduleFollowUp={onSaveFollowUp}
        />
      )}
      {modal?.type === 'map' && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 text-sm text-white">Memuat peta...</div>}>
          <RouteMapModal customer={modal.customer} onClose={() => setModal(null)} />
        </Suspense>
      )}
    </>
  )
}

function AppointmentRow({ appointment, customer, onMap, onEdit, onVisit, onDelete }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 transition">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-12 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-slate-700">
          {appointment.time}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-900">
              {customer?.name || 'Nasabah dihapus'}
            </span>
            <StatusBadge status={appointment.status} />
            {appointment.priority === 'Tinggi' && (
              <span className="rounded bg-rose-50 px-1.5 py-0.2 text-[9px] font-bold text-rose-600 border border-rose-200">
                Prio
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 truncate">
            {appointment.purpose}
            {customer?.address && (
              <>
                <span className="mx-1 text-slate-300">·</span>
                <MapPin className="mb-0.5 inline size-3 text-slate-400" /> {customer.address}
              </>
            )}
          </p>
          {customer?.address && (
            <button
              type="button"
              onClick={onMap}
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-[#00529b] hover:underline"
            >
              <Navigation size={10} /> Peta Lokasi
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-1.5 shrink-0">
        {appointment.status === 'Terjadwal' && (
          <button
            type="button"
            onClick={onVisit}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-[#00529b] shadow-xs hover:bg-[#eaf3fb] hover:border-[#00529b] transition"
          >
            Check-in
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          title="Ubah Jadwal"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Hapus Jadwal"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  )
}

export default SchedulePage
