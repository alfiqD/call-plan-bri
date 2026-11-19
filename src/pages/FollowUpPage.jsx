import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  MessageSquare,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import FollowUpFormModal from '../components/FollowUpFormModal'
import CompleteFollowUpModal from '../components/CompleteFollowUpModal'
import { formatDate, localDateKey } from '../data/workspace'
import {
  calculateFollowUpMetrics,
  filterFollowUps,
  getFollowUpStatusInfo,
} from '../services/followUp'

const typeIcons = {
  Telepon: PhoneCall,
  WhatsApp: MessageSquare,
  'Pertemuan/Kunjungan Ulang': Users,
  'Melengkapi Dokumen': FileCheck2,
  'Penawaran Produk': BellRing,
  Lainnya: CalendarClock,
}

const TONE = {
  blue: { icon: 'text-[#00529b]', accent: '#00529b', value: 'text-slate-900' },
  emerald: { icon: 'text-emerald-600', accent: '#059669', value: 'text-emerald-700' },
  amber: { icon: 'text-amber-600', accent: '#d97706', value: 'text-amber-700' },
  rose: { icon: 'text-rose-600', accent: '#e11d48', value: 'text-rose-700' },
}

function MetricCard({ label, value, helper, icon: Icon, tone = 'blue', active, onClick }) {
  const t = TONE[tone]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex flex-col justify-between overflow-hidden rounded-xl bg-white p-3.5 text-left transition-all duration-300 hover:-translate-y-0.5 ${active
        ? 'border border-[#00529b]/40 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(0,82,155,0.28)] ring-1 ring-[#00529b]/20'
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
    </button>
  )
}

function FollowUpPage({
  customers = [],
  followUps = [],
  onSaveFollowUp,
  onCompleteFollowUp,
  onCancelFollowUp,
  onDeleteFollowUp,
  onNotify,
  isAdmin = false,
}) {
  const today = localDateKey()
  const [activeFilter, setActiveFilter] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeModal, setActiveModal] = useState(null)

  const metrics = useMemo(
    () => calculateFollowUpMetrics(followUps, today),
    [followUps, today]
  )

  const filteredList = useMemo(() => {
    const list = filterFollowUps(followUps, activeFilter, today)
    if (!searchQuery.trim()) return list

    const q = searchQuery.toLowerCase()
    return list.filter((item) => {
      const customer = customers.find((c) => String(c.id) === String(item.customerId))
      const custName = customer?.name || item.customerName || ''
      const custPhone = customer?.phone || item.customerPhone || ''
      const rmName = item.rmName || ''
      const notes = item.notes || ''
      return (
        custName.toLowerCase().includes(q) ||
        custPhone.toLowerCase().includes(q) ||
        rmName.toLowerCase().includes(q) ||
        notes.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      )
    })
  }, [followUps, activeFilter, today, searchQuery, customers])

  const handleCancelClick = async (item) => {
    if (window.confirm(`Batalkan agenda tindak lanjut untuk ${item.customerName || 'nasabah ini'}?`)) {
      try {
        await onCancelFollowUp(item.id)
        onNotify?.('Follow-up berhasil dibatalkan.')
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal membatalkan follow-up.')
      }
    }
  }

  const handleDeleteClick = async (item) => {
    if (window.confirm('Hapus permanen tindak lanjut ini?')) {
      try {
        await onDeleteFollowUp(item.id)
        onNotify?.('Follow-up berhasil dihapus.')
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus follow-up.')
      }
    }
  }

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
              Follow-up
            </h2>
            {metrics.urgentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                <AlertTriangle size={11} /> {metrics.urgentCount} Mendesak
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Pengingat dan riwayat tindak lanjut nasabah pasca kunjungan
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal({ type: 'create' })}
          className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:self-auto"
        >
          <Plus size={15} /> Tambah Follow-up
        </button>
      </div>

      {/* ── Metric Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Hari Ini"
          value={metrics.todayCount}
          helper="Jatuh tempo"
          icon={Clock}
          tone="amber"
          active={activeFilter === 'Hari Ini'}
          onClick={() => setActiveFilter('Hari Ini')}
        />
        <MetricCard
          label="Terlambat"
          value={metrics.overdueCount}
          helper="Melewati batas"
          icon={AlertTriangle}
          tone="rose"
          active={activeFilter === 'Terlambat'}
          onClick={() => setActiveFilter('Terlambat')}
        />
        <MetricCard
          label="Mendatang"
          value={metrics.upcomingCount}
          helper="Agenda lanjutan"
          icon={CalendarClock}
          tone="blue"
          active={activeFilter === 'Mendatang'}
          onClick={() => setActiveFilter('Mendatang')}
        />
        <MetricCard
          label="Selesai"
          value={metrics.completedCount}
          helper="Tuntas"
          icon={CheckCircle2}
          tone="emerald"
          active={activeFilter === 'Selesai'}
          onClick={() => setActiveFilter('Selesai')}
        />
      </div>

      {/* ── Filter Tabs & Search ────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama nasabah, telepon, atau catatan..."
            className="form-control pl-9 text-xs"
          />
        </div>

        <div className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-slate-200/80 bg-slate-50 p-1 sm:w-auto">
          {['Semua', 'Hari Ini', 'Mendatang', 'Terlambat', 'Selesai'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`min-h-[36px] shrink-0 whitespace-nowrap rounded-[6px] px-3 py-1.5 text-xs font-semibold transition-all ${activeFilter === tab
                ? 'bg-white text-[#00529b] shadow-[0_1px_2px_rgba(15,23,42,0.08)]'
                : 'text-slate-500 hover:text-slate-800'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* ── Desktop Table View ──────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Nasabah</th>
                <th className="px-4 py-2.5">Jadwal</th>
                <th className="px-4 py-2.5">Jenis & Prioritas</th>
                <th className="px-4 py-2.5">Catatan / Hasil</th>
                <th className="px-4 py-2.5">Status</th>
                {isAdmin && <th className="px-4 py-2.5">RM</th>}
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredList.length > 0 ? (
                filteredList.map((item) => {
                  const customer = customers.find((c) => String(c.id) === String(item.customerId))
                  const { isOverdue, isDueToday, isCompleted, isCanceled } = getFollowUpStatusInfo(item, today)
                  const IconComponent = typeIcons[item.type] || CalendarClock

                  return (
                    <tr
                      key={item.id}
                      className={`group transition-colors ${isOverdue
                        ? 'bg-rose-50/30 hover:bg-rose-50/50'
                        : isDueToday
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-[#f9fbfe]'
                        }`}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                            {(customer?.name || item.customerName || 'N').slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {customer?.name || item.customerName || `Nasabah #${item.customerId}`}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              <a
                                href={`tel:${(customer?.phone || item.customerPhone || '').replace(/[^\d+]/g, '')}`}
                                className="inline-flex items-center gap-1 transition hover:text-[#00529b]"
                              >
                                <Phone size={10} className="text-slate-400" />
                                {customer?.phone || item.customerPhone || '-'}
                              </a>
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-1.5 font-medium tabular-nums text-slate-800">
                          <Clock size={12} className="text-slate-400" />
                          <span>{formatDate(item.date)} · {item.time}</span>
                        </div>
                        {isOverdue && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-700">
                            Terlambat
                          </span>
                        )}
                        {isDueToday && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800">
                            Hari Ini
                          </span>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700">
                            <IconComponent size={11} className="text-[#00529b]" />
                            {item.type}
                          </span>
                          <div>
                            <span
                              className={`inline-block rounded border px-1.5 py-0.5 text-[9.5px] font-semibold ${item.priority === 'Tinggi'
                                ? 'border-rose-200 bg-rose-50 text-rose-700'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="max-w-xs px-4 py-3">
                        <p className="line-clamp-1 text-[11.5px] text-slate-700">{item.notes}</p>
                        {item.resultNotes && (
                          <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-emerald-700">
                            Hasil: {item.resultNotes}
                          </p>
                        )}
                      </td>

                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10.5px] font-semibold ${isCompleted
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : isCanceled
                              ? 'border-slate-200 bg-slate-50 text-slate-600'
                              : 'border-blue-200 bg-blue-50 text-[#00529b]'
                            }`}
                        >
                          {isCompleted ? <CheckCircle2 size={11} /> : isCanceled ? <XCircle size={11} /> : <Clock size={11} />}
                          {item.status}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="whitespace-nowrap px-4 py-3 text-[11.5px] text-slate-600">
                          {item.rmName || 'RM'}
                        </td>
                      )}

                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!isCompleted && !isCanceled && (
                            <button
                              type="button"
                              onClick={() => setActiveModal({ type: 'complete', data: item })}
                              title="Tandai Selesai"
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:bg-emerald-100"
                            >
                              <CheckCircle2 size={11} /> Selesai
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveModal({ type: 'edit', data: item })}
                            title="Ubah"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil size={13} />
                          </button>
                          {!isCompleted && !isCanceled && (
                            <button
                              type="button"
                              onClick={() => handleCancelClick(item)}
                              title="Batalkan"
                              className="rounded-md p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                            >
                              <XCircle size={13} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item)}
                            title="Hapus"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center">
                    <CalendarClock className="mx-auto mb-1.5 size-8 text-slate-300" />
                    <p className="text-xs text-slate-400">Tidak ada agenda follow-up pada filter ini.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Card List View ───────────────────────────────────── */}
      <div className="block space-y-3 xl:hidden">
        {filteredList.length > 0 ? (
          filteredList.map((item) => {
            const customer = customers.find((c) => String(c.id) === String(item.customerId))
            const { isOverdue, isDueToday, isCompleted, isCanceled } = getFollowUpStatusInfo(item, today)
            const IconComponent = typeIcons[item.type] || CalendarClock

            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${isOverdue
                  ? 'border border-rose-300 ring-1 ring-rose-200/70'
                  : 'border border-slate-200/80'
                  }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                        {(customer?.name || item.customerName || 'N').slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-semibold text-slate-900">
                          {customer?.name || item.customerName || `Nasabah #${item.customerId}`}
                        </p>
                        <p className="truncate font-mono text-[10.5px] tabular-nums text-slate-400">
                          {formatDate(item.date)} · {item.time}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded border px-2 py-0.5 text-[9.5px] font-bold ${isCompleted
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : isCanceled
                          ? 'border-slate-200 bg-slate-50 text-slate-600'
                          : isOverdue
                            ? 'border-rose-200 bg-rose-50 text-rose-700'
                            : 'border-blue-200 bg-blue-50 text-[#00529b]'
                        }`}
                    >
                      {isCompleted ? 'Selesai' : isCanceled ? 'Dibatalkan' : isOverdue ? 'Terlambat' : item.status}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-700">
                      <IconComponent size={11} className="text-[#00529b]" />
                      {item.type}
                    </span>
                    <span className="rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[9.5px] text-slate-600">
                      {item.priority}
                    </span>
                    {isDueToday && (
                      <span className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9.5px] font-bold text-amber-800">
                        Hari Ini
                      </span>
                    )}
                  </div>

                  {item.notes && (
                    <p className="mt-2 line-clamp-2 text-[11.5px] text-slate-600">{item.notes}</p>
                  )}

                  {item.resultNotes && (
                    <p className="mt-1 text-[11px] font-medium text-emerald-700">Hasil: {item.resultNotes}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                  {!isCompleted && !isCanceled && (
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: 'complete', data: item })}
                      className="inline-flex min-h-[38px] items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-emerald-700 active:translate-y-px"
                    >
                      <CheckCircle2 size={13} /> Selesai
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: 'edit', data: item })}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item)}
                    title="Hapus"
                    className="flex size-9.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                    aria-label="Hapus follow-up"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <CalendarClock size={20} className="text-slate-300" />
            <p className="text-[11.5px] text-slate-400">Tidak ada agenda follow-up pada filter ini.</p>
          </div>
        )}
      </div>

      {/* ── Modals (tidak diubah) ──────────────────────────────────── */}
      {activeModal?.type === 'create' && (
        <FollowUpFormModal
          customers={customers}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            await onSaveFollowUp(data)
            onNotify?.('Agenda follow-up berhasil dijadwalkan.')
          }}
        />
      )}

      {activeModal?.type === 'edit' && (
        <FollowUpFormModal
          customers={customers}
          followUp={activeModal.data}
          onClose={() => setActiveModal(null)}
          onSubmit={async (data) => {
            await onSaveFollowUp(data)
            onNotify?.('Perubahan follow-up berhasil disimpan.')
          }}
        />
      )}

      {activeModal?.type === 'complete' && (
        <CompleteFollowUpModal
          followUp={activeModal.data}
          customer={customers.find((c) => String(c.id) === String(activeModal.data?.customerId))}
          onClose={() => setActiveModal(null)}
          onSubmit={async (id, notes) => {
            await onCompleteFollowUp(id, notes)
            onNotify?.('Tindak lanjut berhasil ditandai selesai.')
          }}
        />
      )}
    </div>
  )
}

export default FollowUpPage