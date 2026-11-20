import { lazy, Suspense, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  History,
  Lock,
  MapPin,
  MoreHorizontal,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UsersRound,
} from 'lucide-react'
import CustomerForm from '../components/CustomerForm'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import CustomerFollowUpHistoryModal from '../components/CustomerFollowUpHistoryModal'
import CustomerActivityTimelineModal from '../components/CustomerActivityTimelineModal'
import FollowUpFormModal from '../components/FollowUpFormModal'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))
const PAGE_SIZE = 10

function CustomersPage({
  customers = [],
  appointments = [],
  followUps = [],
  onSaveCustomer,
  onDeleteCustomer,
  onSaveFollowUp,
  onNotify,
  onNavigate,
  isAdmin,
  currentUserId,
}) {
  const [query, setQuery] = useState('')
  const [customerKindFilter, setCustomerKindFilter] = useState('')
  const [businessTypeFilter, setBusinessTypeFilter] = useState('')
  const [loanStatusFilter, setLoanStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mapCustomer, setMapCustomer] = useState(null)
  const [historyCustomer, setHistoryCustomer] = useState(null)
  const [followUpCustomer, setFollowUpCustomer] = useState(null)
  const [timelineCustomer, setTimelineCustomer] = useState(null)
  const [customerToDelete, setCustomerToDelete] = useState(null)
  const [expandedActionsId, setExpandedActionsId] = useState(null)
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')

  const canManageCustomer = (customer) => isAdmin || customer.createdByRmId === currentUserId

  const filterOptions = useMemo(() => ({
    customerKinds: [...new Set(customers.map((c) => c.customerKind).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'id')),
    businessTypes: [...new Set(customers.map((c) => c.businessType).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'id')),
    loanStatuses: [...new Set(customers.map((c) => c.loanStatus).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'id')),
  }), [customers])

  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const matchesQuery = `${customer.name} ${customer.customerKind || ''} ${customer.businessType || ''} ${customer.picName || ''} ${customer.phone || ''} ${customer.noRekening || ''} ${customer.address || ''}`.toLowerCase().includes(query.trim().toLowerCase())
    return matchesQuery
      && (!customerKindFilter || customer.customerKind === customerKindFilter)
      && (!businessTypeFilter || customer.businessType === businessTypeFilter)
      && (!loanStatusFilter || customer.loanStatus === loanStatusFilter)
  }), [customers, query, customerKindFilter, businessTypeFilter, loanStatusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleCustomers = useMemo(
    () => filteredCustomers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredCustomers, currentPage],
  )

  const resetFilters = () => {
    setQuery('')
    setCustomerKindFilter('')
    setBusinessTypeFilter('')
    setLoanStatusFilter('')
    setPage(1)
  }

  const saveCustomer = async (customer) => {
    const savedCustomer = await onSaveCustomer(customer)
    setEditingCustomer(null)
    setIsCreating(false)
    setActionError('')
    onNotify('Data nasabah berhasil disimpan.')
    return savedCustomer
  }

  const requestDeleteCustomer = (customer) => {
    if (!isAdmin) {
      setActionError('Penghapusan data nasabah hanya dapat dilakukan oleh Administrator.')
      return
    }
    setDeleteError('')
    setCustomerToDelete(customer)
  }

  const deleteCustomer = async () => {
    if (!customerToDelete || isDeletingCustomer) return
    setIsDeletingCustomer(true)
    setDeleteError('')
    setActionError('')
    try {
      await onDeleteCustomer(customerToDelete.id)
      setCustomerToDelete(null)
      onNotify('Nasabah dinonaktifkan.')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Nasabah gagal dinonaktifkan.')
    } finally {
      setIsDeletingCustomer(false)
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
              Data Nasabah
            </h2>
            <span className="inline-flex items-center rounded-full border border-[#00529b]/20 bg-[#eaf3fb] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[#00529b]">
              {filteredCustomers.length} / {customers.length}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Daftar debitur dan prospek KCP Iskandar Palembang
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="inline-flex min-h-[40px] items-center gap-1.5 self-start rounded-lg bg-[#00529b] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_1px_1px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-[#00447f] active:translate-y-px sm:self-auto"
        >
          <Plus size={15} /> Tambah Nasabah
        </button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700" role="alert">
          {actionError}
        </div>
      )}

      {/* ── Filter Toolbar ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="Cari nama nasabah, PIC, jenis usaha, no. rekening, atau telepon..."
            className="form-control pl-9 text-xs"
            aria-label="Cari nasabah"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <select
            value={customerKindFilter}
            onChange={(event) => { setCustomerKindFilter(event.target.value); setPage(1) }}
            className="form-control text-xs"
            aria-label="Filter jenis nasabah"
          >
            <option value="">Semua Jenis</option>
            {filterOptions.customerKinds.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select
            value={businessTypeFilter}
            onChange={(event) => { setBusinessTypeFilter(event.target.value); setPage(1) }}
            className="form-control text-xs"
            aria-label="Filter jenis usaha"
          >
            <option value="">Semua Jenis Usaha</option>
            {filterOptions.businessTypes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <select
            value={loanStatusFilter}
            onChange={(event) => { setLoanStatusFilter(event.target.value); setPage(1) }}
            className="form-control text-xs"
            aria-label="Filter status pinjaman"
          >
            <option value="">Semua Status Pinjaman</option>
            {filterOptions.loanStatuses.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            disabled={!query && !customerKindFilter && !businessTypeFilter && !loanStatusFilter}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Hapus Filter
          </button>
        </div>
      </div>

      {/* ── Desktop Table View ──────────────────────────────────────── */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] xl:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/60 text-[10px] font-bold uppercase tracking-[0.06em] text-slate-500">
                <th className="px-5 py-2.5">Nama Nasabah</th>
                <th className="px-4 py-2.5">Jenis</th>
                <th className="px-4 py-2.5">Usaha</th>
                <th className="px-4 py-2.5">PIC</th>
                <th className="px-4 py-2.5">No. Rekening</th>
                <th className="px-4 py-2.5">Telepon</th>
                <th className="px-4 py-2.5">Status Pinjaman</th>
                <th className="px-4 py-2.5">Alamat</th>
                <th className="px-5 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleCustomers.length > 0 ? (
                visibleCustomers.map((customer) => (
                  <tr key={customer.id} className="group transition-colors hover:bg-[#f9fbfe]">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.customerKind || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.businessType || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{customer.picName || '-'}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                      {customer.noRekening ? `•••• ${customer.noRekening.slice(-4)}` : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1 text-slate-700 transition hover:text-[#00529b]"
                      >
                        <Phone size={11} className="text-slate-400" />
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={customer.loanStatus} />
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-slate-500">
                      {customer.address || '-'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={() => setTimelineCustomer(customer)}
                          title="Timeline Aktivitas"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-[#eaf3fb] hover:text-[#00529b]"
                        >
                          <History size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryCustomer(customer)}
                          title="Follow-up"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-amber-50 hover:text-amber-600"
                        >
                          <CalendarClock size={14} />
                        </button>
                        {canManageCustomer(customer) ? (
                          <button
                            type="button"
                            onClick={() => setEditingCustomer(customer)}
                            title="Ubah Data"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil size={14} />
                          </button>
                        ) : (
                          <span
                            title="Hanya dapat diubah oleh pembuat data atau Admin"
                            className="cursor-not-allowed p-1.5 text-slate-300"
                          >
                            <Lock size={14} />
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => requestDeleteCustomer(customer)}
                            title="Nonaktifkan"
                            className="rounded-md p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <UsersRound className="mx-auto mb-1.5 size-8 text-slate-300" />
                    <p className="text-xs text-slate-400">Data nasabah tidak ditemukan.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile Card List View ───────────────────────────────────── */}
      <div className="block space-y-3 xl:hidden">
        {visibleCustomers.length > 0 ? (
          visibleCustomers.map((customer) => (
            <div
              key={customer.id}
              className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:border-slate-300/80"
            >
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-[#00529b]/15 bg-[#eaf3fb] text-[10px] font-bold text-[#00529b]">
                      {customer.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-slate-900">{customer.name}</p>
                      <p className="truncate font-mono text-[10.5px] text-slate-400">
                        {customer.noRekening ? `Rek: •••• ${customer.noRekening.slice(-4)}` : '-'}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={customer.loanStatus} />
                </div>

                <div className="mt-2.5 space-y-1 text-xs text-slate-600">
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <a
                      href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
                      className="inline-flex items-center gap-1 font-medium text-[#00529b]"
                    >
                      <Phone size={11} /> {customer.phone}
                    </a>
                    {customer.picName && (
                      <span className="text-slate-400">· PIC: {customer.picName}</span>
                    )}
                  </p>
                  {customer.address && (
                    <p className="flex items-start gap-1 text-[11px] text-slate-500">
                      <MapPin size={11} className="mt-0.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-1">{customer.address}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/60 p-2.5">
                {/* Baris Aksi Utama (Peta, Follow-up, Edit + Menu Tambahan) */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMapCustomer(customer)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] active:translate-y-px"
                  >
                    <MapPin size={14} className="text-[#00529b]" />
                    <span>Peta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHistoryCustomer(customer)}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] active:translate-y-px"
                  >
                    <CalendarClock size={14} className="text-amber-600" />
                    <span>Follow-up</span>
                  </button>
                  {canManageCustomer(customer) && (
                    <button
                      type="button"
                      onClick={() => setEditingCustomer(customer)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] active:translate-y-px"
                    >
                      <Pencil size={14} className="text-slate-600" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setExpandedActionsId((current) => current === customer.id ? null : customer.id)}
                    className={`inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-lg border px-2.5 py-2 text-xs font-semibold transition shadow-2xs active:translate-y-px ${
                      expandedActionsId === customer.id
                        ? 'border-[#00529b] bg-[#eaf3fb] text-[#00529b]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                    }`}
                    title="Tindakan lainnya"
                    aria-label="Tindakan lainnya"
                    aria-expanded={expandedActionsId === customer.id}
                  >
                    <MoreHorizontal size={16} />
                  </button>
                </div>

                {/* Panel Tindakan Tambahan: Timeline & Hapus */}
                {expandedActionsId === customer.id && (
                  <div className="mt-2 flex flex-col gap-1.5 border-t border-slate-200/80 pt-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setTimelineCustomer(customer)}
                      className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-2xs transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] active:translate-y-px"
                    >
                      <History size={14} className="text-[#00529b]" />
                      <span>Lihat Timeline Aktivitas</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => requestDeleteCustomer(customer)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-600 shadow-2xs transition hover:bg-rose-50 active:translate-y-px sm:px-4"
                      >
                        <Trash2 size={14} />
                        <span>Hapus Nasabah</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white p-8 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <UsersRound className="size-8 text-slate-300" />
            <p className="text-xs text-slate-400">Data nasabah tidak ditemukan.</p>
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {filteredCustomers.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-[11.5px] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:flex-row">
          <span className="tabular-nums">
            Menampilkan{' '}
            <strong className="font-semibold text-slate-700">
              {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)}
            </strong>{' '}
            dari <strong className="font-semibold text-slate-700">{filteredCustomers.length}</strong> nasabah
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500"
            >
              <ChevronLeft size={13} /> Sebelumnya
            </button>
            <span className="rounded-md bg-slate-50 px-2 py-1 font-semibold tabular-nums text-slate-700 ring-1 ring-slate-200/70">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 font-medium shadow-[0_1px_1px_rgba(15,23,42,0.03)] transition hover:border-[#00529b]/30 hover:bg-[#f7fbff] hover:text-[#00529b] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-500"
            >
              Selanjutnya <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Forms & Modals (tidak diubah) ──────────────────────────── */}
      {(isCreating || editingCustomer) && (
        <CustomerForm
          customer={editingCustomer}
          onClose={() => { setIsCreating(false); setEditingCustomer(null) }}
          onSubmit={saveCustomer}
        />
      )}

      {customerToDelete && (
        <Modal
          title="Nonaktifkan Nasabah"
          description={`Nonaktifkan data ${customerToDelete.name}?`}
          onClose={() => {
            if (!isDeletingCustomer) {
              setCustomerToDelete(null)
              setDeleteError('')
            }
          }}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <p className="text-[11px] leading-relaxed">
                Nasabah akan disembunyikan dari daftar aktif. Jadwal dan riwayat kunjungan tetap tersimpan di sistem.
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-600" role="alert">{deleteError}</p>
            )}

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-100 pt-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setCustomerToDelete(null)
                  setDeleteError('')
                }}
                disabled={isDeletingCustomer}
                className="button-secondary w-full sm:w-auto"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteCustomer}
                disabled={isDeletingCustomer}
                className="button-danger w-full sm:w-auto"
              >
                {isDeletingCustomer ? 'Memproses...' : 'Ya, Nonaktifkan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {mapCustomer && (
        <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 text-xs text-white">Memuat peta...</div>}>
          <RouteMapModal customer={mapCustomer} onClose={() => setMapCustomer(null)} />
        </Suspense>
      )}

      {historyCustomer && (
        <CustomerFollowUpHistoryModal
          customer={historyCustomer}
          followUps={followUps}
          onClose={() => setHistoryCustomer(null)}
          onCreateFollowUp={(cust) => setFollowUpCustomer(cust)}
        />
      )}

      {timelineCustomer && (
        <CustomerActivityTimelineModal
          customer={timelineCustomer}
          appointments={appointments}
          followUps={followUps}
          onClose={() => setTimelineCustomer(null)}
          onNewFollowUp={(cust) => setFollowUpCustomer(cust)}
          onNewAppointment={() => onNavigate?.('schedule')}
        />
      )}

      {followUpCustomer && (
        <FollowUpFormModal
          customers={customers}
          preselectedCustomer={followUpCustomer}
          onClose={() => setFollowUpCustomer(null)}
          onSubmit={async (data) => {
            await onSaveFollowUp(data)
            onNotify?.('Agenda follow-up berhasil dijadwalkan.')
          }}
        />
      )}
    </div>
  )
}

export default CustomersPage