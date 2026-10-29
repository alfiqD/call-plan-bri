import { useState, useMemo } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  ExternalLink,
  Eye,
  FileSpreadsheet,
  Filter,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UsersRound,
  XCircle,
} from 'lucide-react'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import CustomerDistributionMap from '../../components/CustomerDistributionMap'
import { formatDate } from '../../data/workspace'
import { getFollowUpStatusInfo } from '../../services/followUp'
import { AUDIT_ACTIONS, readLocalAuditLogs } from '../../services/auditLog'

const actionLabels = {
  [AUDIT_ACTIONS.LOGIN]: 'Login',
  [AUDIT_ACTIONS.LOGOUT]: 'Logout',
  [AUDIT_ACTIONS.CREATE_NASABAH]: 'Tambah Nasabah',
  [AUDIT_ACTIONS.UPDATE_NASABAH]: 'Ubah Nasabah',
  [AUDIT_ACTIONS.DELETE_NASABAH]: 'Hapus Nasabah',
  [AUDIT_ACTIONS.CREATE_JADWAL]: 'Buat Jadwal',
  [AUDIT_ACTIONS.UPDATE_JADWAL]: 'Ubah Jadwal',
  [AUDIT_ACTIONS.DELETE_JADWAL]: 'Hapus Jadwal',
  [AUDIT_ACTIONS.CHECK_IN_VISIT]: 'Check-in GPS',
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'Reschedule Kunjungan',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'Tidak Ditemui',
  [AUDIT_ACTIONS.CREATE_FOLLOW_UP]: 'Buat Follow-up',
  [AUDIT_ACTIONS.UPDATE_FOLLOW_UP]: 'Ubah Follow-up',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'Selesaikan Follow-up',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'Batalkan Follow-up',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'Hapus Follow-up',
  [AUDIT_ACTIONS.APPROVE_USER]: 'Persetujuan Akun',
}

const actionColors = {
  [AUDIT_ACTIONS.DELETE_JADWAL]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'bg-amber-50 text-amber-700 border-amber-200',
  [AUDIT_ACTIONS.CHECK_IN_VISIT]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.CREATE_JADWAL]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.UPDATE_JADWAL]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'bg-slate-100 text-slate-700 border-slate-200',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'bg-rose-50 text-rose-700 border-rose-200',
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

function AdminDashboardView({
  customers = [],
  appointments = [],
  followUps = [],
  onNavigate,
  userProfile,
}) {
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // 1-12

  // Filters State
  const [filterMode, setFilterMode] = useState('monthly') // 'monthly', 'weekly', 'custom'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedRmId, setSelectedRmId] = useState('Semua')

  // RM Detail Modal
  const [detailRm, setDetailRm] = useState(null)

  // Calculate Date Range based on Filter Mode
  const dateRange = useMemo(() => {
    if (filterMode === 'monthly') {
      const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return { start, end, label: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` }
    }

    if (filterMode === 'weekly') {
      const now = new Date()
      const day = now.getDay()
      const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diffToMonday))
      const sunday = new Date(now.setDate(monday.getDate() + 6))
      const start = monday.toISOString().slice(0, 10)
      const end = sunday.toISOString().slice(0, 10)
      return { start, end, label: `Minggu Ini (${formatDate(start)} - ${formatDate(end)})` }
    }

    // Custom
    return {
      start: customStartDate || '1970-01-01',
      end: customEndDate || '2099-12-31',
      label: customStartDate && customEndDate ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}` : 'Semua Tanggal',
    }
  }, [filterMode, selectedMonth, selectedYear, customStartDate, customEndDate])

  // Extract distinct list of RMs from appointments and follow-ups
  const rmList = useMemo(() => {
    const map = new Map()

    // Add seed RMs
    map.set('rm-01', { id: 'rm-01', nama: 'Ahmad Fauzi', email: 'rm.ahmad@bri.co.id', status: 'approved', wilayah: 'KCP Iskandar Palembang' })
    map.set('rm-02', { id: 'rm-02', nama: 'Siti Rahmawati', email: 'rm.siti@bri.co.id', status: 'approved', wilayah: 'KCP Iskandar Palembang' })
    map.set('rm-03', { id: 'rm-03', nama: 'Bambang Irawan', email: 'rm.bambang@bri.co.id', status: 'approved', wilayah: 'KCP Iskandar Palembang' })

    for (const apt of appointments) {
      if (apt.rmId && !map.has(apt.rmId)) {
        map.set(apt.rmId, { id: apt.rmId, nama: apt.rmName || `RM #${apt.rmId.slice(0, 6)}`, email: '', status: 'approved', wilayah: 'KCP Iskandar Palembang' })
      }
    }
    for (const fu of followUps) {
      if (fu.rmId && !map.has(fu.rmId)) {
        map.set(fu.rmId, { id: fu.rmId, nama: fu.rmName || `RM #${fu.rmId.slice(0, 6)}`, email: '', status: 'approved', wilayah: 'KCP Iskandar Palembang' })
      }
    }

    return Array.from(map.values())
  }, [appointments, followUps])

  // Filter Appointments by Date Range and RM
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const inDate = apt.date >= dateRange.start && apt.date <= dateRange.end
      const inRm = selectedRmId === 'Semua' || (apt.rmId ? apt.rmId === selectedRmId : selectedRmId === 'rm-01')
      return inDate && inRm
    })
  }, [appointments, dateRange, selectedRmId])

  // Filter Follow-ups by Date Range and RM
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((fu) => {
      const inDate = fu.date >= dateRange.start && fu.date <= dateRange.end
      const inRm = selectedRmId === 'Semua' || (fu.rmId ? fu.rmId === selectedRmId : selectedRmId === 'rm-01')
      return inDate && inRm
    })
  }, [followUps, dateRange, selectedRmId])

  // Metric Aggregations
  const totalJadwal = filteredAppointments.length
  const selesaiCount = filteredAppointments.filter((a) => a.status === 'Selesai').length
  const rescheduleCount = filteredAppointments.filter((a) => a.status === 'Reschedule').length
  const tidakDitemuiCount = filteredAppointments.filter((a) => a.status === 'Tidak ditemui').length

  const todayIso = new Date().toISOString().slice(0, 10)
  const overdueFollowUpCount = useMemo(() => {
    return filteredFollowUps.filter((f) => {
      const { isOverdue } = getFollowUpStatusInfo(f, todayIso)
      return isOverdue
    }).length
  }, [filteredFollowUps, todayIso])

  const completionRate = totalJadwal > 0 ? Math.round((selesaiCount / totalJadwal) * 100) : 0

  // RM Performance Rows
  const rmPerformance = useMemo(() => {
    return rmList.map((rm) => {
      const rmApts = appointments.filter((a) => {
        const inDate = a.date >= dateRange.start && a.date <= dateRange.end
        const matchesRm = a.rmId ? a.rmId === rm.id : rm.id === 'rm-01'
        return inDate && matchesRm
      })
      const rmFollowUps = followUps.filter((f) => {
        const inDate = f.date >= dateRange.start && f.date <= dateRange.end
        const matchesRm = f.rmId ? f.rmId === rm.id : rm.id === 'rm-01'
        return inDate && matchesRm
      })

      const total = rmApts.length
      const selesai = rmApts.filter((a) => a.status === 'Selesai').length
      const reschedule = rmApts.filter((a) => a.status === 'Reschedule').length
      const unmet = rmApts.filter((a) => a.status === 'Tidak ditemui').length
      const overdue = rmFollowUps.filter((f) => getFollowUpStatusInfo(f, todayIso).isOverdue).length
      const rate = total > 0 ? Math.round((selesai / total) * 100) : 0

      return {
        ...rm,
        total,
        selesai,
        reschedule,
        unmet,
        overdue,
        rate,
        appointments: rmApts,
        followUps: rmFollowUps,
      }
    })
  }, [rmList, appointments, followUps, dateRange, todayIso])

  const recentAuditLogs = useMemo(() => {
    return readLocalAuditLogs().slice(0, 5)
  }, [appointments, followUps])

  const handleResetFilters = () => {
    setFilterMode('monthly')
    setSelectedMonth(currentMonth)
    setSelectedYear(currentYear)
    setCustomStartDate('')
    setCustomEndDate('')
    setSelectedRmId('Semua')
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
              <ShieldCheck size={11} /> Administrator Portal
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">Bank BRI KCP Iskandar Palembang</span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Dashboard Monitoring & Kinerja RM
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Monitoring rekapitulasi kunjungan, kepatuhan GPS check-in, dan agenda tindak lanjut seluruh tim.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('audit-log')}
            className="button-secondary text-xs"
          >
            <Shield size={14} /> Audit Log
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('admin-users')}
            className="button-secondary text-xs"
          >
            <UserCheck size={14} /> Kelola Akun
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('reports')}
            className="button-primary text-xs"
          >
            <FileSpreadsheet size={14} /> Laporan Lengkap
          </button>
        </div>
      </div>

      {/* Period & RM Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Mode Selector */}
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setFilterMode('monthly')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'monthly' ? 'bg-white text-[#00529b] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bulanan
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('weekly')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'weekly' ? 'bg-white text-[#00529b] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Minggu Ini
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('custom')}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                filterMode === 'custom' ? 'bg-white text-[#00529b] shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Rentang Tanggal
            </button>
          </div>

          {/* Sub Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {filterMode === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="form-control text-xs py-1"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="form-control text-xs py-1"
                >
                  {[2024, 2025, 2026, 2027].map((yr) => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </>
            )}

            {filterMode === 'custom' && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="form-control text-xs py-1"
                />
                <span className="text-xs text-slate-400">-</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="form-control text-xs py-1"
                />
              </div>
            )}

            {/* RM Dropdown */}
            <select
              value={selectedRmId}
              onChange={(e) => setSelectedRmId(e.target.value)}
              className="form-control text-xs py-1"
            >
              <option value="Semua">Seluruh RM (Kantor)</option>
              {rmList.map((rm) => (
                <option key={rm.id} value={rm.id}>{rm.nama}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[#00529b] hover:underline px-2 py-1"
            >
              Reset Filter
            </button>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Periode aktif: <strong className="text-slate-800">{dateRange.label}</strong>
            {selectedRmId !== 'Semua' && ` · Filter RM: ${rmList.find((r) => r.id === selectedRmId)?.nama || selectedRmId}`}
          </span>
          <span className="text-slate-400">Semua metrik dan tabel diselaraskan dengan filter ini</span>
        </div>
      </div>

      {/* 6 Essential KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total RM */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">RM Terdaftar</span>
            <UsersRound size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{rmList.length}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">{rmList.filter((r) => r.status === 'approved').length} RM Aktif</p>
        </div>

        {/* Total Jadwal */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Jadwal</span>
            <CalendarDays size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalJadwal}</p>
          <p className="mt-1 text-[11px] text-slate-500">Periode ini</p>
        </div>

        {/* Selesai */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kunjungan Selesai</span>
            <CalendarCheck2 size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{selesaiCount}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">{completionRate}% Selesai</p>
        </div>

        {/* Reschedule */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Reschedule</span>
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{rescheduleCount}</p>
          <p className="mt-1 text-[11px] text-amber-600">Jadwal ulang</p>
        </div>

        {/* Tidak Ditemui */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tidak Ditemui</span>
            <XCircle size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{tidakDitemuiCount}</p>
          <p className="mt-1 text-[11px] text-rose-600">Perlu kunjungan ulang</p>
        </div>

        {/* Follow-up Terlambat */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Follow-up Terlambat</span>
            <Clock3 size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{overdueFollowUpCount}</p>
          <p className="mt-1 text-[11px] text-slate-400">Butuh eskalasi</p>
        </div>
      </div>

      {/* Peta Sebaran Lokasi Seluruh Nasabah (Admin Monitoring) */}
      <CustomerDistributionMap
        customers={customers}
        appointments={appointments}
        isAdmin={true}
        onNavigate={onNavigate}
        height="460px"
      />

      {/* RM Performance Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Tabel Kinerja & Capaian Kunjungan Relationship Manager</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Evaluasi kepatuhan jadwal, persentase kunjungan berhasil, dan beban tindak lanjut nasabah.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">Periode: {dateRange.label}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-50/50">
                <th className="px-5 py-3">Nama Relationship Manager</th>
                <th className="px-4 py-3">Wilayah Tugas</th>
                <th className="px-4 py-3 text-center">Total Jadwal</th>
                <th className="px-4 py-3 text-center">Selesai (GPS)</th>
                <th className="px-4 py-3 text-center">Reschedule</th>
                <th className="px-4 py-3 text-center">Tidak Ditemui</th>
                <th className="px-4 py-3 text-center">FU Terlambat</th>
                <th className="px-4 py-3">Efektivitas Kunjungan</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rmPerformance.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                        {row.nama.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <p className="font-bold text-slate-900">{row.nama}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{row.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {row.wilayah}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                    {row.total}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-emerald-700 bg-emerald-50/30">
                    {row.selesai}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-amber-700">
                    {row.reschedule}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-rose-700">
                    {row.unmet}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.overdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {row.overdue}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 min-w-[130px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#00529b]"
                          style={{ width: `${Math.min(100, row.rate)}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-slate-800 shrink-0 w-8 text-right">
                        {row.rate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRm(row)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-[#00529b]"
                    >
                      <Eye size={13} /> Lihat Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aktivitas Terkini RM (Live Audit Log Preview) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-100 text-[#00529b]">
              <Activity size={16} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aktivitas Terkini Relationship Manager (Audit Log)</h3>
              <p className="text-xs text-slate-500">
                Pemantauan langsung tindakan RM: reschedule, hapus jadwal, check-in GPS, dan tindak lanjut nasabah.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('audit-log')}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-lg border border-[#00529b] bg-white px-3 py-1.5 text-xs font-semibold text-[#00529b] hover:bg-blue-50 transition shadow-2xs"
          >
            <span>Buka Seluruh Audit Log</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentAuditLogs.length > 0 ? (
            recentAuditLogs.map((log) => {
              const label = actionLabels[log.action] || log.action
              const badgeStyle = actionColors[log.action] || 'bg-slate-100 text-slate-700 border-slate-200'
              const formattedTime = new Date(log.createdAt).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
              })
              const formattedDate = formatDate(log.createdAt.slice(0, 10))

              let detailSummary = ''
              if (log.action === AUDIT_ACTIONS.RESCHEDULE_VISIT) {
                detailSummary = `Reschedule jadwal kunjungan ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''} ke ${log.details?.newDate ? formatDate(log.details.newDate) : ''} pukul ${log.details?.newTime || ''} ${log.details?.notes ? `— "${log.details.notes}"` : ''}`
              } else if (log.action === AUDIT_ACTIONS.DELETE_JADWAL) {
                detailSummary = `Menghapus jadwal kunjungan ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''} ${log.details?.reason ? `(${log.details.reason})` : ''}`
              } else if (log.action === AUDIT_ACTIONS.CHECK_IN_VISIT) {
                detailSummary = `Check-in GPS berhasil divalidasi (jarak ${log.details?.distanceMeters ?? '±0'} meter dari titik nasabah)`
              } else if (log.action === AUDIT_ACTIONS.CREATE_JADWAL) {
                detailSummary = `Membuat jadwal kunjungan baru pada ${log.details?.date ? formatDate(log.details.date) : ''} pukul ${log.details?.time || ''}`
              } else if (log.action === AUDIT_ACTIONS.COMPLETE_FOLLOW_UP) {
                detailSummary = `Menyelesaikan follow-up nasabah ${log.details?.resultNotes ? `— "${log.details.resultNotes}"` : ''}`
              } else if (log.action === AUDIT_ACTIONS.CANCEL_FOLLOW_UP) {
                detailSummary = `Membatalkan tindak lanjut nasabah`
              } else if (log.action === AUDIT_ACTIONS.DELETE_FOLLOW_UP) {
                detailSummary = `Menghapus item follow-up nasabah`
              } else {
                detailSummary = log.details?.customerName || log.details?.nama || log.entityType
              }

              return (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 transition">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[10px] font-bold text-[#00529b] mt-0.5">
                      {log.actorName ? log.actorName.slice(0, 2).toUpperCase() : 'RM'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{log.actorName}</span>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold border ${badgeStyle}`}>
                          {label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {log.actorEmail}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-600 truncate">
                        {detailSummary}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <span className="text-[11px] font-semibold text-slate-700 block">{formattedTime} WIB</span>
                    <span className="text-[10px] text-slate-400 block">{formattedDate}</span>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-6 text-center text-xs text-slate-400">
              Belum ada aktivitas tercatat hari ini.
            </div>
          )}
        </div>
      </div>

      {/* RM Detail Performance Modal */}
      {detailRm && (
        <Modal
          title={`Detail Kinerja RM: ${detailRm.nama}`}
          description={`Rincian agenda dan aktivitas pada periode ${dateRange.label}`}
          onClose={() => setDetailRm(null)}
          wide
        >
          <div className="space-y-4">
            {/* RM Summary Stats */}
            <div className="grid grid-cols-4 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs">
              <div>
                <p className="text-[10px] text-slate-400">Total Jadwal</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{detailRm.total}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600">Selesai (GPS)</p>
                <p className="text-base font-bold text-emerald-700 mt-0.5">{detailRm.selesai}</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-600">Reschedule</p>
                <p className="text-base font-bold text-amber-700 mt-0.5">{detailRm.reschedule}</p>
              </div>
              <div>
                <p className="text-[10px] text-rose-600">FU Terlambat</p>
                <p className="text-base font-bold text-rose-700 mt-0.5">{detailRm.overdue}</p>
              </div>
            </div>

            {/* List of Visits in Period */}
            <div>
              <h4 className="text-xs font-bold text-slate-800 mb-2">Daftar Kunjungan Nasabah pada Periode Ini:</h4>
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
                {detailRm.appointments.length > 0 ? (
                  detailRm.appointments.map((apt) => {
                    const cust = customers.find((c) => String(c.id) === String(apt.customerId))
                    return (
                      <div key={apt.id} className="rounded-lg border border-slate-200 p-2.5 text-xs flex items-center justify-between bg-white">
                        <div>
                          <p className="font-bold text-slate-900">{cust?.name || `Nasabah #${apt.customerId}`}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{formatDate(apt.date)} · {apt.time} · {apt.purpose}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={apt.status} />
                          {apt.checkInDistanceMeters !== undefined && apt.checkInDistanceMeters !== null && (
                            <span className="text-[10px] text-emerald-600 font-semibold font-mono">
                              ±{apt.checkInDistanceMeters}m
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">Tidak ada kunjungan pada periode ini.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDetailRm(null)}
                className="button-secondary"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

export default AdminDashboardView
