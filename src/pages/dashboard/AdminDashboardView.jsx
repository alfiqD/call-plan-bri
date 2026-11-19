import { useState, useMemo, useEffect } from 'react'
import {
  Activity,
  ArrowRight,
  CalendarCheck2,
  CalendarDays,
  Clock3,
  Eye,
  FileSpreadsheet,
  RotateCcw,
  Shield,
  UserCheck,
  UsersRound,
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
  [AUDIT_ACTIONS.COMPLETE_VISIT_ADMINISTRATION]: 'Selesaikan Administrasi',
  visit_administration_completed: 'Selesaikan Administrasi',
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'Reschedule',
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
  visit_administration_completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.CREATE_JADWAL]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.UPDATE_JADWAL]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'bg-slate-100 text-slate-600 border-slate-200',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'bg-rose-50 text-rose-700 border-rose-200',
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const TONE = {
  blue: { icon: 'text-[#00529b]', accent: '#00529b', value: 'text-slate-900' },
  emerald: { icon: 'text-emerald-600', accent: '#059669', value: 'text-emerald-700' },
  amber: { icon: 'text-amber-600', accent: '#d97706', value: 'text-amber-700' },
  rose: { icon: 'text-rose-600', accent: '#e11d48', value: 'text-rose-700' },
  slate: { icon: 'text-slate-400', accent: '#94a3b8', value: 'text-slate-700' },
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

function AdminDashboardView({
  customers = [],
  appointments = [],
  followUps = [],
  onNavigate,
}) {
  const currentDate = useMemo(() => new Date(), [])
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  const [filterMode, setFilterMode] = useState('weekly')
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [selectedRmId, setSelectedRmId] = useState('Semua')
  const [rmProfiles, setRmProfiles] = useState([])
  const [rmProfilesError, setRmProfilesError] = useState('')
  const [recentAuditLogs, setRecentAuditLogs] = useState([])
  const [auditLogsError, setAuditLogsError] = useState('')

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
        console.error('Gagal memuat aktivitas terbaru:', error)
        if (isActive) {
          setAuditLogsError(error instanceof Error ? error.message : 'Aktivitas terbaru gagal dimuat.')
        }
      }
    }

    void loadRecentAuditLogs()
    return () => { isActive = false }
  }, [appointments, followUps])

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

    return {
      start: customStartDate || '1970-01-01',
      end: customEndDate || '2099-12-31',
      label: customStartDate && customEndDate ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}` : 'Semua Tanggal',
    }
  }, [filterMode, selectedMonth, selectedYear, customStartDate, customEndDate, currentDate])

  const rmList = useMemo(() => {
    const map = new Map(rmProfiles.map((profile) => [
      profile.id,
      {
        id: profile.id,
        nama: profile.nama || 'RM',
        email: profile.email || '',
        status: profile.status,
        wilayah: profile.assigned_area || 'KCP Iskandar Palembang',
      },
    ]))

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
  }, [rmProfiles, appointments, followUps])

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

  const kpiMetrics = [
    { label: 'RM Terdaftar', value: rmList.length, helper: `${rmList.filter((r) => r.status === 'approved').length} aktif`, icon: UsersRound, tone: 'blue', featured: true },
    { label: 'Total Jadwal', value: visitMetrics.plannedCount, helper: 'Periode ini', icon: CalendarDays, tone: 'blue' },
    { label: 'Kunjungan Selesai', value: visitMetrics.completedCount, helper: 'Realisasi', icon: CalendarCheck2, tone: 'emerald' },
    { label: 'Perlu Tindak Lanjut', value: visitMetrics.rescheduledCount + visitMetrics.notMetCount, helper: `${visitMetrics.rescheduledCount} Reschedule · ${visitMetrics.notMetCount} Tidak Ditemui`, icon: RotateCcw, tone: 'amber' },
    { label: 'FU Terlambat', value: overdueFollowUpCount, helper: 'Perlu tindakan', icon: Clock3, tone: 'rose' },
  ]

  return (
    <div className="space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00529b]/70">
            KCP Iskandar Palembang
          </p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
            Dashboard Monitoring
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Monitoring jadwal kunjungan, validasi GPS, dan capaian Relationship Manager
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate?.('audit-log')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
          >
            <Shield size={14} /> Audit Log
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('admin-users')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
          >
            <UserCheck size={14} /> Kelola Pengguna
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.('reports')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#00529b] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px"
          >
            <FileSpreadsheet size={14} /> Status Kunjungan
          </button>
        </div>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 p-3.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex w-full items-center gap-0.5 rounded-lg border border-slate-200/80 bg-slate-50 p-0.5 sm:w-fit">
            {[
              { id: 'monthly', label: 'Bulanan' },
              { id: 'weekly', label: 'Minggu Ini' },
              { id: 'custom', label: 'Rentang Tanggal' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilterMode(item.id)}
                className={`flex-1 rounded-[6px] px-3 py-1.5 text-[11.5px] font-semibold transition-all sm:flex-none ${filterMode === item.id
                  ? 'bg-white text-[#00529b] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                  : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filterMode === 'monthly' && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="form-control py-1 text-xs"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="form-control py-1 text-xs"
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
                  className="form-control w-full py-1 text-xs sm:w-auto"
                />
                <span className="text-xs text-slate-400">–</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="form-control py-1 text-xs sm:w-auto"
                />
              </div>
            )}

            <select
              value={selectedRmId}
              onChange={(e) => setSelectedRmId(e.target.value)}
              className="form-control py-1 text-xs"
            >
              <option value="Semua">Seluruh RM</option>
              {rmList.map((rm) => (
                <option key={rm.id} value={rm.id}>{rm.nama}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[11.5px] font-semibold text-[#00529b] transition hover:bg-[#eaf3fb]"
            >
              <RotateCcw size={12} /> Reset
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-3.5 py-2 text-[11px] text-slate-500">
          <CalendarDays size={12} className="text-[#00529b]" />
          <span>Periode aktif:</span>
          <strong className="font-semibold text-slate-800">{dateRange.label}</strong>
          {selectedRmId !== 'Semua' && (
            <>
              <span className="text-slate-300">•</span>
              <span>RM: <span className="font-medium text-slate-700">{rmList.find((r) => r.id === selectedRmId)?.nama || selectedRmId}</span></span>
            </>
          )}
        </div>
      </div>

      {rmProfilesError && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800" role="status">
          Daftar RM gagal dimuat: {rmProfilesError}
        </p>
      )}

      {/* ── KPI Metric Cards (5 kartu esensial, ringkas & hemat ruang) ──────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {kpiMetrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* ── MAIN LAYOUT: Map (kiri) + Aktivitas (kanan) ──────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* Map — tinggi terkontrol, tidak lagi mendominasi */}
        <div className="min-w-0">
          <CustomerDistributionMap
            customers={customers}
            appointments={appointments}
            isAdmin={true}
            onNavigate={onNavigate}
            height="380px"
          />
        </div>

        {/* Aktivitas Terkini — kolom kanan, scrollable */}
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <SectionHeader
            icon={Activity}
            title="Aktivitas Terkini"
            subtitle="Log audit terbaru dari aktivitas pengguna"
          />

          {auditLogsError && (
            <p className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11px] text-amber-800" role="status">
              Gagal dimuat: {auditLogsError}
            </p>
          )}

          <div className="flex-1 divide-y divide-slate-100 xl:max-h-[380px] xl:overflow-y-auto">
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
                    return `Reschedule jadwal ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''} ke ${log.details?.newDate ? formatDate(log.details.newDate) : ''} ${log.details?.newTime || ''}`
                  }
                  if (log.action === AUDIT_ACTIONS.DELETE_JADWAL) {
                    return `Hapus jadwal ${log.details?.customerName ? `nasabah ${log.details.customerName}` : ''}`
                  }
                  if (log.action === AUDIT_ACTIONS.CHECK_IN_VISIT) {
                    return `Check-in GPS divalidasi (jarak ${log.details?.distanceMeters ?? '±0'} m)`
                  }
                  if (log.action === AUDIT_ACTIONS.CREATE_JADWAL) {
                    return `Jadwal baru: ${log.details?.date ? formatDate(log.details.date) : ''} ${log.details?.time || ''}`
                  }
                  if (log.action === AUDIT_ACTIONS.COMPLETE_FOLLOW_UP) {
                    return `Follow-up selesai ${log.details?.resultNotes ? `— "${log.details.resultNotes}"` : ''}`
                  }
                  if (log.action === AUDIT_ACTIONS.CANCEL_FOLLOW_UP) {
                    return 'Follow-up dibatalkan'
                  }
                  if (log.action === AUDIT_ACTIONS.DELETE_FOLLOW_UP) {
                    return 'Follow-up dihapus'
                  }
                  return log.details?.customerName || log.details?.nama || log.entityType
                })()

                return (
                  <div key={log.id} className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-[#f9fbfe]">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[9px] font-bold text-[#00529b]">
                      {log.actorName ? log.actorName.slice(0, 2).toUpperCase() : 'RM'}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[12px] font-semibold text-slate-900">{log.actorName}</span>
                        <span className={`inline-flex items-center rounded border px-1 py-px text-[9.5px] font-semibold ${badgeStyle}`}>
                          {label}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{detailSummary}</p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-slate-400">
                        {formattedDate} · {formattedTime} WIB
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center gap-1.5 p-8 text-center">
                <Activity size={18} className="text-slate-300" />
                <p className="text-[11px] text-slate-400">Belum ada aktivitas tercatat.</p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
            <button
              type="button"
              onClick={() => onNavigate?.('audit-log')}
              className="inline-flex w-full items-center justify-center gap-1 text-[11.5px] font-semibold text-[#00529b] transition hover:gap-1.5"
            >
              <span>Buka Seluruh Audit Log</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* ── RM Performance Table ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <SectionHeader
          icon={UsersRound}
          title="Kinerja Relationship Manager"
          subtitle="Rekapitulasi jadwal dan realisasi kunjungan pada periode aktif"
          trailing={
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
              <CalendarDays size={11} className="text-[#00529b]" />
              {dateRange.label}
            </span>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Nama RM</th>
                <th className="px-4 py-2.5">Wilayah</th>
                <th className="px-4 py-2.5 text-center">Jadwal</th>
                <th className="px-4 py-2.5 text-center">Selesai</th>
                <th className="px-4 py-2.5 text-center">Belum</th>
                <th className="px-4 py-2.5 text-center">Reschedule</th>
                <th className="px-4 py-2.5 text-center">Tidak Ditemui</th>
                <th className="px-4 py-2.5 text-center">Batal</th>
                <th className="px-4 py-2.5 text-center">FU Terlambat</th>
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {rmPerformance.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-[#f9fbfe]">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                        {row.nama.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[12.5px] font-semibold text-slate-900">{row.nama}</p>
                        <p className="truncate font-mono text-[10.5px] text-slate-400">{row.email || '-'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600">
                      {row.wilayah}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-[12.5px] font-bold tabular-nums text-slate-800">{row.plannedCount}</td>
                  <td className="px-4 py-3 text-center text-[12.5px] font-bold tabular-nums text-emerald-700">{row.completedCount}</td>
                  <td className="px-4 py-3 text-center text-[12.5px] font-semibold tabular-nums text-amber-700">{row.pendingCount}</td>
                  <td className="px-4 py-3 text-center text-[12.5px] font-semibold tabular-nums text-amber-700">{row.rescheduledCount}</td>
                  <td className="px-4 py-3 text-center text-[12.5px] font-semibold tabular-nums text-rose-700">{row.notMetCount}</td>
                  <td className="px-4 py-3 text-center text-[12.5px] tabular-nums text-slate-500">{row.cancelledCount}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex min-w-[22px] justify-center rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums ${row.overdue > 0
                        ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
                        : 'bg-slate-50 text-slate-500 ring-1 ring-slate-200/70'
                        }`}
                    >
                      {row.overdue}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setDetailRm(row)}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
                    >
                      <Eye size={12} /> Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── RM Detail Modal ──────────────────────────────────────────── */}
      {detailRm && (
        <Modal
          title={`Detail Kinerja: ${detailRm.nama}`}
          description={`Aktivitas pada periode ${dateRange.label}`}
          onClose={() => setDetailRm(null)}
          wide
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-center text-xs sm:grid-cols-7">
              {[
                { label: 'Jadwal', value: detailRm.plannedCount, cls: 'text-slate-900', sub: 'text-slate-500' },
                { label: 'Selesai', value: detailRm.completedCount, cls: 'text-emerald-700', sub: 'text-emerald-600' },
                { label: 'Belum', value: detailRm.pendingCount, cls: 'text-amber-700', sub: 'text-amber-600' },
                { label: 'Reschedule', value: detailRm.rescheduledCount, cls: 'text-amber-700', sub: 'text-amber-600' },
                { label: 'Tidak Ditemui', value: detailRm.notMetCount, cls: 'text-rose-700', sub: 'text-rose-600' },
                { label: 'Batal', value: detailRm.cancelledCount, cls: 'text-slate-700', sub: 'text-slate-500' },
                { label: 'FU Terlambat', value: detailRm.overdue, cls: 'text-rose-700', sub: 'text-rose-600' },
              ].map((s) => (
                <div key={s.label} className="bg-white px-2 py-2.5">
                  <p className={`text-[10px] font-medium ${s.sub}`}>{s.label}</p>
                  <p className={`mt-0.5 text-[15px] font-bold tabular-nums ${s.cls}`}>{s.value}</p>
                </div>
              ))}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold tracking-tight text-slate-800">Daftar Kunjungan Nasabah</h4>
              <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
                {detailRm.appointments.length > 0 ? (
                  detailRm.appointments.map((apt) => {
                    const cust = customers.find((c) => String(c.id) === String(apt.customerId))
                    return (
                      <div
                        key={apt.id}
                        className="flex flex-col justify-between gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs transition hover:border-[#00529b]/25 hover:bg-[#f9fbfe] sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900">{cust?.name || `Nasabah #${apt.customerId}`}</p>
                          <p className="text-[11px] text-slate-500">{formatDate(apt.date)} · {apt.time} · {apt.purpose}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={apt.status} />
                          {apt.checkInDistanceMeters !== undefined && apt.checkInDistanceMeters !== null && (
                            <span className="font-mono text-[10px] font-semibold text-emerald-600">
                              ±{apt.checkInDistanceMeters}m
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <p className="py-4 text-center text-xs text-slate-400">Tidak ada kunjungan pada periode ini.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button type="button" onClick={() => setDetailRm(null)} className="button-secondary">
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