import { useState, useMemo } from 'react'
import {
  CalendarCheck2,
  CalendarDays,
  Clock3,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Plus,
  RotateCcw,
} from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'
import VisitUpdateModal from '../../components/VisitUpdateModal'
import CustomerDistributionMap from '../../components/CustomerDistributionMap'
import { formatDate, getCustomer, localDateKey } from '../../data/workspace'
import { calculateFollowUpMetrics, getFollowUpStatusInfo } from '../../services/followUp'
import { calculateVisitMetrics, getWeekDateRange } from '../../services/visitMetrics'

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

  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekDateRange(currentDate).start)
  const [visitAppointment, setVisitAppointment] = useState(null)

  const periodRange = useMemo(() => {
    const range = getWeekDateRange(new Date(`${selectedWeekStart}T12:00:00`))
    return {
      ...range,
      label: `${formatDate(range.start)} - ${formatDate(range.end)}`,
    }
  }, [selectedWeekStart])

  const visitMetrics = useMemo(
    () => calculateVisitMetrics(appointments, periodRange),
    [appointments, periodRange]
  )

  const followUpMetrics = useMemo(() => {
    return calculateFollowUpMetrics(followUps, today)
  }, [followUps, today])

  const todayAppointments = useMemo(() => {
    return appointments
      .filter((a) => a.date === today)
      .sort((a, b) => a.time.localeCompare(b.time))
  }, [appointments, today])

  const greeting = currentDate.getHours() < 11 ? 'Selamat pagi' : currentDate.getHours() < 15 ? 'Selamat siang' : 'Selamat sore'
  const rmName = userProfile?.nama || 'Petugas RM'

  const handleSaveVisit = async (updated) => {
    await onSaveVisit(updated)
    setVisitAppointment(null)
    onNotify?.('Hasil kunjungan berhasil diperbarui.')
  }

  return (
    <div className="rm-dashboard space-y-5">
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#00529b]/70">
            {periodRange.label}
          </p>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-[22px]">
            {greeting}, {rmName}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Jadwal dan aktivitas kunjungan minggu ini
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg border border-slate-200/80 bg-white p-0.5 shadow-[0_1px_1px_rgba(15,23,42,0.03)]">
            <button
              type="button"
              onClick={() => {
                const previousWeek = new Date(`${periodRange.start}T12:00:00`)
                previousWeek.setDate(previousWeek.getDate() - 7)
                setSelectedWeekStart(getWeekDateRange(previousWeek).start)
              }}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-50 hover:text-[#00529b]"
              aria-label="Minggu sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <input
              id="rm-week-start"
              type="date"
              value={selectedWeekStart}
              onChange={(event) => {
                if (event.target.value) {
                  setSelectedWeekStart(getWeekDateRange(new Date(`${event.target.value}T12:00:00`)).start)
                }
              }}
              className="form-control w-[min(100%,10.5rem)] border-0 py-1 text-xs shadow-none focus:ring-0"
              aria-label="Pilih minggu"
            />
            <button
              type="button"
              onClick={() => {
                const nextWeek = new Date(`${periodRange.start}T12:00:00`)
                nextWeek.setDate(nextWeek.getDate() + 7)
                setSelectedWeekStart(getWeekDateRange(nextWeek).start)
              }}
              className="rounded-md p-2 text-slate-500 transition hover:bg-slate-50 hover:text-[#00529b]"
              aria-label="Minggu berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onNavigate?.('schedule')}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px"
          >
            <Plus size={15} /> Buat Jadwal
          </button>
        </div>
      </div>

      {/* ── Urgent Follow-up Alert ───────────────────────────────────── */}
      {followUpMetrics.urgentCount > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-rose-200/80 bg-rose-50/70 px-4 py-2.5 text-xs text-rose-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-rose-100 text-rose-600">
              <Clock3 size={13} strokeWidth={2.2} />
            </span>
            <span className="leading-relaxed">
              <strong className="font-semibold">Perhatian:</strong> Ada{' '}
              {followUpMetrics.overdueCount > 0 && <span className="font-semibold">{followUpMetrics.overdueCount} follow-up terlambat</span>}
              {followUpMetrics.overdueCount > 0 && followUpMetrics.todayCount > 0 && ' dan '}
              {followUpMetrics.todayCount > 0 && <span className="font-semibold">{followUpMetrics.todayCount} jatuh tempo hari ini</span>}.
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('follow-up')}
            className="shrink-0 self-start rounded-md bg-rose-600 px-2.5 py-1 text-[11px] font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06)] transition hover:bg-rose-700 sm:self-auto"
          >
            Lihat Follow-up
          </button>
        </div>
      )}

      {/* ── KPI Cards (4 kartu esensial, ringkas & hemat ruang) ──────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Jadwal Minggu Ini"
          value={visitMetrics.plannedCount}
          helper="Rencana kunjungan"
          icon={CalendarDays}
          tone="blue"
          featured
        />
        <MetricCard
          label="Kunjungan Selesai"
          value={visitMetrics.completedCount}
          helper="Realisasi kunjungan"
          icon={CalendarCheck2}
          tone="emerald"
        />
        <MetricCard
          label="Perlu Tindak Lanjut"
          value={visitMetrics.rescheduledCount + visitMetrics.notMetCount}
          helper={`${visitMetrics.rescheduledCount} Reschedule · ${visitMetrics.notMetCount} Tidak ditemui`}
          icon={RotateCcw}
          tone="amber"
        />
        <MetricCard
          label="Follow-up Mendesak"
          value={followUpMetrics.urgentCount}
          helper={`${followUpMetrics.overdueCount} Terlambat · ${followUpMetrics.todayCount} Hari ini`}
          icon={Clock3}
          tone="rose"
        />
      </div>

      {/* ── MAIN LAYOUT: Agenda (kiri) + Widgets (kanan) ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        {/* Agenda Kunjungan Hari Ini */}
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <SectionHeader
            icon={CalendarCheck2}
            title="Agenda Kunjungan Hari Ini"
            subtitle={`${todayAppointments.length} agenda · ${formatDate(today)}`}
            trailing={
              <button
                type="button"
                onClick={() => onNavigate?.('schedule')}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#00529b] transition hover:gap-1.5"
              >
                <span>Kalender Lengkap</span>
                <ChevronRight size={12} />
              </button>
            }
          />

          <div className="divide-y divide-slate-100">
            {todayAppointments.length > 0 ? (
              todayAppointments.map((item) => {
                const customer = customers.find((c) => String(c.id) === String(item.customerId))

                return (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 p-4 transition-colors hover:bg-[#f9fbfe] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-[#00529b]/15 bg-[#eaf3fb] px-2 py-0.5 font-mono text-[11px] font-bold text-[#00529b]">
                          {item.time}
                        </span>
                        <span className="truncate text-[13px] font-semibold text-slate-900">
                          {customer?.name || `Nasabah #${item.customerId}`}
                        </span>
                        <StatusBadge status={item.status} />
                        {item.priority === 'Tinggi' && (
                          <span className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600">
                            Prioritas
                          </span>
                        )}
                      </div>

                      <p className="mt-1 flex items-center gap-1 truncate text-[11.5px] text-slate-500">
                        <MapPin size={12} className="shrink-0 text-slate-400" />
                        {customer?.address || 'Alamat belum diatur'}
                      </p>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        Tujuan: <strong className="font-semibold text-slate-700">{item.purpose}</strong>
                        {item.notes && <span className="text-slate-400"> · "{item.notes}"</span>}
                      </p>
                    </div>

                    <div className="flex w-full shrink-0 items-center justify-end sm:w-auto">
                      <button
                        type="button"
                        onClick={() => setVisitAppointment(item)}
                        className="inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-lg bg-[#00529b] px-4 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:w-auto"
                      >
                        {item.status === 'Execute' ? 'Tahap Administrasi' : item.status === 'Selesai' ? 'Lihat Hasil' : 'Check-in GPS'}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center gap-1.5 p-8 text-center">
                <CalendarCheck2 className="size-8 text-slate-300" />
                <p className="text-xs font-semibold text-slate-700">Tidak ada agenda kunjungan hari ini</p>
                <p className="text-[11px] text-slate-400">Buat jadwal baru untuk merencanakan kunjungan nasabah.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Tindak Lanjut Terdekat */}
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] self-start">
          <SectionHeader
            icon={Clock3}
            title="Tindak Lanjut Terdekat"
            trailing={
              <button
                type="button"
                onClick={() => onNavigate?.('follow-up')}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#00529b] transition hover:gap-1.5"
              >
                <span>Lihat Semua</span>
                <ChevronRight size={12} />
              </button>
            }
          />

          <div className="divide-y divide-slate-100">
            {followUps
              .filter((f) => f.status === 'Belum Dilakukan')
              .slice(0, 4)
              .map((f) => {
                const cust = customers.find((c) => String(c.id) === String(f.customerId))
                const { isOverdue, isDueToday } = getFollowUpStatusInfo(f, today)

                return (
                  <div key={f.id} className="px-4 py-2.5 transition-colors hover:bg-[#f9fbfe]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[12px] font-semibold text-slate-900">
                        {cust?.name || f.customerName || 'Nasabah'}
                      </p>
                      <span
                        className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9.5px] font-bold ${isOverdue
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/70'
                            : isDueToday
                              ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70'
                              : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200/70'
                          }`}
                      >
                        {isOverdue ? 'Terlambat' : isDueToday ? 'Hari Ini' : formatDate(f.date)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">
                      {f.type} · "{f.notes}"
                    </p>
                  </div>
                )
              })}
            {followUps.filter((f) => f.status === 'Belum Dilakukan').length === 0 && (
              <div className="flex flex-col items-center gap-1 p-6 text-center">
                <Clock3 size={18} className="text-slate-300" />
                <p className="text-[11px] text-slate-400">Semua tindak lanjut telah selesai.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Customer Distribution Map (proporsional) ─────────────────── */}
      <div id="rm-customer-map" className="scroll-mt-20">
        <CustomerDistributionMap
          customers={customers}
          appointments={appointments}
          isAdmin={false}
          onNavigate={onNavigate}
          height="360px"
        />
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