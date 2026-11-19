import { useEffect, useState, useCallback } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldAlert,
} from 'lucide-react'
import { AUDIT_ACTIONS, ENTITY_TYPES, fetchAuditLogs } from '../../services/auditLog'
import Modal from '../../components/Modal'

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
  [AUDIT_ACTIONS.RESCHEDULE_VISIT]: 'Reschedule',
  [AUDIT_ACTIONS.UNMET_VISIT]: 'Tidak Ditemui',
  [AUDIT_ACTIONS.CREATE_FOLLOW_UP]: 'Buat Follow-up',
  [AUDIT_ACTIONS.UPDATE_FOLLOW_UP]: 'Ubah Follow-up',
  [AUDIT_ACTIONS.COMPLETE_FOLLOW_UP]: 'Selesaikan Follow-up',
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'Batalkan Follow-up',
  [AUDIT_ACTIONS.DELETE_FOLLOW_UP]: 'Hapus Follow-up',
  [AUDIT_ACTIONS.APPROVE_USER]: 'Persetujuan Akun',
  [AUDIT_ACTIONS.UPDATE_ROLE]: 'Ubah Role',
  [AUDIT_ACTIONS.REJECT_USER]: 'Tolak Akun',
}

const actionBadgeColors = {
  [AUDIT_ACTIONS.LOGIN]: 'bg-blue-50 text-[#00529b] border-blue-200',
  [AUDIT_ACTIONS.LOGOUT]: 'bg-slate-100 text-slate-600 border-slate-200',
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
  [AUDIT_ACTIONS.CANCEL_FOLLOW_UP]: 'bg-slate-100 text-slate-600 border-slate-200',
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

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('Semua')
  const [entityFilter, setEntityFilter] = useState('Semua')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
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

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md overflow-hidden rounded-xl border border-rose-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-rose-200/70 bg-rose-50 text-rose-600">
            <ShieldAlert size={24} strokeWidth={2.2} />
          </div>
          <h2 className="mt-4 text-base font-bold tracking-tight text-slate-900">Akses Dibatasi</h2>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
            Halaman Audit Log hanya dapat diakses oleh Administrator.
          </p>
          <button
            type="button"
            onClick={() => onNavigate?.('dashboard')}
            className="mx-auto mt-5 inline-flex items-center gap-1.5 rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    )
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
              Audit Log
            </h2>
            <span className="inline-flex items-center rounded-full border border-[#00529b]/20 bg-[#eaf3fb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#00529b]">
              {totalCount} Aktivitas
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Rekam jejak aktivitas sistem dan kepatuhan operasional
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          disabled={loading}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          <span>Segarkan Log</span>
        </button>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────────── */}
      <div className="space-y-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
              <option value={AUDIT_ACTIONS.LOGIN}>Login</option>
              <option value={AUDIT_ACTIONS.LOGOUT}>Logout</option>
              <option value={AUDIT_ACTIONS.CREATE_NASABAH}>Tambah Nasabah</option>
              <option value={AUDIT_ACTIONS.UPDATE_NASABAH}>Ubah Nasabah</option>
              <option value={AUDIT_ACTIONS.DELETE_NASABAH}>Hapus Nasabah</option>
              <option value={AUDIT_ACTIONS.CREATE_JADWAL}>Buat Jadwal</option>
              <option value={AUDIT_ACTIONS.CHECK_IN_VISIT}>Check-in GPS</option>
              <option value={AUDIT_ACTIONS.RESCHEDULE_VISIT}>Reschedule</option>
              <option value={AUDIT_ACTIONS.CREATE_FOLLOW_UP}>Buat Follow-up</option>
              <option value={AUDIT_ACTIONS.COMPLETE_FOLLOW_UP}>Selesaikan Follow-up</option>
              <option value={AUDIT_ACTIONS.CANCEL_FOLLOW_UP}>Batalkan Follow-up</option>
              <option value={AUDIT_ACTIONS.APPROVE_USER}>Persetujuan Akun</option>
            </select>
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value)
                setPage(1)
              }}
              className="form-control text-xs"
            >
              <option value="Semua">Semua Objek</option>
              <option value={ENTITY_TYPES.AUTH}>Autentikasi</option>
              <option value={ENTITY_TYPES.NASABAH}>Nasabah</option>
              <option value={ENTITY_TYPES.JADWAL}>Jadwal</option>
              <option value={ENTITY_TYPES.FOLLOW_UP}>Follow-up</option>
              <option value={ENTITY_TYPES.PROFILE}>Profil & Akun</option>
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="form-control py-1 text-xs"
              title="Dari tanggal"
            />
            <span className="text-xs text-slate-400">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="form-control py-1 text-xs"
              title="Sampai tanggal"
            />
          </div>
        </div>

        {(search || actionFilter !== 'Semua' || entityFilter !== 'Semua' || startDate || endDate) && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-1 pt-2.5 text-[11px] text-slate-500">
            <span>
              Ditemukan <strong className="font-semibold tabular-nums text-slate-700">{totalCount}</strong> catatan audit
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="rounded-md px-2 py-1 font-semibold text-[#00529b] transition hover:bg-[#eaf3fb]"
            >
              Reset Filter
            </button>
          </div>
        )}
      </div>

      {/* ── Desktop Table View ──────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Waktu (WIB)</th>
                <th className="px-4 py-2.5">Pengguna</th>
                <th className="px-4 py-2.5">Tindakan</th>
                <th className="px-4 py-2.5">Objek &amp; ID</th>
                <th className="px-4 py-2.5">Perubahan</th>
                <th className="px-5 py-2.5 text-right">Rincian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.length > 0 ? (
                logs.map((item) => {
                  const badgeColor = actionBadgeColors[item.action] || 'bg-slate-100 text-slate-700 border-slate-200'
                  const actionText = actionLabels[item.action] || item.action

                  return (
                    <tr key={item.id} className="group transition-colors hover:bg-[#f9fbfe]">
                      <td className="whitespace-nowrap px-5 py-3 font-mono text-[11px] tabular-nums text-slate-500">
                        {formatAuditTimestamp(item.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                            {(item.actorName || 'U').slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">{item.actorName || 'Pengguna'}</p>
                            <p className="truncate font-mono text-[10.5px] text-slate-400">{item.actorEmail || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                          {actionText}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="rounded border border-slate-200/80 bg-slate-50 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-600">
                          {item.entityType}
                        </span>
                        <span className="ml-1 font-mono text-[10.5px] text-slate-400">#{item.entityId}</span>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 text-[11px] text-slate-600">
                        {item.details && Object.keys(item.details).length > 0 ? (
                          Object.entries(item.details)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(', ')
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailModal(item)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
                        >
                          <Eye size={12} /> Detail
                        </button>
                      </td>
                    </tr>
                  )
                })
              ) : !loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center">
                    <FileText className="mx-auto mb-1.5 size-8 text-slate-300" />
                    <p className="text-xs text-slate-400">Tidak ada catatan audit yang sesuai dengan filter.</p>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-2 border-t border-slate-100 bg-[linear-gradient(180deg,#fbfdff_0%,#f8fafc_100%)] px-5 py-2.5 text-[11px] text-slate-500 sm:flex-row">
          <span className="tabular-nums">
            Menampilkan <strong className="font-semibold text-slate-700">{logs.length}</strong> dari{' '}
            <strong className="font-semibold text-slate-700">{totalCount}</strong> total catatan audit
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500"
            >
              <ChevronLeft size={13} /> Sebelumnya
            </button>
            <span className="rounded-md bg-slate-50 px-2 py-1 font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200/70">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500"
            >
              Selanjutnya <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile Card List View ───────────────────────────────────── */}
      <div className="block space-y-3 xl:hidden">
        {logs.length > 0 ? (
          logs.map((item) => {
            const badgeColor = actionBadgeColors[item.action] || 'bg-slate-100 text-slate-700 border-slate-200'
            const actionText = actionLabels[item.action] || item.action

            return (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300/80"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className={`inline-flex items-center rounded border px-2 py-0.5 text-[9.5px] font-bold ${badgeColor}`}>
                        {actionText}
                      </span>
                      <p className="mt-1 truncate text-[13px] font-semibold text-slate-900">{item.actorName || 'Pengguna'}</p>
                      <p className="truncate font-mono text-[10.5px] text-slate-400">{item.actorEmail || '-'}</p>
                    </div>
                    <span className="shrink-0 text-right font-mono text-[10px] tabular-nums text-slate-400">
                      {formatAuditTimestamp(item.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-3 py-2">
                  <div className="text-[10.5px] text-slate-500">
                    <span className="rounded border border-slate-200/80 bg-white px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-slate-600">
                      {item.entityType}
                    </span>
                    <span className="ml-1 font-mono text-[10px] text-slate-400">#{item.entityId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailModal(item)}
                    className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b]"
                  >
                    <Eye size={13} className="text-[#00529b]" /> Detail
                  </button>
                </div>
              </div>
            )
          })
        ) : !loading ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <FileText size={20} className="text-slate-300" />
            <p className="text-[11.5px] text-slate-400">Tidak ada catatan audit yang sesuai dengan filter.</p>
          </div>
        ) : null}

        {/* Mobile Pagination */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-2.5 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 font-medium transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="rounded-md bg-slate-50 px-2.5 py-1 font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200/70">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 font-medium transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Selanjutnya
          </button>
        </div>
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────── */}
      {detailModal && (
        <Modal
          title="Detail Catatan Audit"
          description={`ID Log: ${detailModal.id}`}
          onClose={() => setDetailModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-100 text-xs sm:grid-cols-4">
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium text-slate-400">Waktu (WIB)</p>
                <p className="mt-0.5 font-mono text-[11.5px] font-semibold tabular-nums text-slate-800">
                  {formatAuditTimestamp(detailModal.createdAt)}
                </p>
              </div>
              <div className="bg-white p-3">
                <p className="text-[10px] font-medium text-slate-400">Tindakan</p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-slate-900">
                  {actionLabels[detailModal.action] || detailModal.action}
                </p>
              </div>
              <div className="bg-white p-3 sm:col-span-2">
                <p className="text-[10px] font-medium text-slate-400">Pengguna</p>
                <p className="mt-0.5 text-[11.5px] font-semibold text-slate-800">{detailModal.actorName}</p>
                <p className="truncate font-mono text-[10px] text-slate-400">
                  {detailModal.actorEmail} ({detailModal.actorRole})
                </p>
              </div>
              <div className="bg-white p-3 sm:col-span-2">
                <p className="text-[10px] font-medium text-slate-400">Objek</p>
                <p className="mt-0.5 text-[11.5px] font-semibold capitalize text-slate-800">{detailModal.entityType}</p>
                <p className="font-mono text-[10px] text-slate-400">ID: {detailModal.entityId}</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 text-xs font-bold text-slate-800">Rincian Perubahan</p>
              <pre className="max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-emerald-400">
                {JSON.stringify(detailModal.details, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setDetailModal(null)}
                className="button-secondary !min-h-[44px] w-full sm:w-auto"
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