import { useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Download, FileSpreadsheet, Printer, Search, UsersRound } from 'lucide-react'
import StatusBadge from '../components/StatusBadge'
import { formatDate, getCustomer, localDateKey } from '../data/workspace'

const monthStart = () => {
  const date = new Date()
  date.setDate(1)
  return localDateKey(date)
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
  const completionRate = reportAppointments.length ? Math.round(completedCount / reportAppointments.length * 100) : 0

  const sanitizeCsvCell = (value) => {
    if (value === null || value === undefined) return ''
    const str = String(value)
    // Formula Injection defense: prefix characters that Excel interprets as formulas
    const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str
    return `"${sanitized.replace(/"/g, '""')}"`
  }

  const exportCsv = () => {
    const headers = ['Tanggal', 'Jam', 'Nama Nasabah', 'Telepon', 'Alamat', 'Tujuan Kunjungan', 'Prioritas', 'Status', 'Catatan Hasil']
    const dataRows = reportAppointments.map((appointment) => {
      const customer = getCustomer(customers, appointment.customerId)
      return [
        appointment.date,
        appointment.time,
        customer?.name || 'Nasabah dihapus',
        customer?.phone || '-',
        customer?.address || '-',
        appointment.purpose,
        appointment.priority,
        appointment.status,
        appointment.notes || '-',
      ]
    })

    const csvContent = [headers, ...dataRows]
      .map((row) => row.map(sanitizeCsvCell).join(','))
      .join('\r\n')

    const csv = `\uFEFF${csvContent}`
    const blobUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = `riwayat-kunjungan-${fromDate}-${toDate}.csv`
    document.body.append(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(blobUrl)
  }

  return (
    <div className="report-print-area space-y-5">
      {/* Top Header & Export Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Laporan & Riwayat Kunjungan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Rekapitulasi aktivitas kunjungan nasabah Bank BRI KCP Iskandar Palembang
          </p>
        </div>
        <div className="report-actions flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="button-secondary"
          >
            <Printer size={14} /> Cetak / PDF
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="button-orange"
          >
            <FileSpreadsheet size={14} /> Ekspor Excel (CSV)
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="form-label">
            <span>Dari Tanggal</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="form-control pl-9 text-xs"
              />
            </div>
          </label>

          <label className="form-label">
            <span>Sampai Tanggal</span>
            <div className="relative">
              <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={toDate}
                min={fromDate}
                onChange={(event) => setToDate(event.target.value)}
                className="form-control pl-9 text-xs"
              />
            </div>
          </label>

          <label className="form-label">
            <span>Status Kunjungan</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="form-control text-xs"
            >
              {['Semua status', 'Terjadwal', 'Selesai', 'Reschedule', 'Tidak ditemui'].map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="form-label">
            <span>Pencarian Nasabah</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama nasabah atau tujuan..."
                className="form-control pl-9 text-xs"
                aria-label="Cari riwayat kunjungan"
              />
            </div>
          </label>
        </div>
      </section>

      {/* 3 KPI Stat Cards */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ReportStat
          title="Total Aktivitas Terfilter"
          value={reportAppointments.length}
          note={`${formatDate(fromDate, { day: 'numeric', month: 'short' })} — ${formatDate(toDate, { day: 'numeric', month: 'short', year: 'numeric' })}`}
          icon={CalendarDays}
          color="blue"
        />
        <ReportStat
          title="Kunjungan Selesai"
          value={completedCount}
          note={`${completionRate}% dari total aktivitas`}
          icon={CheckCircle2}
          color="green"
        />
        <ReportStat
          title="Perlu Reschedule / Diperhatikan"
          value={rescheduledCount}
          note="Penjadwalan ulang"
          icon={UsersRound}
          color="amber"
        />
      </section>

      {/* Table Section */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-3.5">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Riwayat Kunjungan</h3>
            <p className="text-[11px] text-slate-500">{reportAppointments.length} data sesuai filter periode</p>
          </div>
          <span className="hidden items-center gap-1.5 text-[11px] text-slate-400 sm:flex">
            <Download size={13} /> Format CSV didukung Excel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Tanggal / Waktu</th>
                <th className="px-4 py-3">Nasabah</th>
                <th className="px-4 py-3">Tujuan & Lokasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Catatan Hasil</th>
                <th className="px-5 py-3 text-right">Foto Bukti</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {reportAppointments.length > 0 ? (
                reportAppointments.map((appointment) => {
                  const customer = getCustomer(customers, appointment.customerId)
                  return (
                    <tr key={appointment.id} className="hover:bg-slate-50/70 transition">
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <p className="font-semibold text-slate-800">
                          {formatDate(appointment.date, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        <p className="text-[11px] text-slate-400 font-mono">{appointment.time}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-slate-900">{customer?.name || 'Nasabah dihapus'}</p>
                        <p className="text-[11px] text-slate-500">{customer?.phone || '-'}</p>
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <p className="text-slate-800">{appointment.purpose}</p>
                        <p className="truncate text-[11px] text-slate-400">{customer?.address || '-'}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <StatusBadge status={appointment.status} />
                      </td>
                      <td className="max-w-[240px] px-4 py-3.5">
                        <p className="truncate text-[11px] text-slate-600">{appointment.notes || 'Belum ada catatan'}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {appointment.evidence ? (
                          <a
                            href={appointment.evidence}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-[#00529b] hover:underline"
                          >
                            Lihat Foto
                          </a>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400">
                    <CalendarDays className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Belum ada riwayat</p>
                    <p className="mt-0.5 text-xs text-slate-400">Coba ubah rentang tanggal atau filter status.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-400">
          Laporan monitoring aktivitas Relationship Manager Bank BRI KCP Iskandar Palembang
        </div>
      </section>
    </div>
  )
}

function ReportStat({ title, value, note, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 text-[#00529b]',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
  }
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-500">{title}</span>
        <div className={`flex size-8 items-center justify-center rounded-lg ${colors[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div className="mt-3 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className="text-[11px] text-slate-400 truncate">{note}</span>
      </div>
    </article>
  )
}

export default ReportsPage
