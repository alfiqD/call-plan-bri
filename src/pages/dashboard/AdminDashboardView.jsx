import { useState, useMemo, useEffect } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Clock3,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Shield,
  ShieldCheck,
  UserCheck,
  UsersRound,
  XCircle,
} from 'lucide-react'
import Modal from '../../components/Modal'
import StatusBadge from '../../components/StatusBadge'
import CustomerDistributionMap from '../../components/CustomerDistributionMap'
import { formatDate, localDateKey } from '../../data/workspace'
import { getFollowUpStatusInfo } from '../../services/followUp'
import { AUDIT_ACTIONS, fetchAuditLogs } from '../../services/auditLog'
import { isSupabaseConfigured, supabase } from '../../services/supabase'
import { calculateVisitMetrics, getWeekDateRange } from '../../services/visitMetrics'

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
}) {
  const currentDate = useMemo(() => new Date(), [])
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // 1-12

  // Filters State
  const [filterMode, setFilterMode] = useState('weekly') // 'monthly', 'weekly', 'custom'
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedRmId, setSelectedRmId] = useState('Semua')
  const [rmProfiles, setRmProfiles] = useState([])
  const [rmProfilesError, setRmProfilesError] = useState('')
  const [recentAuditLogs, setRecentAuditLogs] = useState([])
  const [auditLogsError, setAuditLogsError] = useState('')

  // RM Detail Modal
  const [detailRm, setDetailRm] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return undefined

    let isActive = true
    const loadRmProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nama, email, status, assigned_area')
        .eq('role', 'rm')
        .order('nama', { ascending: true })

      if (!isActive) return
      if (error) {
        console.error('Gagal memuat profil RM untuk dashboard Admin:', error)
        setRmProfilesError(error.message || 'Daftar RM gagal dimuat.')
        return
      }

      setRmProfiles((data || []).filter((profile) => profile.status === 'approved'))
      setRmProfilesError('')
    }

    void loadRmProfiles()
    return () => { isActive = false }
  }, [])

  useEffect(() => {
    let isActive = true
    const loadRecentAuditLogs = async () => {
      try {
        const result = await fetchAuditLogs({ page: 1, pageSize: 5 })
        if (isActive) {
          setRecentAuditLogs(result.logs)
          setAuditLogsError('')
        }
      } catch (error) {
        console.error('Gagal memuat aktivitas terbaru untuk dashboard Admin:', error)
        if (isActive) {
          setAuditLogsError(error instanceof Error ? error.message : 'Aktivitas terbaru gagal dimuat.')
        }
      }
    }

    void loadRecentAuditLogs()
    return () => { isActive = false }
  }, [appointments, followUps])

  // Calculate Date Range based on Filter Mode
  const dateRange = useMemo(() => {
    if (filterMode === 'monthly') {
      const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
      const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
      return { start, end, label: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` }
    }

    if (filterMode === 'weekly') {
      const { start, end } = getWeekDateRange(currentDate)
      return { start, end, label: `Minggu Ini (${formatDate(start)} - ${formatDate(end)})` }
    }

    // Custom
    return {
      start: customStartDate || '1970-01-01',
      end: customEndDate || '2099-12-31',
      label: customStartDate && customEndDate ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}` : 'Semua Tanggal',
    }
  }, [filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, currentDate])

  // Use approved RM profiles, adding owners of existing activity if a profile is unavailable.
  const rmList = useMemo(() => {
    const map = new Map(rmProfiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        nama: profile.nama || 'RM',
        email: profile.email || '',
        status: profile.status,
        wilayah: profile.assigned_area || 'Wilayah belum diatur',
      },
    ]))

    for (const apt of appointments) {
      if (apt.rmId && !map.has(apt.rmId)) {
        map.set(apt.rmId, { id: apt.rmId, nama: apt.rmName || `RM #${apt.rmId.slice(0, 6)}`, email: '', status: 'approved', wilayah: 'Wilayah belum diatur' })
      }
    }
    for (const fu of followUps) {
      if (fu.rmId && !map.has(fu.rmId)) {
        map.set(fu.rmId, { id: fu.rmId, nama: fu.rmName || `RM #${fu.rmId.slice(0, 6)}`, email: '', status: 'approved', wilayah: 'Wilayah belum diatur' })
      }
    }

    return Array.from(map.values())
  }, [rmProfiles, appointments, followUps])

  // Filter Follow-ups by Date Range and RM
  const filteredFollowUps = useMemo(() => {
    return followUps.filter((fu) => {
      const inDate = fu.date >= dateRange.start && fu.date <= dateRange.end
      const inRm = selectedRmId === 'Semua' || fu.rmId === selectedRmId
      return inDate && inRm
    })
  }, [followUps, dateRange, selectedRmId])

  const todayIso = localDateKey(currentDate)
  const selectedRmAppointments = useMemo(
    () => appointments.filter((appointment) => selectedRmId === 'Semua' || appointment.rmId === selectedRmId),
    [appointments, selectedRmId]
  )
  const visitMetrics = useMemo(
    () => calculateVisitMetrics(selectedRmAppointments, dateRange),
    [selectedRmAppointments, dateRange]
  )
  const overdueFollowUpCount = useMemo(() => {
    return filteredFollowUps.filter((f) => {
      const { isOverdue } = getFollowUpStatusInfo(f, todayIso)
      return isOverdue
    }).length
  }, [filteredFollowUps, todayIso])

  // RM Performance Rows
  const rmPerformance = useMemo(() => {
    return rmList.map((rm) => {
      const allRmAppointments = appointments.filter((a) => a.rmId === rm.id)
      const rmApts = allRmAppointments.filter((appointment) => {
        const scheduledInPeriod = appointment.date >= dateRange.start && appointment.date <= dateRange.end
        const completedDate = appointment.checkInAt
          ? localDateKey(new Date(appointment.checkInAt))
          : appointment.date
        const completedInPeriod = appointment.status === 'Selesai' &&
          completedDate >= dateRange.start && completedDate <= dateRange.end
        return scheduledInPeriod || completedInPeriod
      })
      const rmFollowUps = followUps.filter((f) => {
        const inDate = f.date >= dateRange.start && f.date <= dateRange.end
        return inDate && f.rmId === rm.id
      })

      const metrics = calculateVisitMetrics(allRmAppointments, dateRange)
      const overdue = rmFollowUps.filter((f) => getFollowUpStatusInfo(f, todayIso).isOverdue).length

      return {
        ...rm,
        ...metrics,
        overdue,
        appointments: rmApts,
        followUps: rmFollowUps,
      }
    })
  }, [rmList, appointments, followUps, dateRange, todayIso])

  const handleResetFilters = () => {
    setFilterMode('weekly')
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
          <div className="flex w-full items-center justify-between gap-1 rounded-lg bg-slate-100 p-1 sm:w-fit sm:justify-start">
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
              <div className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="form-control w-full text-xs py-1 sm:w-auto"
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

        <div className="flex flex-col justify-between gap-1 border-t border-slate-100 pt-2 text-[11px] text-slate-500 sm:flex-row sm:items-center">
          <span>
            Periode aktif: <strong className="text-slate-800">{dateRange.label}</strong>
            {selectedRmId !== 'Semua' && ` · Filter RM: ${rmList.find((r) => r.id === selectedRmId)?.nama || selectedRmId}`}
          </span>
          <span className="text-slate-400">Semua metrik dan tabel diselaraskan dengan filter ini</span>
        </div>
      </div>

      {rmProfilesError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
          Profil RM gagal dimuat dari Supabase: {rmProfilesError}. Tabel monitoring hanya dapat menampilkan RM yang ditemukan pada jadwal atau follow-up.
        </p>
      )}

      {/* Weekly plan and actual visit counts are reported separately. */}
      <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 min-[1400px]:grid-cols-8">
        {/* Total RM */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">RM Terdaftar</span>
            <UsersRound size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{rmList.length}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">{rmList.filter((r) => r.status === 'approved').length} RM Aktif</p>
        </div>

        {/* Planned appointments */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jadwal Direncanakan</span>
            <CalendarDays size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{visitMetrics.plannedCount}</p>
          <p className="mt-1 text-[11px] text-slate-500">Periode ini</p>
        </div>

        {/* Actual visits */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Realisasi (Selesai)</span>
            <CalendarCheck2 size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{visitMetrics.completedCount}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Check-in selesai pada periode</p>
        </div>

        {/* Visits not yet completed */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Belum Terlaksana</span>
            <CalendarClock size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{visitMetrics.pendingCount}</p>
          <p className="mt-1 text-[11px] text-slate-500">Status Terjadwal</p>
        </div>

        {/* Reschedule */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Reschedule</span>
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{visitMetrics.rescheduledCount}</p>
          <p className="mt-1 text-[11px] text-amber-600">Jadwal ulang</p>
        </div>

        {/* Tidak Ditemui */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tidak Ditemui</span>
            <XCircle size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{visitMetrics.notMetCount}</p>
          <p className="mt-1 text-[11px] text-rose-600">Perlu kunjungan ulang</p>
        </div>

        {/* Historical cancellations remain visible as their own outcome. */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Batal</span>
            <XCircle size={16} className="text-slate-500" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-700">{visitMetrics.cancelledCount}</p>
          <p className="mt-1 text-[11px] text-slate-500">Tidak dihitung sebagai jadwal aktif</p>
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
              Jadwal yang direncanakan dan realisasi check-in dihitung terpisah untuk setiap RM.
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
                <th className="px-4 py-3 text-center">Jadwal</th>
                <th className="px-4 py-3 text-center">Realisasi</th>
                <th className="px-4 py-3 text-center">Belum Terlaksana</th>
                <th className="px-4 py-3 text-center">Reschedule</th>
                <th className="px-4 py-3 text-center">Tidak Ditemui</th>
                <th className="px-4 py-3 text-center">Batal</th>
                <th className="px-4 py-3 text-center">FU Terlambat</th>
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
                    {row.plannedCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold text-emerald-700 bg-emerald-50/30">
                    {row.completedCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-amber-700">
                    {row.pendingCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-amber-700">
                    {row.rescheduledCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-rose-700">
                    {row.notMetCount}
                  </td>
                  <td className="px-4 py-3.5 text-center font-semibold text-slate-600">
                    {row.cancelledCount}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      row.overdue > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {row.overdue}
                    </span>
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

        {auditLogsError && (
          <p className="border-b border-amber-100 bg-amber-50 px-5 py-2 text-xs text-amber-800" role="status">
            Aktivitas terbaru gagal dimuat: {auditLogsError}
          </p>
        )}

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

              const detailSummary = (() => {
                if (log.action === AUDIT_ACTIONS.RESCHEDULE_VISIT) {
                  return `Reschedule jadwal kunjungan ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''} ke ${log.details?.newDate ? formatDate(log.details.newDate) : ''} pukul ${log.details?.newTime || ''} ${log.details?.notes ? `— "${log.details.notes}"` : ''}`
                }
                if (log.action === AUDIT_ACTIONS.DELETE_JADWAL) {
                  return `Menghapus jadwal kunjungan ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''} ${log.details?.reason ? `(${log.details.reason})` : ''}`
                }
                if (log.action === AUDIT_ACTIONS.CHECK_IN_VISIT) {
                  return `Check-in GPS berhasil divalidasi (jarak ${log.details?.distanceMeters ?? '±0'} meter dari titik nasabah)`
                }
                if (log.action === AUDIT_ACTIONS.CREATE_JADWAL) {
                  return `Membuat jadwal kunjungan baru pada ${log.details?.date ? formatDate(log.details.date) : ''} pukul ${log.details?.time || ''}`
                }
                if (log.action === AUDIT_ACTIONS.COMPLETE_FOLLOW_UP) {
                  return `Menyelesaikan follow-up nasabah ${log.details?.resultNotes ? `— "${log.details.resultNotes}"` : ''}`
                }
                if (log.action === AUDIT_ACTIONS.CANCEL_FOLLOW_UP) {
                  return 'Membatalkan tindak lanjut nasabah'
                }
                if (log.action === AUDIT_ACTIONS.DELETE_FOLLOW_UP) {
                  return 'Menghapus item follow-up nasabah'
                }
                return log.details?.customerName || log.details?.nama || log.entityType
              })()

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
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs sm:grid-cols-6">
              <div>
                <p className="text-[10px] text-slate-400">Jadwal</p>
                <p className="text-base font-bold text-slate-900 mt-0.5">{detailRm.plannedCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-emerald-600">Realisasi</p>
                <p className="text-base font-bold text-emerald-700 mt-0.5">{detailRm.completedCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-600">Belum Terlaksana</p>
                <p className="text-base font-bold text-amber-700 mt-0.5">{detailRm.pendingCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-amber-600">Reschedule</p>
                <p className="text-base font-bold text-amber-700 mt-0.5">{detailRm.rescheduledCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-rose-600">Tidak Ditemui</p>
                <p className="text-base font-bold text-rose-700 mt-0.5">{detailRm.notMetCount}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500">Batal</p>
                <p className="text-base font-bold text-slate-700 mt-0.5">{detailRm.cancelledCount}</p>
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
                      <div key={apt.id} className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{cust?.name || `Nasabah #${apt.customerId}`}</p>
                          <p className="text-[11px] text-slate-500 font-mono">{formatDate(apt.date)} · {apt.time} · {apt.purpose}</p>
                          {apt.notes && <p className="mt-1 max-w-xl text-[11px] text-slate-600">{apt.notes}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
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
