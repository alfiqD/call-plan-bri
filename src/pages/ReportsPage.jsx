import { useMemo, useState } from 'react'
import { CalendarCheck2, CalendarDays, Search, UsersRound } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { formatDate, getCustomer, localDateKey } from '../data/workspace'

const monthStart = () => {
  const date = new Date()
  date.setDate(1)
  return localDateKey(date)
}

const TONE = {
  blue: { icon: 'text-[#00529b]', accent: '#00529b', value: 'text-slate-900' },
  emerald: { icon: 'text-emerald-600', accent: '#059669', value: 'text-emerald-700' },
  amber: { icon: 'text-amber-600', accent: '#d97706', value: 'text-amber-700' },
}

function MetricCard({ label, value, helper, icon: Icon, tone = 'blue', featured = false }) {
  const t = TONE[tone]
  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-3.5 transition-all duration-300 hover:-translate-y-0.5 ${featured
        ? 'border border-[#00529b]/25 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(0,82,155,0.25)]'
        : 'border border-slate-200/80 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-slate-300/80 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_10px_24px_-16px_rgba(15,23,42,0.18)]'
        }`}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `linear-gradient(90deg, transparent, ${t.accent}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-slate-500">
          {label}
        </span>
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-100 bg-slate-50/80">
          <Icon size={13.5} strokeWidth={2.2} className={t.icon} />
        </span>
      </div>
      <div className="mt-1.5">
        <p className={`text-[26px] leading-none font-bold tabular-nums tracking-tight ${t.value}`}>
          {value}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">{helper}</p>
      </div>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle, trailing }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-200/80 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[#00529b]">
          <Icon size={14} strokeWidth={2.2} />
        </span>
        <div>
          <h3 className="text-[13px] font-bold tracking-tight text-slate-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {trailing && <div className="self-start sm:self-auto">{trailing}</div>}
    </div>
  )
}

function ReportsPage({ customers, appointments }) {
  const [fromDate, setFromDate] = useState(monthStart)
  const [toDate, setToDate] = useState(localDateKey())
  const [statusFilter, setStatusFilter] = useState('Semua status')
  const [query, setQuery] = useState('')

  const reportAppointments = useMemo(() => appointments
    .filter((appointment) => appointment.date >= fromDate && appointment.date <= toDate)
    .filter((appointment) => statusFilter === 'Semua status' || appointment.status === statusFilter)
    .filter((appointment) => {
      const customer = getCustomer(customers, appointment.customerId)
      return `${customer?.name || ''} ${appointment.purpose} ${customer?.address || ''}`.toLowerCase().includes(query.toLowerCase())
    })
    .sort((first, second) => `${second.date}${second.time}`.localeCompare(`${first.date}${first.time}`)),
    [appointments, customers, fromDate, query, statusFilter, toDate])

  const completedCount = reportAppointments.filter((appointment) => appointment.status === 'Selesai').length
  const rescheduledCount = reportAppointments.filter((appointment) => appointment.status === 'Reschedule').length
  const completionRate = reportAppointments.length ? Math.round((completedCount / reportAppointments.length) * 100) : 0

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00529b]/70">
            KCP Iskandar Palembang
          </p>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
              Status Kunjungan
            </h2>
            <span className="inline-flex items-center rounded-full border border-[#00529b]/20 bg-[#eaf3fb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#00529b]">
              {reportAppointments.length} data
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Rekapitulasi status dan riwayat kunjungan nasabah
          </p>
        </div>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="form-label">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">Dari Tanggal</span>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="form-control py-1 text-xs"
            />
          </label>

          <label className="form-label">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">Sampai Tanggal</span>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(event) => setToDate(event.target.value)}
              className="form-control py-1 text-xs"
            />
          </label>

          <label className="form-label">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">Status Kunjungan</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control py-1 text-xs"
            >
              {['Semua status', 'Terjadwal', 'Execute', 'Selesai', 'Reschedule', 'Tidak ditemui', 'Dibatalkan'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-slate-500">Pencarian Nasabah</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama atau tujuan..."
                className="form-control py-1 pl-8 text-xs"
                aria-label="Cari riwayat kunjungan"
              />
            </div>
          </label>
        </div>
      </section>

      {/* ── KPI Stat Cards ──────────────────────────────────────────── */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <MetricCard
          label="Total Kunjungan"
          value={reportAppointments.length}
          helper={`${formatDate(fromDate, { day: 'numeric', month: 'short' })} – ${formatDate(toDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          icon={CalendarDays}
          tone="blue"
          featured
        />
        <MetricCard
          label="Kunjungan Selesai"
          value={completedCount}
          helper={`${completionRate}% tingkat penyelesaian`}
          icon={CalendarCheck2}
          tone="emerald"
        />
        <MetricCard
          label="Perlu Reschedule"
          value={rescheduledCount}
          helper="Penjadwalan ulang"
          icon={UsersRound}
          tone="amber"
        />
      </section>

      {/* ── Mobile Visit Cards ──────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {reportAppointments.length > 0 ? reportAppointments.map((appointment) => {
          const customer = getCustomer(customers, appointment.customerId)
          return (
            <article
              key={appointment.id}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300/80"
            >
              <div className="p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-slate-900">
                      {customer?.name || 'Nasabah dihapus'}
                    </p>
                    <p className="mt-0.5 font-mono text-[10.5px] tabular-nums text-slate-400">
                      {formatDate(appointment.date)} · {appointment.time}
                    </p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                <div className="mt-2.5 space-y-1 border-t border-slate-100 pt-2 text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{appointment.purpose}</p>
                  <p className="truncate text-[11px] text-slate-500">{customer?.address || 'Alamat belum tersedia'}</p>
                  {customer?.phone && (
                    <p className="text-[11px] text-slate-500">Tel: {customer.phone}</p>
                  )}
                  {appointment.checkInDistanceMeters != null && (
                    <p className="font-mono text-[10.5px] font-semibold text-emerald-600">
                      GPS Check-in: ±{appointment.checkInDistanceMeters}m
                    </p>
                  )}
                </div>
              </div>
            </article>
          )
        }) : (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <CalendarDays size={20} className="text-slate-300" />
            <p className="text-[11.5px] text-slate-400">Belum ada riwayat kunjungan pada filter ini.</p>
          </div>
        )}
      </div>

      {/* ── Desktop Table Section ───────────────────────────────────── */}
      <section className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:block">
        <SectionHeader
          icon={CalendarDays}
          title="Riwayat Kunjungan"
          subtitle={`${reportAppointments.length} agenda ditemukan pada periode terpilih`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Tanggal / Waktu</th>
                <th className="px-4 py-2.5">Nasabah</th>
                <th className="px-4 py-2.5">Tujuan &amp; Lokasi</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {reportAppointments.length > 0 ? (
                reportAppointments.map((appointment) => {
                  const customer = getCustomer(customers, appointment.customerId)
                  return (
                    <tr key={appointment.id} className="group transition-colors hover:bg-[#f9fbfe]">
                      <td className="whitespace-nowrap px-5 py-3">
                        <p className="text-[12.5px] font-semibold tabular-nums text-slate-800">
                          {formatDate(appointment.date)}
                        </p>
                        <p className="font-mono text-[10.5px] tabular-nums text-slate-400">{appointment.time}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[12.5px] font-semibold text-slate-900">{customer?.name || 'Nasabah dihapus'}</p>
                        <p className="text-[10.5px] text-slate-400">{customer?.phone || '-'}</p>
                      </td>
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="text-[12px] font-medium text-slate-800">{appointment.purpose}</p>
                        <p className="truncate text-[10.5px] text-slate-400">{customer?.address || '-'}</p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={appointment.status} />
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <CalendarDays className="mx-auto mb-1.5 size-8 text-slate-300" />
                    <p className="text-xs text-slate-400">Belum ada riwayat kunjungan pada filter ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default ReportsPage