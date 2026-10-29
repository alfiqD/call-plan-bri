import { useState, useMemo } from 'react'
import {
  Calendar,
  CalendarCheck2,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  MessageSquare,
  Phone,
  PhoneCall,
  Plus,
  RotateCcw,
  UserCheck,
  XCircle,
} from 'lucide-react'
import Modal from './Modal'
import { formatDate } from '../data/workspace'

function CustomerActivityTimelineModal({
  customer,
  appointments = [],
  followUps = [],
  onClose,
  onNewAppointment,
  onNewFollowUp,
}) {
  const [filterType, setFilterType] = useState('Semua') // 'Semua', 'Kunjungan', 'Follow-up'
  const [displayCount, setDisplayCount] = useState(10)

  // Consolidate actual events from database/workspace
  const timelineEvents = useMemo(() => {
    if (!customer?.id) return []

    const customerAppointments = appointments.filter(
      (a) => String(a.customerId) === String(customer.id)
    )
    const customerFollowUps = followUps.filter(
      (f) => String(f.customerId) === String(customer.id)
    )

    const events = []

    // Map appointments
    for (const a of customerAppointments) {
      if (a.status === 'Selesai') {
        events.push({
          id: `apt-done-${a.id}`,
          category: 'Kunjungan',
          date: a.date,
          time: a.time || '09:00',
          title: `Kunjungan Selesai · ${a.purpose}`,
          status: 'Selesai',
          notes: a.notes,
          distanceMeters: a.checkInDistanceMeters,
          checkInAt: a.checkInAt,
          priority: a.priority,
          icon: CalendarCheck2,
          color: 'emerald',
        })
      } else if (a.status === 'Reschedule') {
        events.push({
          id: `apt-reschedule-${a.id}`,
          category: 'Kunjungan',
          date: a.date,
          time: a.time || '09:00',
          title: `Kunjungan Dijadwalkan Ulang · ${a.purpose}`,
          status: 'Reschedule',
          notes: a.notes,
          priority: a.priority,
          icon: RotateCcw,
          color: 'amber',
        })
      } else if (a.status === 'Tidak ditemui') {
        events.push({
          id: `apt-unmet-${a.id}`,
          category: 'Kunjungan',
          date: a.date,
          time: a.time || '09:00',
          title: `Nasabah Tidak Ditemui · ${a.purpose}`,
          status: 'Tidak ditemui',
          notes: a.notes,
          priority: a.priority,
          icon: XCircle,
          color: 'rose',
        })
      } else {
        events.push({
          id: `apt-plan-${a.id}`,
          category: 'Kunjungan',
          date: a.date,
          time: a.time || '09:00',
          title: `Agenda Kunjungan · ${a.purpose}`,
          status: 'Terjadwal',
          notes: a.notes,
          priority: a.priority,
          icon: Calendar,
          color: 'blue',
        })
      }
    }

    // Map follow-ups
    for (const f of customerFollowUps) {
      if (f.status === 'Selesai') {
        events.push({
          id: `fu-done-${f.id}`,
          category: 'Follow-up',
          date: f.date,
          time: f.time || '09:00',
          title: `Tindak Lanjut Selesai (${f.type})`,
          status: 'Selesai',
          notes: f.resultNotes || f.notes,
          priority: f.priority,
          completedAt: f.completedAt,
          icon: CheckCircle2,
          color: 'emerald',
        })
      } else if (f.status === 'Dibatalkan') {
        events.push({
          id: `fu-cancel-${f.id}`,
          category: 'Follow-up',
          date: f.date,
          time: f.time || '09:00',
          title: `Tindak Lanjut Dibatalkan (${f.type})`,
          status: 'Dibatalkan',
          notes: f.notes,
          priority: f.priority,
          icon: XCircle,
          color: 'slate',
        })
      } else {
        events.push({
          id: `fu-plan-${f.id}`,
          category: 'Follow-up',
          date: f.date,
          time: f.time || '09:00',
          title: `Agenda Tindak Lanjut (${f.type})`,
          status: 'Belum Dilakukan',
          notes: f.notes,
          priority: f.priority,
          icon: CalendarClock,
          color: 'blue',
        })
      }
    }

    // Sort descending (latest date and time first)
    return events.sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
  }, [customer, appointments, followUps])

  const filteredEvents = useMemo(() => {
    if (filterType === 'Semua') return timelineEvents
    return timelineEvents.filter((ev) => ev.category === filterType)
  }, [timelineEvents, filterType])

  const visibleEvents = filteredEvents.slice(0, displayCount)

  const statusBadgeClass = (status) => {
    switch (status) {
      case 'Selesai':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'Reschedule':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'Tidak ditemui':
        return 'bg-rose-50 text-rose-700 border-rose-200'
      case 'Dibatalkan':
        return 'bg-slate-100 text-slate-700 border-slate-200'
      case 'Terjadwal':
      case 'Belum Dilakukan':
      default:
        return 'bg-blue-50 text-[#00529b] border-blue-200'
    }
  }

  return (
    <Modal
      title={`Riwayat Aktivitas: ${customer.name}`}
      description="Kronologi terpadu kunjungan lapangan dan tindak lanjut nasabah"
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        {/* Customer Header Info */}
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{customer.name}</span>
              <span className="rounded bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200">
                {customer.type}
              </span>
              <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#00529b] border border-blue-200">
                {customer.loanStatus}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              <Phone size={12} className="inline mr-1 text-slate-400" />
              {customer.phone || '-'} · <MapPin size={12} className="inline mr-1 text-slate-400" />
              {customer.address}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onNewFollowUp?.(customer)
              }}
              className="button-secondary text-xs py-1.5"
            >
              <Plus size={13} /> Follow-up
            </button>
            <button
              type="button"
              onClick={() => {
                onClose()
                onNewAppointment?.(customer)
              }}
              className="button-orange text-xs py-1.5"
            >
              <Plus size={13} /> Jadwal Kunjungan
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <div className="flex items-center gap-1">
            {['Semua', 'Kunjungan', 'Follow-up'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setFilterType(tab)
                  setDisplayCount(10)
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  filterType === tab
                    ? 'bg-[#eaf3fb] text-[#00529b] border border-blue-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab} ({tab === 'Semua' ? timelineEvents.length : timelineEvents.filter((e) => e.category === tab).length})
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-400">
            Total {filteredEvents.length} aktivitas
          </span>
        </div>

        {/* Timeline Container */}
        <div className="max-h-[420px] overflow-y-auto pr-1">
          {visibleEvents.length > 0 ? (
            <div className="relative border-l-2 border-slate-200 ml-4 space-y-6 py-2">
              {visibleEvents.map((item) => {
                const IconComponent = item.icon

                return (
                  <div key={item.id} className="relative pl-6">
                    {/* Timeline Node Dot */}
                    <div
                      className={`absolute -left-[17px] top-1 flex size-8 items-center justify-center rounded-full border-2 bg-white shadow-xs ${
                        item.color === 'emerald'
                          ? 'border-emerald-500 text-emerald-600'
                          : item.color === 'amber'
                            ? 'border-amber-500 text-amber-600'
                            : item.color === 'rose'
                              ? 'border-rose-500 text-rose-600'
                              : 'border-[#00529b] text-[#00529b]'
                      }`}
                    >
                      <IconComponent size={14} />
                    </div>

                    {/* Timeline Event Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-slate-300">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{item.title}</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 uppercase">
                            {item.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] text-slate-500">
                            {formatDate(item.date)} · {item.time}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${statusBadgeClass(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      {/* Content & Notes */}
                      {item.notes ? (
                        <p className="mt-2 text-xs leading-relaxed text-slate-700 italic border-l-2 border-slate-300 pl-2">
                          "{item.notes}"
                        </p>
                      ) : (
                        <p className="mt-1.5 text-xs text-slate-400">Tidak ada catatan tambahan.</p>
                      )}

                      {/* Details (GPS or completion) */}
                      {item.distanceMeters !== undefined && item.distanceMeters !== null && (
                        <div className="mt-2.5 flex items-center gap-2 text-[11px] text-emerald-700 bg-emerald-50/70 rounded-md px-2.5 py-1 border border-emerald-100">
                          <MapPin size={13} />
                          <span>Validasi GPS Check-in: Terverifikasi radius ±{item.distanceMeters} m dari nasabah</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
              <CalendarClock className="mx-auto size-8 text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-700">Belum ada riwayat aktivitas</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Rencanakan kunjungan pertama atau buat follow-up untuk memulai timeline nasabah ini.
              </p>
            </div>
          )}

          {/* Load More Button */}
          {visibleEvents.length < filteredEvents.length && (
            <div className="pt-3 text-center">
              <button
                type="button"
                onClick={() => setDisplayCount((c) => c + 10)}
                className="button-secondary text-xs"
              >
                Muat Lebih Banyak ({filteredEvents.length - visibleEvents.length} tersisa)
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button type="button" onClick={onClose} className="button-secondary">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerActivityTimelineModal
