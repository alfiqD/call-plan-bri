import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
  X,
} from 'lucide-react'
import { AUDIT_ACTIONS, ENTITY_TYPES, fetchAuditLogs } from '../../services/auditLog'
import { formatDate } from '../../data/workspace'
import Modal from '../../components/Modal'

const actionLabels = {
  [AUDIT_ACTIONS.LOGIN]: 'Login Berhasil',
  [AUDIT_ACTIONS.LOGOUT]: 'Logout',
  [AUDIT_ACTIONS.CREATE_NASABAH]: 'Tambah Nasabah',
  [AUDIT_ACTIONS.UPDATE_NASABAH]: 'Ubah Nasabah',
  [AUDIT_ACTIONS.DELETE_NASABAH]: 'Hapus Nasabah',
  [AUDIT_ACTIONS.CREATE_JADWAL]: 'Buat Jadwal',
  [AUDIT_ACTIONS.UPDATE_JADWAL]: 'Ubah Jadwal',
  [AUDIT_ACTIONS.DELETE_JADWAL]: 'Hapus Jadwal',
  [AUDIT_ACTIONS.CHECK_IN_VISIT]: 'Check-in GPS',
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'Reschedule Kunjungan',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'Kunjungan Tidak Ditemui',
  [AUDIT_ACTIONS.CREATE_FOLLOW_UP]: 'Buat Follow-up',
  [AUDIT_ACTIONS.UPDATE_FOLLOW_UP]: 'Ubah Follow-up',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'Selesaikan Follow-up',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'Batalkan Follow-up',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'Hapus Follow-up',
  [AUDIT_ACTIONS.APPROVE_USER]: 'Persetujuan Akun',
  [AUDIT_ACTIONS.UPDATE_ROLE]: 'Ubah Role Pengguna',
  [AUDIT_ACTIONS.REJECT_USER]: 'Tolak Akun',
}

const actionBadgeColors = {
  [AUDIT_ACTIONS.LOGIN]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.LOGOUT]: 'bg-slate-100 text-slate-700 border-slate-200',
  [AUDIT_ACTIONS.CREATE_NASABAH]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.UPDATE_NASABAH]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.DELETE_NASABAH]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.CREATE_JADWAL]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.UPDATE_JADWAL]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.DELETE_JADWAL]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.CHECK_IN_VISIT]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'bg-amber-50 text-amber-700 border-amber-200',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.CREATE_FOLLOW_UP]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.UPDATE_FOLLOW_UP]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'bg-slate-100 text-slate-700 border-slate-200',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'bg-rose-50 text-rose-700 border-rose-200',
  [AUDIT_ACTIONS.APPROVE_USER]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  [AUDIT_ACTIONS.UPDATE_ROLE]: 'bg-purple-50 text-purple-700 border-purple-200',
}

function formatAuditTimestamp(isoString) {
  if (!isoString) return '-'
  try {
    const d = new Date(isoString)
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d)
    const timeFormatted = d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
    return `${dateFormatted} ${timeFormatted}`
  } catch {
    return isoString
  }
}

function AuditLogPage({ isAdmin, onNavigate }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 15

  // Filters
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('Semua')
  const [entityFilter, setEntityFilter] = useState('Semua')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Detail Modal
  const [detailModal, setDetailModal] = useState(null)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchAuditLogs({
        page,
        pageSize,
        search,
        action: actionFilter,
        entityType: entityFilter,
        startDate,
        endDate,
      })
      setLogs(result.logs)
      setTotalPages(result.totalPages)
      setTotalCount(result.totalCount)
    } catch (err) {
      console.error('Gagal mengambil audit log:', err)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, search, actionFilter, entityFilter, startDate, endDate])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleResetFilters = () => {
    setSearch('')
    setActionFilter('Semua')
    setEntityFilter('Semua')
    setStartDate('')
    setEndDate('')
    setPage(1)
  }

  // Security guard for direct URL access by non-admin
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <ShieldAlert size={28} />
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">Akses Ditolak</h2>
        <p className="mt-1.5 text-xs text-slate-600">
          Halaman Audit Log hanya dapat diakses oleh akun dengan wewenang <b>Administrator</b>.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('dashboard')}
          className="button-primary mx-auto mt-5"
        >
          Kembali ke Dashboard
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded bg-[#eaf3fb] px-2 py-0.5 text-[10px] font-bold text-[#00529b] border border-blue-200">
              <Shield size={11} /> Kepatuhan & Keamanan Internal
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900 sm:text-xl">
            Audit Log Sistem & Rekam Jejak Aktivitas
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Catatan kronologis tindakan penting: autentikasi, nasabah, kunjungan, check-in, dan follow-up.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="button-secondary w-fit shrink-0"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Segarkan Log
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari aktor, ID, atau aksi..."
              className="form-control pl-9 text-xs"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value)
                setPage(1)
              }}
              className="form-control text-xs"
            >
              <option value="Semua">Semua Tindakan</option>
              <option value={AUDIT_ACTIONS.LOGIN}>Login Berhasil</option>
              <option value={AUDIT_ACTIONS.LOGOUT}>Logout</option>
              <option value={AUDIT_ACTIONS.CREATE_NASABAH}>Tambah Nasabah</option>
              <option value={AUDIT_ACTIONS.UPDATE_NASABAH}>Ubah Nasabah</option>
              <option value={AUDIT_ACTIONS.DELETE_NASABAH}>Hapus Nasabah</option>
              <option value={AUDIT_ACTIONS.CREATE_JADWAL}>Buat Jadwal</option>
              <option value={AUDIT_ACTIONS.CHECK_IN_VISIT}>Check-in GPS</option>
              <option value={AUDIT_ACTIONS.RESCHEDULE_VISIT}>Reschedule Kunjungan</option>
              <option value={AUDIT_ACTIONS.CREATE_FOLLOW_UP}>Buat Follow-up</option>
              <option value={AUDIT_ACTIONS.COMPLETE_FOLLOW_UP}>Selesaikan Follow-up</option>
              <option value={AUDIT_ACTIONS.CANCEL_FOLLOW_UP}>Batalkan Follow-up</option>
              <option value={AUDIT_ACTIONS.APPROVE_USER}>Persetujuan Akun</option>
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value)
                setPage(1)
              }}
              className="form-control text-xs"
            >
              <option value="Semua">Semua Jenis Objek</option>
              <option value={ENTITY_TYPES.AUTH}>Autentikasi (Sesi)</option>
              <option value={ENTITY_TYPES.NASABAH}>Nasabah</option>
              <option value={ENTITY_TYPES.JADWAL}>Jadwal Kunjungan</option>
              <option value={ENTITY_TYPES.FOLLOW_UP}>Follow-up</option>
              <option value={ENTITY_TYPES.PROFILE}>Profil & Akun</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="form-control text-xs"
              title="Dari tanggal"
            />
            <span className="text-xs text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="form-control text-xs"
              title="Sampai tanggal"
            />
          </div>
        </div>

        {(search || actionFilter !== 'Semua' || entityFilter !== 'Semua' || startDate || endDate) && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
            <span>Menampilkan hasil filter ({totalCount} catatan ditemukan)</span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-medium text-[#00529b] hover:underline"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3">Waktu Kejadian (WIB)</th>
              <th className="px-4 py-3">Pengguna / Aktor</th>
              <th className="px-4 py-3">Tindakan</th>
              <th className="px-4 py-3">Objek & ID</th>
              <th className="px-4 py-3">Ringkasan Perubahan</th>
              <th className="px-5 py-3 text-right">Rincian</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {logs.length > 0 ? (
              logs.map((item) => {
                const badgeColor = actionBadgeColors[item.action] || 'bg-slate-100 text-slate-700 border-slate-200'
                const actionText = actionLabels[item.action] || item.action

                return (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                      {formatAuditTimestamp(item.createdAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                          {(item.actorName || 'U').slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-slate-900">{item.actorName || 'Pengguna'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-slate-500 font-mono">{item.actorEmail || '-'}</span>
                            <span className={`inline-block rounded px-1 py-0.2 text-[9px] font-bold uppercase ${
                              item.actorRole === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-[#00529b]'
                            }`}>
                              {item.actorRole}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
                        {actionText}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 uppercase">
                        {item.entityType}
                      </span>
                      <span className="ml-1 text-[11px] font-mono text-slate-500">#{item.entityId}</span>
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-[11px] text-slate-600">
                      {item.details && Object.keys(item.details).length > 0 ? (
                        Object.entries(item.details)
                          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                          .join(', ')
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setDetailModal(item)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:text-[#00529b]"
                      >
                        <Eye size={12} /> Detail
                      </button>
                    </td>
                  </tr>
                )
              })
            ) : !loading ? (
              <tr>
                <td colSpan="6" className="py-12 text-center text-slate-400">
                  <FileText className="mx-auto size-8 text-slate-300 mb-1" />
                  Tidak ada catatan audit yang sesuai dengan filter.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>

        {/* Desktop Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-xs text-slate-500">
          <span>Menampilkan {logs.length} dari {totalCount} total catatan audit</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft size={13} /> Sebelumnya
            </button>
            <span className="font-semibold text-slate-700">
              Halaman {page} dari {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium hover:bg-slate-50 disabled:opacity-40"
            >
              Selanjutnya <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {logs.length > 0 ? (
          logs.map((item) => {
            const badgeColor = actionBadgeColors[item.action] || 'bg-slate-100 text-slate-700 border-slate-200'
            const actionText = actionLabels[item.action] || item.action

            return (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold border ${badgeColor}`}>
                      {actionText}
                    </span>
                    <p className="mt-1 text-xs font-bold text-slate-900">{item.actorName || 'Pengguna'}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{item.actorEmail || '-'}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono text-right">
                    {formatAuditTimestamp(item.createdAt)}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                  <div className="text-[11px] text-slate-500">
                    <span className="font-semibold uppercase">{item.entityType}</span> #{item.entityId}
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailModal(item)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00529b]"
                  >
                    <Eye size={12} /> Rincian Log
                  </button>
                </div>
              </div>
            )
          })
        ) : !loading ? (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
            Tidak ada catatan audit yang sesuai dengan filter.
          </div>
        ) : null}

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 text-xs">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-[11px] text-slate-600">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded border border-slate-200 px-2 py-1 font-medium disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {/* Detail Modal */}
      {detailModal && (
        <Modal
          title="Detail Catatan Audit"
          description={`ID Log: ${detailModal.id} · Disimpan pada sistem audit`}
          onClose={() => setDetailModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
              <div>
                <p className="text-slate-400 text-[10px]">Waktu Kejadian (WIB)</p>
                <p className="font-mono font-semibold text-slate-800 mt-0.5">
                  {formatAuditTimestamp(detailModal.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Tindakan</p>
                <p className="font-semibold text-slate-900 mt-0.5">
                  {actionLabels[detailModal.action] || detailModal.action}
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Aktor / Pengguna</p>
                <p className="font-semibold text-slate-800 mt-0.5">{detailModal.actorName}</p>
                <p className="font-mono text-[10px] text-slate-500">{detailModal.actorEmail} ({detailModal.actorRole})</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px]">Objek & ID</p>
                <p className="font-semibold text-slate-800 mt-0.5 capitalize">{detailModal.entityType}</p>
                <p className="font-mono text-[10px] text-slate-500">ID: {detailModal.entityId}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-slate-800 mb-1.5">Rincian Metadata / Field yang Berubah:</p>
              <pre className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-slate-900 p-3 text-[11px] font-mono text-emerald-400">
                {JSON.stringify(detailModal.details, null, 2)}
              </pre>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              * Data audit diamankan dengan prinsip append-only dan tidak dapat diubah oleh peran operasional.
            </p>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
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

export default AuditLogPage
