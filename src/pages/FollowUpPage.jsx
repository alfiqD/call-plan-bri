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
  const [activeModal, setActiveModal] = useState(null) // { type: 'create' | 'edit' | 'complete', data }

  // Metrics
  const metrics = useMemo(
    () => calculateFollowUpMetrics(followUps, today),
    [followUps, today]
  )

  // Filtered & Searched list
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
    if (window.confirm(`Hapus permanen tindak lanjut ini?`)) {
      try {
        await onDeleteFollowUp(item.id)
        onNotify?.('Follow-up berhasil dihapus.')
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Gagal menghapus follow-up.')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header and Title */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Follow-up Reminder & Riwayat Tindak Lanjut
            </h2>
            {metrics.urgentCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 border border-rose-200">
                <AlertTriangle size={12} /> {metrics.urgentCount} Mendesak
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {isAdmin
              ? 'Monitoring agenda tindak lanjut seluruh Relationship Manager Bank BRI KCP Iskandar Palembang'
              : 'Pengingat dan pencatatan tindak lanjut nasabah pasca kunjungan agar tidak ada komitmen terlewat'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setActiveModal({ type: 'create' })}
          className="button-orange w-fit self-start sm:self-auto"
        >
          <Plus size={15} /> Tambah Follow-up
        </button>
      </div>

      {/* 4 Practical Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Hari Ini */}
        <button
          type="button"
          onClick={() => setActiveFilter('Hari Ini')}
          className={`rounded-xl border p-3.5 text-left transition shadow-xs ${
            activeFilter === 'Hari Ini'
              ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Jatuh Tempo Hari Ini</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Clock size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-amber-800">{metrics.todayCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Jatuh tempo hari ini</p>
        </button>

        {/* Terlambat */}
        <button
          type="button"
          onClick={() => setActiveFilter('Terlambat')}
          className={`rounded-xl border p-3.5 text-left transition shadow-xs ${
            activeFilter === 'Terlambat'
              ? 'border-rose-400 bg-rose-50/60 ring-2 ring-rose-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Terlambat (Overdue)</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-600">{metrics.overdueCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Melewati tanggal batas</p>
        </button>

        {/* Mendatang */}
        <button
          type="button"
          onClick={() => setActiveFilter('Mendatang')}
          className={`rounded-xl border p-3.5 text-left transition shadow-xs ${
            activeFilter === 'Mendatang'
              ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Mendatang</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-[#00529b]">
              <CalendarClock size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-slate-900">{metrics.upcomingCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Agenda terjadwal nanti</p>
        </button>

        {/* Selesai */}
        <button
          type="button"
          onClick={() => setActiveFilter('Selesai')}
          className={`rounded-xl border p-3.5 text-left transition shadow-xs ${
            activeFilter === 'Selesai'
              ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-200'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Selesai</span>
            <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 size={15} />
            </div>
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{metrics.completedCount}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">Telah dituntaskan</p>
        </button>
      </div>

      {/* Filter Tabs and Search Bar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama nasabah, nomor telepon, atau catatan..."
            className="form-control pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {['Semua', 'Hari Ini', 'Mendatang', 'Terlambat', 'Selesai'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                activeFilter === tab
                  ? 'bg-white text-[#00529b] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nasabah</th>
                <th className="px-4 py-3">Jadwal Follow-up</th>
                <th className="px-4 py-3">Jenis & Prioritas</th>
                <th className="px-4 py-3">Catatan / Rencana</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3">RM</th>}
                <th className="px-5 py-3 text-right">Aksi</th>
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
                      className={`hover:bg-slate-50/70 transition ${
                        isOverdue
                          ? 'bg-rose-50/25'
                          : isDueToday
                            ? 'bg-amber-50/25'
                            : ''
                      }`}
                    >
                      {/* Nasabah */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                            {(customer?.name || item.customerName || 'N').slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-900">
                              {customer?.name || item.customerName || `Nasabah #${item.customerId}`}
                            </p>
                            <p className="mt-0.5 text-[11px] text-slate-500">
                              <a
                                href={`tel:${(customer?.phone || item.customerPhone || '').replace(/[^\d+]/g, '')}`}
                                className="inline-flex items-center gap-1 hover:text-[#00529b]"
                              >
                                <Phone size={11} className="text-slate-400" />
                                {customer?.phone || item.customerPhone || '-'}
                              </a>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Schedule Date & Time */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-slate-800">
                            <Clock size={13} className="text-slate-400" />
                            <span>{formatDate(item.date)} · {item.time}</span>
                          </div>
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                              <AlertTriangle size={10} /> Terlambat
                            </span>
                          )}
                          {isDueToday && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                              <Clock size={10} /> Hari Ini
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type & Priority */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                            <IconComponent size={12} className="text-[#00529b]" />
                            {item.type}
                          </span>
                          <div>
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium border ${
                                item.priority === 'Tinggi'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : item.priority === 'Normal'
                                    ? 'bg-blue-50 text-[#00529b] border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Notes & Outcomes */}
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className="text-xs text-slate-700 line-clamp-2">{item.notes}</p>
                        {item.resultNotes && (
                          <p className="mt-1 text-[11px] text-emerald-700 font-medium line-clamp-2">
                            ✓ Hasil: {item.resultNotes}
                          </p>
                        )}
                        {item.appointmentId && (
                          <p className="mt-1 text-[10px] text-slate-400">
                            🔗 Dari Kunjungan #{item.appointmentId}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium border ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isCanceled
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-blue-50 text-[#00529b] border-blue-200'
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={12} /> : isCanceled ? <XCircle size={12} /> : <Clock size={12} />}
                          {item.status}
                        </span>
                      </td>

                      {/* RM Name (Admin only) */}
                      {isAdmin && (
                        <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap">
                          {item.rmName || 'RM'}
                        </td>
                      )}

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {!isCompleted && !isCanceled && (
                            <button
                              type="button"
                              onClick={() => setActiveModal({ type: 'complete', data: item })}
                              title="Tandai Selesai"
                              className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              <CheckCircle2 size={13} /> Selesai
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setActiveModal({ type: 'edit', data: item })}
                            title="Ubah Rincian"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          >
                            <Pencil size={14} />
                          </button>
                          {!isCompleted && !isCanceled && (
                            <button
                              type="button"
                              onClick={() => handleCancelClick(item)}
                              title="Batalkan Follow-up"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(item)}
                            title="Hapus"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center">
                    <CalendarClock className="mx-auto size-9 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada agenda follow-up</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {activeFilter !== 'Semua'
                        ? `Tidak ada data pada filter "${activeFilter}".`
                        : 'Klik tombol "+ Tambah Follow-up" untuk membuat agenda pengingat.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-400">
          Menampilkan {filteredList.length} dari {followUps.length} agenda tindak lanjut
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {filteredList.length > 0 ? (
          filteredList.map((item) => {
            const customer = customers.find((c) => String(c.id) === String(item.customerId))
            const { isOverdue, isDueToday, isCompleted, isCanceled } = getFollowUpStatusInfo(item, today)
            const IconComponent = typeIcons[item.type] || CalendarClock

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 shadow-xs bg-white ${
                  isOverdue ? 'border-rose-300 ring-1 ring-rose-200' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                      {(customer?.name || item.customerName || 'N').slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">
                        {customer?.name || item.customerName || `Nasabah #${item.customerId}`}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {formatDate(item.date)} · {item.time}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isCanceled
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : isOverdue
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-[#00529b] border-blue-200'
                    }`}
                  >
                    {isCompleted ? 'Selesai' : isCanceled ? 'Dibatalkan' : isOverdue ? 'Terlambat' : item.status}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                    <IconComponent size={12} className="text-[#00529b]" />
                    {item.type}
                  </span>
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                    Prio: {item.priority}
                  </span>
                  {isDueToday && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      Hari Ini
                    </span>
                  )}
                </div>

                {item.notes && (
                  <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                    {item.notes}
                  </p>
                )}

                {item.resultNotes && (
                  <p className="mt-1 text-[11px] text-emerald-700 font-medium">
                    ✓ Hasil: {item.resultNotes}
                  </p>
                )}

                <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                  {!isCompleted && !isCanceled && (
                    <button
                      type="button"
                      onClick={() => setActiveModal({ type: 'complete', data: item })}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700"
                    >
                      <CheckCircle2 size={13} /> Selesaikan
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveModal({ type: 'edit', data: item })}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(item)}
                    className="inline-flex items-center rounded-md border border-slate-200 bg-white p-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <CalendarClock className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Tidak ada agenda follow-up</p>
            <p className="mt-0.5 text-xs text-slate-400">Pilih tab filter lain atau tambah agenda baru.</p>
          </div>
        )}
      </div>

      {/* Modal Dialogs */}
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
