import { useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  Clock3,
  MapPin,
  Plus,
  Route,
  UsersRound,
} from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import VisitUpdateModal from '../components/VisitUpdateModal'
import { formatDate, getAppointmentDateTime, getCustomer, localDateKey } from '../data/workspace'

function DashboardPage({ customers, appointments, onSaveVisit, onNotify, onNavigate }) {
  const [visitAppointment, setVisitAppointment] = useState(null)
  const today = localDateKey()
  const todayAppointments = useMemo(
    () => appointments
      .filter((appointment) => appointment.date === today)
      .sort((first, second) => first.time.localeCompare(second.time)),
    [appointments, today],
  )
  const completed = todayAppointments.filter((appointment) => appointment.status === 'Selesai').length
  const rescheduled = todayAppointments.filter((appointment) => appointment.status === 'Reschedule').length
  const pending = todayAppointments.filter((appointment) => appointment.status === 'Terjadwal').length
  const upcoming = appointments
    .filter((appointment) => appointment.status === 'Terjadwal' && getAppointmentDateTime(appointment) >= new Date())
    .sort((first, second) => getAppointmentDateTime(first) - getAppointmentDateTime(second))
    .slice(0, 3)
  const greeting = new Date().getHours() < 11 ? 'Selamat pagi' : new Date().getHours() < 15 ? 'Selamat siang' : 'Selamat sore'
  const stats = [
    { label: 'Total jadwal hari ini', value: todayAppointments.length, icon: CalendarDays, color: 'blue', note: 'Agenda kunjungan' },
    { label: 'Sudah dikunjungi', value: completed, icon: CalendarCheck2, color: 'green', note: `${todayAppointments.length ? Math.round(completed / todayAppointments.length * 100) : 0}% dari jadwal` },
    { label: 'Perlu dijadwalkan ulang', value: rescheduled, icon: CalendarClock, color: 'amber', note: 'Butuh tindak lanjut' },
  ]

  const saveVisit = async (updatedAppointment) => {
    await onSaveVisit(updatedAppointment)
    setVisitAppointment(null)
    onNotify('Hasil kunjungan berhasil diperbarui.')
  }

  return (
    <>
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-slate-500">{greeting}, Andi <span aria-hidden="true">👋</span></p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Siap untuk kunjungan hari ini?</h2>
          <p className="mt-2 text-xs text-slate-500">{formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} <span className="mx-1.5 text-slate-300">·</span> Cabang Bandung</p>
        </div>
        <button onClick={() => onNavigate('schedule')} className="button-primary w-fit"><Plus size={16} /> Atur call plan</button>
      </div>

      <section className="grid gap-4 md:grid-cols-3" aria-label="Ringkasan kunjungan hari ini">
        {stats.map(({ label, value, icon: Icon, color, note }, index) => (
          <article key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
            <div className="flex items-start justify-between">
              <div className={`flex size-10 items-center justify-center rounded-xl ${color === 'blue' ? 'bg-blue-50 text-blue-600' : color === 'green' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                <Icon size={19} />
              </div>
              <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${index === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                {index === 1 ? <ArrowUpRight size={12} /> : index === 2 ? <ArrowDownRight size={12} /> : <Clock3 size={11} />}
                {index === 1 ? 'Hari ini' : index === 2 ? 'Perhatian' : 'Terencana'}
              </span>
            </div>
            <p className="mt-5 text-[12px] font-medium text-slate-500">{label}</p>
            <div className="mt-1 flex items-end justify-between">
              <p className="text-3xl font-bold tracking-tight text-slate-900">{String(value).padStart(2, '0')}</p>
              <p className="pb-1 text-[10px] text-slate-400">{note}</p>
            </div>
            {index === 1 && <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${todayAppointments.length ? completed / todayAppointments.length * 100 : 0}%` }} /></div>}
          </article>
        ))}
      </section>

      <div className="mt-7 grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(290px,.8fr)]">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Agenda hari ini</h3>
              <p className="mt-1 text-[11px] text-slate-400">{todayAppointments.length} rencana kunjungan</p>
            </div>
            <button onClick={() => onNavigate('schedule')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800">Lihat kalender <ArrowRight size={14} /></button>
          </div>
          <div className="divide-y divide-slate-100">
            {todayAppointments.length ? todayAppointments.map((appointment) => {
              const customer = getCustomer(customers, appointment.customerId)
              return (
                <div key={appointment.id} className="flex gap-3 px-5 py-4 sm:gap-4 sm:px-6">
                  <div className="w-12 shrink-0 pt-0.5 text-xs font-bold tabular-nums text-slate-700">{appointment.time}</div>
                  <div className="relative mt-1 flex w-3 shrink-0 justify-center">
                    <span className={`relative z-10 mt-0.5 size-2.5 rounded-full ring-4 ring-white ${appointment.status === 'Selesai' ? 'bg-emerald-500' : appointment.priority === 'Tinggi' ? 'bg-rose-400' : 'bg-indigo-400'}`} />
                    <span className="absolute top-3 h-full w-px bg-slate-100" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[13px] font-semibold text-slate-800">{customer?.name || 'Nasabah dihapus'}</p>
                      <StatusBadge status={appointment.status} />
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">{appointment.purpose} <span className="mx-1 text-slate-300">·</span> <MapPin className="mb-0.5 inline size-3" /> {customer?.address || 'Lokasi tidak tersedia'}</p>
                  </div>
                  {appointment.status === 'Terjadwal' && (
                    <button onClick={() => setVisitAppointment(appointment)} className="self-center whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] font-semibold text-slate-600 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700">Check-in</button>
                  )}
                </div>
              )
            }) : <div className="px-6 py-12 text-center"><CalendarDays className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada agenda hari ini</p><p className="mt-1 text-xs text-slate-400">Buat jadwal agar rencana kunjunganmu tercatat.</p></div>}
          </div>
          {pending > 0 && <div className="border-t border-indigo-100 bg-indigo-50/70 px-5 py-3 text-[11px] text-indigo-700 sm:px-6"><span className="font-semibold">{pending} agenda</span> masih menunggu check-in · {rescheduled} perlu penjadwalan ulang</div>}
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/30 sm:p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Rute prioritas</h3>
                <p className="mt-1 text-[11px] text-slate-400">Agenda terdekat yang perlu disiapkan</p>
              </div>
              <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><Route size={16} /></span>
            </div>
            <div className="mt-5 space-y-4">
              {upcoming.length ? upcoming.map((appointment, index) => {
                const customer = getCustomer(customers, appointment.customerId)
                return <div key={appointment.id} className="flex gap-3"><span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">{index + 1}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-slate-800">{customer?.name || 'Nasabah dihapus'}</p><p className="mt-1 truncate text-[10px] text-slate-400">{appointment.time} · {customer?.address || 'Lokasi tidak tersedia'}</p></div><MapPin className="mt-1 size-3.5 shrink-0 text-slate-300" /></div>
              }) : <p className="py-3 text-center text-xs text-slate-400">Tidak ada agenda berikutnya.</p>}
            </div>
            <button onClick={() => onNavigate('schedule')} className="mt-5 w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-600 transition hover:border-indigo-200 hover:text-indigo-700">Lihat semua jadwal</button>
          </section>
          <section className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 p-5 text-white shadow-lg shadow-indigo-200/60">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15"><UsersRound size={20} /></div>
            <div className="min-w-0 flex-1"><p className="text-[11px] text-indigo-100">Database nasabah</p><p className="mt-0.5 text-xl font-bold">{customers.length} <span className="text-xs font-medium text-indigo-100">kontak terdaftar</span></p></div>
            <button onClick={() => onNavigate('customers')} aria-label="Buka data nasabah" className="rounded-lg p-2 hover:bg-white/10"><ArrowRight size={17} /></button>
          </section>
          <div className="flex items-center gap-3 px-1 text-[11px] text-slate-400"><CheckCheck size={15} className="text-emerald-500" /> Data kunjungan dapat diperbarui setelah check-in.</div>
        </div>
      </div>
      {visitAppointment && (
        <VisitUpdateModal
          appointment={visitAppointment}
          customer={getCustomer(customers, visitAppointment.customerId)}
          onClose={() => setVisitAppointment(null)}
          onSubmit={saveVisit}
        />
      )}
    </>
  )
}

export default DashboardPage
