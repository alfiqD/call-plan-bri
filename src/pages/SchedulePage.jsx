import { lazy, Suspense, useMemo, useState } from 'react'
import {
  AlarmClock,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  Clock3,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import AppointmentForm from '../components/AppointmentForm'
import StatusBadge from '../components/StatusBadge'
import VisitUpdateModal from '../components/VisitUpdateModal'
import { formatDate, getAppointmentDateTime, getCustomer, localDateKey } from '../data/workspace'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))

function SchedulePage({
  customers = [],
  appointments = [],
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
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00529b]/70">
            KCP Iskandar Palembang
          </p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
            Jadwal Kunjungan
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Agenda dan kalender kunjungan nasabah
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal({ type: 'appointment' })}
          className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:self-auto"
        >
          <Plus size={15} /> Buat Jadwal
        </button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
          {actionError}
        </div>
      )}

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-[#00529b]"
              aria-label="Bulan sebelumnya"
            >
              <ArrowLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date(`${today}T00:00:00`)
                setMonth(now)
                setSelectedDate(today)
              }}
              className="rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-[#00529b]"
            >
              Hari Ini
            </button>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-50 hover:text-[#00529b]"
              aria-label="Bulan berikutnya"
            >
              <ArrowRight size={15} />
            </button>
          </div>
          <h3 className="ml-1 text-[13px] font-bold tracking-tight text-slate-900 sm:text-sm">
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
              {['Semua status', 'Terjadwal', 'Execute', 'Selesai', 'Reschedule', 'Tidak ditemui', 'Dibatalkan'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-semibold transition-all ${view === 'calendar'
                  ? 'bg-white text-[#00529b] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Kalender
            </button>
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-[6px] px-3 py-1.5 text-[11.5px] font-semibold transition-all ${view === 'list'
                  ? 'bg-white text-[#00529b] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              Daftar
            </button>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.8fr)_minmax(280px,.8fr)]">
        {/* ── Main Schedule Container ─────────────────────────────── */}
        <section className="schedule-calendar overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          {view === 'calendar' ? (
            <>
              {/* Day Headers */}
              <div className="schedule-calendar-weekdays grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/60 text-center text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((day) => (
                  <div className="py-2.5" key={day}>{day}</div>
                ))}
              </div>

              {/* Month Grid */}
              <div className="schedule-calendar-days grid grid-cols-7">
                {calendarCells.map(({ date, key, inMonth }) => {
                  const dayAppointments = appointmentsForDate(key)
                  const selected = selectedDate === key
                  const isToday = key === today
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(key)}
                      aria-label={`${formatDate(key, { day: 'numeric', month: 'long', year: 'numeric' })}, ${dayAppointments.length} agenda`}
                      className={`group min-h-[56px] border-b border-r border-slate-100 p-1 text-left transition sm:min-h-[88px] sm:p-2 ${!inMonth ? 'bg-slate-50/40 text-slate-300' : 'text-slate-700'
                        } ${selected
                          ? 'bg-[#eaf3fb]/60 ring-1 ring-inset ring-[#00529b]'
                          : 'hover:bg-[#f9fbfe]'
                        }`}
                    >
                      <span
                        className={`inline-flex size-5 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums sm:size-5.5 sm:text-xs ${isToday
                            ? 'bg-[#00529b] font-bold text-white shadow-[0_1px_2px_rgba(0,82,155,0.35)]'
                            : selected && inMonth
                              ? 'font-bold text-[#00529b]'
                              : ''
                          }`}
                      >
                        {date.getDate()}
                      </span>
                      <div className="mt-1 hidden space-y-1 sm:block">
                        {dayAppointments.slice(0, 2).map((appointment) => {
                          const cust = getCustomer(customers, appointment.customerId)
                          const statusBg = appointment.status === 'Selesai'
                            ? 'bg-emerald-50 text-emerald-700'
                            : appointment.status === 'Execute'
                              ? 'bg-indigo-50 text-indigo-700'
                              : appointment.status === 'Reschedule'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-blue-50 text-[#00529b]'
                          return (
                            <div
                              key={appointment.id}
                              className={`truncate rounded px-1 py-0.5 text-[9px] font-medium ${statusBg}`}
                            >
                              <span className="font-bold tabular-nums">{appointment.time} </span>
                              {cust?.name || 'Nasabah'}
                            </div>
                          )
                        })}
                        {dayAppointments.length > 2 && (
                          <span className="block px-1 text-[9px] font-medium text-slate-400">
                            +{dayAppointments.length - 2} lainnya
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected Day Agenda */}
              <div className="schedule-calendar-selected-day border-t border-slate-200/80">
                <div className="flex flex-col gap-2 border-b border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2.5">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[#00529b]">
                      <CalendarDays size={14} strokeWidth={2.2} />
                    </span>
                    <div>
                      <h4 className="text-[13px] font-bold tracking-tight text-slate-900">
                        Agenda: {formatDate(selectedDate, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {filteredAppointments.length} agenda pada tanggal ini
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'appointment', date: selectedDate })}
                    className="inline-flex items-center gap-1 self-start rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] sm:self-auto"
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
                    <div className="flex flex-col items-center gap-1.5 py-8 text-center">
                      <CalendarDays size={20} className="text-slate-300" />
                      <p className="text-[11.5px] text-slate-400">Tidak ada agenda kunjungan pada tanggal ini.</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* ── List View ─────────────────────────────────────── */
            <div className="divide-y divide-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-5 py-3">
                <div className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[#00529b]">
                    <CalendarDays size={14} strokeWidth={2.2} />
                  </span>
                  <div>
                    <h3 className="text-[13px] font-bold tracking-tight text-slate-900">Daftar Jadwal Kunjungan</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">{filteredAppointments.length} agenda ditemukan</p>
                  </div>
                </div>
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
                <div className="flex flex-col items-center gap-1.5 py-12 text-center">
                  <CalendarDays size={22} className="text-slate-300" />
                  <p className="text-[11.5px] text-slate-400">Tidak ada jadwal yang sesuai dengan filter.</p>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Sidebar Widget: Pengingat & Info ────────────────────── */}
        <aside className="space-y-4">
          <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex items-start justify-between border-b border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-4 py-3">
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-amber-200/70 bg-amber-50 text-amber-600">
                  <AlarmClock size={14} strokeWidth={2.2} />
                </span>
                <div>
                  <h4 className="text-[13px] font-bold tracking-tight text-slate-900">Pengingat Terdekat</h4>
                  <p className="mt-0.5 text-[11px] text-slate-500">Jadwal yang belum dilaksanakan</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {upcoming.length > 0 ? (
                upcoming.map((appointment) => {
                  const customer = getCustomer(customers, appointment.customerId)
                  const isToday = appointment.date === today
                  return (
                    <div key={appointment.id} className="px-4 py-2.5 transition hover:bg-[#f9fbfe]">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-[12px] font-semibold text-slate-900">
                          {customer?.name || 'Nasabah dihapus'}
                        </p>
                        {appointment.priority === 'Tinggi' && (
                          <span className="shrink-0 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600">
                            Prio
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock3 size={11} className="text-slate-400" />
                        <span>
                          {isToday ? (
                            <span className="font-semibold text-[#00529b]">Hari Ini</span>
                          ) : (
                            formatDate(appointment.date, { day: 'numeric', month: 'short' })
                          )}
                          <span className="mx-1 text-slate-300">·</span>
                          <span className="tabular-nums">{appointment.time}</span>
                        </span>
                      </p>
                      {customer?.address && (
                        <p className="mt-0.5 flex items-start gap-1 text-[10px] text-slate-400">
                          <MapPin size={10} className="mt-0.5 shrink-0" />
                          <span className="line-clamp-1">{customer.address}</span>
                        </p>
                      )}
                    </div>
                  )
                })
              ) : (
                <div className="flex flex-col items-center gap-1 py-6 text-center">
                  <AlarmClock size={18} className="text-slate-300" />
                  <p className="text-[11px] text-slate-400">Tidak ada pengingat aktif.</p>
                </div>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* ── Modals (tidak diubah) ──────────────────────────────────── */}
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
        <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 text-xs text-white">Memuat peta...</div>}>
          <RouteMapModal customer={modal.customer} onClose={() => setModal(null)} />
        </Suspense>
      )}
    </div>
  )
}

function AppointmentRow({ appointment, customer, onMap, onEdit, onVisit, onDelete }) {
  return (
    <div className="flex flex-col justify-between gap-3 px-4 py-3.5 transition hover:bg-[#f9fbfe] sm:flex-row sm:items-center sm:px-5">
      <div className="flex min-w-0 items-start gap-3">
        <div className="w-12 shrink-0 pt-0.5 text-center">
          <span className="inline-flex rounded-md border border-[#00529b]/15 bg-[#eaf3fb] px-1.5 py-0.5 font-mono text-[11px] font-bold tabular-nums text-[#00529b]">
            {appointment.time}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-semibold text-slate-900">
              {customer?.name || 'Nasabah dihapus'}
            </span>
            <StatusBadge status={appointment.status} />
            {appointment.priority === 'Tinggi' && (
              <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600">
                Prio
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
            {appointment.purpose}
            {customer?.address && (
              <>
                <span className="mx-1 text-slate-300">·</span>
                <MapPin className="mb-0.5 inline size-3 text-slate-400" /> {customer.address}
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-1.5 sm:w-auto sm:shrink-0">
        <button
          type="button"
          onClick={onVisit}
          className="inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#00529b] px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:flex-none"
        >
          {appointment.status === 'Terjadwal' ? 'Check-in' : 'Hasil'}
        </button>
        {customer?.address && (
          <button
            type="button"
            onClick={onMap}
            title="Peta Lokasi"
            className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
            aria-label="Peta Lokasi"
          >
            <Navigation size={15} />
          </button>
        )}
        <button
          type="button"
          onClick={onEdit}
          title="Ubah Jadwal"
          className="flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
          aria-label="Ubah Jadwal"
        >
          <Pencil size={15} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title="Hapus Jadwal"
          className="flex size-10 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:bg-rose-50"
          aria-label="Hapus Jadwal"
        >
          <Trash2 size={15} />
        </button>
      </div>
    </div>
  )
}

export default SchedulePage