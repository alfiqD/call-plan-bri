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

  const exportCsv = () => {
    const rows = [
      ['Tanggal', 'Jam', 'Nama Nasabah', 'Telepon', 'Alamat', 'Tujuan Kunjungan', 'Prioritas', 'Status', 'Catatan Hasil'],
      ...reportAppointments.map((appointment) => {
        const customer = getCustomer(customers, appointment.customerId)
        return [appointment.date, appointment.time, customer?.name || 'Nasabah dihapus', customer?.phone || '-', customer?.address || '-', appointment.purpose, appointment.priority, appointment.status, appointment.notes || '-']
      }),
    ]
    const csv = `\uFEFF${rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\r\n')}`
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
    <div className="report-print-area">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs text-slate-500">Pantau dan ekspor riwayat kerja kunjungan berdasarkan rentang tanggal.</p><p className="mt-2 text-[11px] text-slate-400">Rekap aktivitas lapangan · tanpa data nominal kredit</p></div>
        <div className="report-actions flex flex-wrap gap-2">
          <button onClick={() => window.print()} className="button-secondary"><Printer size={15} /> Simpan PDF</button>
          <button onClick={exportCsv} className="button-primary"><FileSpreadsheet size={15} /> Ekspor Excel (CSV)</button>
        </div>
      </div>

      <section className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="form-label min-w-40 flex-1">Dari tanggal
            <span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} className="form-control pl-9" /></span>
          </label>
          <label className="form-label min-w-40 flex-1">Sampai tanggal
            <span className="relative block"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} className="form-control pl-9" /></span>
          </label>
          <label className="form-label min-w-40 flex-1">Status kunjungan
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="form-control">
              {['Semua status', 'Terjadwal', 'Selesai', 'Reschedule', 'Tidak ditemui'].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <div className="relative min-w-48 flex-[1.3]"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nasabah atau tujuan..." className="form-control pl-9" aria-label="Cari riwayat kunjungan" /></div>
        </div>
      </section>

      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <ReportStat title="Total aktivitas" value={reportAppointments.length} note={`${formatDate(fromDate, { day: 'numeric', month: 'short' })} — ${formatDate(toDate, { day: 'numeric', month: 'short', year: 'numeric' })}`} icon={CalendarDays} color="indigo" />
        <ReportStat title="Kunjungan selesai" value={completedCount} note={`${completionRate}% dari total aktivitas`} icon={CheckCircle2} color="green" />
        <ReportStat title="Perlu tindak lanjut" value={rescheduledCount} note="Jadwal ulang oleh nasabah" icon={UsersRound} color="amber" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="text-sm font-bold text-slate-900">Riwayat kunjungan</h2><p className="mt-1 text-[11px] text-slate-400">{reportAppointments.length} data sesuai filter</p></div><span className="hidden items-center gap-1.5 text-[10px] text-slate-400 sm:flex"><Download size={13} /> CSV dapat dibuka di Excel</span></div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Tanggal / Jam</th><th className="px-4 py-3">Nasabah</th><th className="px-4 py-3">Tujuan & Lokasi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Catatan hasil</th><th className="px-5 py-3">Bukti</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {reportAppointments.map((appointment) => {
                const customer = getCustomer(customers, appointment.customerId)
                return <tr key={appointment.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5"><p className="text-xs font-semibold text-slate-700">{formatDate(appointment.date, { day: 'numeric', month: 'short', year: 'numeric' })}</p><p className="mt-1 text-[10px] text-slate-400">{appointment.time}</p></td>
                  <td className="px-4 py-3.5"><p className="text-xs font-semibold text-slate-700">{customer?.name || 'Nasabah dihapus'}</p><p className="mt-1 text-[10px] text-slate-400">{customer?.phone || '-'}</p></td>
                  <td className="max-w-[240px] px-4 py-3.5"><p className="text-xs text-slate-700">{appointment.purpose}</p><p className="mt-1 truncate text-[10px] text-slate-400">{customer?.address || '-'}</p></td>
                  <td className="px-4 py-3.5"><StatusBadge status={appointment.status} /></td>
                  <td className="max-w-[220px] px-4 py-3.5"><p className="truncate text-[11px] text-slate-500">{appointment.notes || 'Belum ada catatan'}</p></td>
                  <td className="px-5 py-3.5">{appointment.evidence ? <a href={appointment.evidence} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-indigo-600 hover:underline">Lihat foto</a> : <span className="text-[10px] text-slate-300">—</span>}</td>
                </tr>
              })}
              {!reportAppointments.length && <tr><td colSpan="6" className="px-6 py-14 text-center"><CalendarDays className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Belum ada riwayat</p><p className="mt-1 text-xs text-slate-400">Coba ubah rentang tanggal atau filter status.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">Data laporan tersimpan lokal pada perangkat ini dan tidak dikirim ke server.</div>
      </section>
    </div>
  )
}

function ReportStat({ title, value, note, icon: Icon, color }) {
  const colors = { indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-emerald-50 text-emerald-600', amber: 'bg-amber-50 text-amber-600' }
  return <article className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 sm:p-5"><div className={`flex size-9 items-center justify-center rounded-xl ${colors[color]}`}><Icon size={17} /></div><p className="mt-4 text-[11px] font-medium text-slate-500">{title}</p><div className="mt-1 flex items-end justify-between gap-2"><p className="text-2xl font-bold text-slate-900">{String(value).padStart(2, '0')}</p><p className="text-right text-[9px] text-slate-400">{note}</p></div></article>
}

export default ReportsPage
