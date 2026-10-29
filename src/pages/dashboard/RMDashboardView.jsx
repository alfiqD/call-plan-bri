import { useState, useMemo } from 'react'
import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  Clock,
  Clock3,
  MapPin,
  Plus,
  RotateCcw,
  ShieldCheck,
  Target,
  UserCheck,
  XCircle,
} from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import VisitUpdateModal from '../../components/VisitUpdateModal'
import CustomerDistributionMap from '../../components/CustomerDistributionMap'
import { formatDate, getAppointmentDateTime, getCustomer, localDateKey } from '../../data/workspace'
import { calculateFollowUpMetrics, getFollowUpStatusInfo } from '../../services/followUp'

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const MONTHLY_TARGET_VISITS = 25 // Standar target kunjungan bulanan per RM di BRI

function RMDashboardView({
  customers = [],
  appointments = [],
  followUps = [],
  onSaveVisit,
  onSaveFollowUp,
  onNotify,
  onNavigate,
  userProfile,
}) {
  const today = localDateKey()
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1 // 1-12

  // Month & Year Filter
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [visitAppointment, setVisitAppointment] = useState(null)

  // Calculate Period Dates
  const periodRange = useMemo(() => {
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    const end = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { start, end, label: `${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}` }
  }, [selectedMonth, selectedYear])

  // Filter ONLY appointments in selected period (workspace already isolated to this RM)
  const periodAppointments = useMemo(() => {
    return appointments.filter((apt) => apt.date >= periodRange.start && apt.date <= periodRange.end)
  }, [appointments, periodRange])

  // Metrics for RM
  const totalPeriod = periodAppointments.length
  const completedPeriod = periodAppointments.filter((a) => a.status === 'Selesai').length
  const rescheduledPeriod = periodAppointments.filter((a) => a.status === 'Reschedule').length
  const unmetPeriod = periodAppointments.filter((a) => a.status === 'Tidak ditemui').length

  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.status === 'Terjadwal' && a.date >= today)
      .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`))
  }, [appointments, today])

  // Follow-up metrics
  const followUpMetrics = useMemo(() => {
    return calculateFollowUpMetrics(followUps, today)
  }, [followUps, today])

  // Today's Appointments
  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [appointments, today])

  // Target Achievement
  const achievementRate = Math.min(100, Math.round((completedPeriod / MONTHLY_TARGET_VISITS) * 100))

  const greeting = currentDate.getHours() < 11 ? 'Selamat pagi' : currentDate.getHours() < 15 ? 'Selamat siang' : 'Selamat sore'
  const rmName = userProfile?.nama || 'Relationship Manager'

  const handleSaveVisit = async (updated) => {
    await onSaveVisit(updated)
    setVisitAppointment(null)
    onNotify?.('Hasil kunjungan berhasil diperbarui.')
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Greeting */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#eaf3fb] px-2 py-0.5 text-[10px] font-bold text-[#00529b] border border-blue-200">
              <UserCheck size={11} /> Relationship Manager
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-semibold text-slate-500">Bank BRI KCP Iskandar Palembang</span>
          </div>
          <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            {greeting}, {rmName}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            {formatDate(today, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · Pantau target dan agenda kunjungan Anda.
          </p>
        </div>

        {/* Period Filter for RM */}
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="form-control text-xs py-1.5"
          >
            {MONTH_NAMES.map((m, idx) => (
              <option key={m} value={idx + 1}>{m}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="form-control text-xs py-1.5"
          >
            {[2024, 2025, 2026, 2027].map((yr) => (
              <option key={yr} value={yr}>{yr}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => onNavigate?.('schedule')}
            className="button-orange text-xs py-1.5 shrink-0"
          >
            <Plus size={14} /> Buat Jadwal
          </button>
        </div>
      </div>

      {/* Urgent Follow-up Alert Banner */}
      {followUpMetrics.urgentCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs text-rose-800 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-700">
              <Clock3 size={15} />
            </span>
            <div>
              <p className="font-bold text-rose-900">Perhatian: Ada Tindak Lanjut Mendesak</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                {followUpMetrics.overdueCount > 0 && `${followUpMetrics.overdueCount} terlambat`}
                {followUpMetrics.overdueCount > 0 && followUpMetrics.todayCount > 0 && ' dan '}
                {followUpMetrics.todayCount > 0 && `${followUpMetrics.todayCount} jatuh tempo hari ini`}
                . Segera hubungi nasabah agar tidak terlewat.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('follow-up')}
            className="shrink-0 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 transition"
          >
            Buka Follow-up
          </button>
        </div>
      )}

      {/* 6 RM KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {/* Jadwal Periode */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jadwal Saya</span>
            <CalendarDays size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalPeriod}</p>
          <p className="mt-1 text-[11px] text-slate-500">{periodRange.label}</p>
        </div>

        {/* Kunjungan Selesai */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Kunjungan Selesai</span>
            <CalendarCheck2 size={16} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">{completedPeriod}</p>
          <p className="mt-1 text-[11px] text-emerald-600 font-semibold">Tervalidasi GPS</p>
        </div>

        {/* Jadwal Mendatang */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jadwal Mendatang</span>
            <CalendarClock size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{upcomingAppointments.length}</p>
          <p className="mt-1 text-[11px] text-slate-500">Mulai hari ini</p>
        </div>

        {/* Reschedule & Tidak Ditemui */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Perlu Tindak Lanjut</span>
            <RotateCcw size={16} className="text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-700">{rescheduledPeriod + unmetPeriod}</p>
          <p className="mt-1 text-[11px] text-amber-600">{rescheduledPeriod} Reschedule · {unmetPeriod} Unmet</p>
        </div>

        {/* Follow-up Mendesak */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Follow-up Mendesak</span>
            <Clock3 size={16} className="text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">{followUpMetrics.urgentCount}</p>
          <p className="mt-1 text-[11px] text-rose-600">{followUpMetrics.overdueCount} Terlambat · {followUpMetrics.todayCount} Hari Ini</p>
        </div>

        {/* Target Kunjungan Bulanan */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Target Bulanan</span>
            <Target size={16} className="text-[#00529b]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#00529b]">{completedPeriod}<span className="text-xs text-slate-400 font-normal"> / {MONTHLY_TARGET_VISITS}</span></p>
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full rounded-full bg-[#00529b]" style={{ width: `${achievementRate}%` }} />
          </div>
        </div>
      </div>

      {/* Peta Sebaran Lokasi Seluruh Nasabah RM */}
      <CustomerDistributionMap
        customers={customers}
        appointments={appointments}
        isAdmin={false}
        onNavigate={onNavigate}
        height="430px"
      />

      {/* Main Grid: Agenda Hari Ini & Samping Widgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (2 Cols): Agenda Kunjungan Hari Ini */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Agenda Kunjungan Hari Ini</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  {todayAppointments.length} agenda untuk tanggal {formatDate(today)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate?.('schedule')}
                className="text-xs font-semibold text-[#00529b] hover:underline"
              >
                Lihat Kalender Lengkap
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {todayAppointments.length > 0 ? (
                todayAppointments.map((item) => {
                  const customer = customers.find((c) => String(c.id) === String(item.customerId))

                  return (
                    <div key={item.id} className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#00529b] bg-[#eaf3fb] px-2 py-0.5 rounded">
                            {item.time}
                          </span>
                          <span className="font-bold text-sm text-slate-900 truncate">
                            {customer?.name || `Nasabah #${item.customerId}`}
                          </span>
                          <StatusBadge status={item.status} />
                          {item.priority === 'Tinggi' && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700">
                              Prioritas
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1 truncate">
                          <MapPin size={12} className="shrink-0 text-slate-400" />
                          {customer?.address || 'Alamat belum diatur'}
                        </p>

                        <p className="mt-0.5 text-[11px] text-slate-400">
                          Tujuan: <strong className="text-slate-600 font-medium">{item.purpose}</strong>
                          {item.notes && ` · Catatan: "${item.notes}"`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => setVisitAppointment(item)}
                          className="button-primary text-xs py-1.5"
                        >
                          {item.status === 'Selesai' ? 'Lihat / Ubah Hasil' : 'Update / Check-in GPS'}
                        </button>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <CalendarCheck2 className="mx-auto size-8 text-slate-300 mb-1" />
                  <p className="font-semibold text-slate-700">Tidak ada agenda kunjungan hari ini</p>
                  <p className="mt-0.5 text-slate-400">Buat jadwal baru untuk menjadwalkan kunjungan nasabah.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Tindak Lanjut Terdekat & Kategori Follow-up */}
        <div className="space-y-4">
          {/* Tindak Lanjut Terdekat */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Tindak Lanjut Terdekat</h3>
              <button
                type="button"
                onClick={() => onNavigate?.('follow-up')}
                className="text-[11px] font-semibold text-[#00529b] hover:underline"
              >
                Lihat Semua
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100">
              {followUps
                .filter((f) => f.status === 'Belum Dilakukan')
                .slice(0, 4)
                .map((f) => {
                  const cust = customers.find((c) => String(c.id) === String(f.customerId))
                  const { isOverdue, isDueToday } = getFollowUpStatusInfo(f, today)

                  return (
                    <div key={f.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 truncate">{cust?.name || f.customerName || 'Nasabah'}</p>
                        <span className={`inline-block rounded px-1.5 py-0.2 text-[9px] font-bold ${
                          isOverdue ? 'bg-rose-100 text-rose-700' : isDueToday ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {isOverdue ? 'Terlambat' : isDueToday ? 'Hari Ini' : formatDate(f.date)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {f.type} · "{f.notes}"
                      </p>
                    </div>
                  )
                })}
              {followUps.filter((f) => f.status === 'Belum Dilakukan').length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Semua tindak lanjut telah selesai.</p>
              )}
            </div>
          </div>

          {/* Quick Support Card */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-slate-700 space-y-2">
            <div className="flex items-center gap-2 text-[#00529b] font-bold">
              <ShieldCheck size={16} />
              <span>Standard Operational Procedure (SOP)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Check-in GPS wajib dilakukan di lokasi nasabah dengan toleransi radius maksimal 100 meter. Pastikan mengambil foto bukti dan mencatat hasil pertemuan secara akurat.
            </p>
          </div>
        </div>
      </div>

      {/* Visit Update Modal */}
      {visitAppointment && (
        <VisitUpdateModal
          appointment={visitAppointment}
          customer={getCustomer(customers, visitAppointment.customerId)}
          onClose={() => setVisitAppointment(null)}
          onSubmit={handleSaveVisit}
          onScheduleFollowUp={async (followUpData) => {
            await onSaveFollowUp(followUpData)
            onNotify?.('Tindak lanjut berhasil dijadwalkan.')
          }}
        />
      )}
    </div>
  )
}

export default RMDashboardView
