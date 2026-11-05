import { lazy, Suspense, useMemo, useState } from 'react'
import { AlertTriangle, CalendarClock, ChevronLeft, ChevronRight, History, Lock, MapPin, Pencil, Phone, Plus, Search, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import CustomerForm from '../components/CustomerForm'
import Modal from '../components/Modal'
import StatusBadge from '../components/StatusBadge'
import CustomerFollowUpHistoryModal from '../components/CustomerFollowUpHistoryModal'
import CustomerActivityTimelineModal from '../components/CustomerActivityTimelineModal'
import FollowUpFormModal from '../components/FollowUpFormModal'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))
const PAGE_SIZE = 10

function CustomersPage({
  customers,
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
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [actionError, setActionError] = useState('')
  const canManageCustomer = (customer) => isAdmin || customer.createdByRmId === currentUserId
  const filterOptions = useMemo(() => ({
    customerKinds: [...new Set(customers.map((customer) => customer.customerKind).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'id')),
    businessTypes: [...new Set(customers.map((customer) => customer.businessType).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, 'id')),
    loanStatuses: [...new Set(customers.map((customer) => customer.loanStatus).filter(Boolean))]
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
      setActionError('Akses Dibatasi: Role RM tidak memiliki wewenang menghapus data nasabah. Fitur ini khusus Administrator.')
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
      onNotify('Nasabah dinonaktifkan. Jadwal dan riwayat tetap tersimpan.')
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Nasabah gagal dinonaktifkan. Silakan coba lagi.')
    } finally {
      setIsDeletingCustomer(false)
    }
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">Database Nasabah</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {customers.length} Terdaftar
            </span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                <ShieldCheck size={11} /> Admin (Akses Penuh)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                <Lock size={10} className="text-slate-400" /> RM (Baca data cabang; edit data sendiri)
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Daftar profil debitur & prospek Bank BRI KCP Iskandar Palembang
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreating(true)}
          className="button-orange !min-h-[44px] w-full self-start sm:w-fit sm:self-auto"
        >
          <Plus size={15} /> Tambah Nasabah
        </button>
      </div>

      {actionError && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">
          {actionError}
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setPage(1) }}
            placeholder="Cari nasabah, PIC, jenis usaha, telepon, no. rekening, atau alamat..."
            className="form-control pl-9 text-xs"
            aria-label="Cari nasabah"
          />
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={customerKindFilter}
            onChange={(event) => { setCustomerKindFilter(event.target.value); setPage(1) }}
            className="form-control text-xs"
            aria-label="Filter jenis nasabah"
          >
            <option value="">Semua Jenis Nasabah</option>
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
            className="min-h-[40px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Hapus Filter
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden xl:block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-5 py-3">Nama Nasabah</th>
                <th className="px-4 py-3">Jenis Nasabah</th>
                <th className="px-4 py-3">Jenis Usaha</th>
                <th className="px-4 py-3">PIC</th>
                <th className="px-4 py-3">No. Rekening</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Status Pinjaman</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {visibleCustomers.length > 0 ? (
                visibleCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">{customer.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{customer.customerKind || '-'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{customer.businessType || '-'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{customer.picName || '-'}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-600">
                      {customer.noRekening ? `•••• ${customer.noRekening.slice(-4)}` : '-'}
                    </td>
                    <td className="px-4 py-3.5">
                      <a
                        href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
                        className="inline-flex items-center gap-1.5 text-slate-700 hover:text-[#00529b]"
                      >
                        <Phone size={12} className="text-slate-400" />
                        {customer.phone}
                      </a>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={customer.loanStatus} />
                    </td>
                    <td className="px-4 py-3.5 max-w-xs truncate text-slate-500">
                      {customer.address || '-'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setTimelineCustomer(customer)}
                          title="Riwayat Aktivitas & Timeline Nasabah"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700 transition"
                        >
                          <History size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setHistoryCustomer(customer)}
                          title="Riwayat & Buat Follow-up"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition"
                        >
                          <CalendarClock size={15} />
                        </button>
                        {canManageCustomer(customer) ? (
                          <button
                            type="button"
                            onClick={() => setEditingCustomer(customer)}
                            title="Ubah Data Nasabah"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#00529b] transition"
                          >
                            <Pencil size={15} />
                          </button>
                        ) : (
                          <span title="RM hanya dapat mengubah nasabah yang dibuatnya" className="p-1.5 text-slate-200 cursor-not-allowed">
                            <Lock size={15} />
                          </span>
                        )}
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => requestDeleteCustomer(customer)}
                            title="Hapus Nasabah (Wewenang Admin)"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <span
                            title="Penghapusan dibatasi untuk Administrator"
                            className="p-1.5 text-slate-200 cursor-not-allowed"
                          >
                            <Trash2 size={15} />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <UsersRound className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 text-sm font-semibold text-slate-700">Data nasabah tidak ditemukan</p>
                    <p className="mt-0.5 text-xs text-slate-400">Coba ubah kata kunci atau filter yang dipilih.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-3 text-[11px] text-slate-400">
          {filteredCustomers.length > 0
            ? `Menampilkan ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)} dari ${filteredCustomers.length} nasabah`
            : `Menampilkan 0 dari ${filteredCustomers.length} nasabah`}
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block xl:hidden space-y-3">
        {visibleCustomers.length > 0 ? (
          visibleCustomers.map((customer) => (
            <div key={customer.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                    {customer.name.slice(0, 2).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{customer.name}</p>
                    <p className="text-[11px] text-slate-500">{customer.noRekening ? `Rek: •••• ${customer.noRekening.slice(-4)}` : '-'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <a
                  href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-1 text-[#00529b] font-medium"
                >
                  <Phone size={12} /> {customer.phone}
                </a>
                <span className="text-slate-300">·</span>
                <StatusBadge status={customer.loanStatus} />
              </div>
              {(customer.customerKind || customer.businessType) && (
                <div className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                  {customer.customerKind && <p>Jenis Nasabah: {customer.customerKind}</p>}
                  {customer.businessType && <p>Jenis Usaha: {customer.businessType}</p>}
                </div>
              )}
              {customer.picName && <p className="mt-2 text-[11px] text-slate-600">PIC: {customer.picName}</p>}

              {customer.address && (
                <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">
                  {customer.address}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-start gap-2 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  onClick={() => setMapCustomer(customer)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-[#00529b]"
                >
                  <MapPin size={13} /> Lokasi
                </button>
                <button
                  type="button"
                  onClick={() => setTimelineCustomer(customer)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <History size={13} /> Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(customer)}
                  className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-amber-50"
                >
                  <CalendarClock size={13} /> Follow-up
                </button>
                {canManageCustomer(customer) ? (
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(customer)}
                    className="inline-flex min-h-[40px] items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                ) : (
                  <span title="RM hanya dapat mengubah nasabah yang dibuatnya" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-400">
                    <Lock size={13} /> Baca saja
                  </span>
                )}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => requestDeleteCustomer(customer)}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <UsersRound className="mx-auto size-8 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-700">Data nasabah tidak ditemukan</p>
            <p className="mt-0.5 text-xs text-slate-400">Coba ubah kata kunci atau filter.</p>
          </div>
        )}
      </div>
      {filteredCustomers.length > 0 && (
        <div className="mt-4 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs sm:flex-row">
          <span className="text-slate-500">
            Menampilkan <b className="text-slate-700">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filteredCustomers.length)}</b> dari <b className="text-slate-700">{filteredCustomers.length}</b> nasabah
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((value) => Math.max(1, Math.min(value, totalPages) - 1))}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Sebelumnya
            </button>
            <span className="min-w-24 text-center font-semibold text-slate-700">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((value) => Math.min(totalPages, Math.min(value, totalPages) + 1))}
              className="inline-flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-200 px-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Selanjutnya <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {(isCreating || editingCustomer) && <CustomerForm customer={editingCustomer} onClose={() => { setIsCreating(false); setEditingCustomer(null) }} onSubmit={saveCustomer} />}
      {customerToDelete && (
        <Modal
          title="Nonaktifkan nasabah?"
          description="Tinjau data berikut sebelum melanjutkan."
          onClose={() => {
            if (!isDeletingCustomer) {
              setCustomerToDelete(null)
              setDeleteError('')
            }
          }}
        >
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm ring-1 ring-amber-200/80">
              <AlertTriangle size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{customerToDelete.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                Nasabah ini akan disembunyikan dari daftar aktif. Jadwal dan riwayat kunjungan tidak akan dihapus.
              </p>
            </div>
          </div>
          {deleteError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-700" role="alert">
              {deleteError}
            </div>
          )}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setCustomerToDelete(null)
                setDeleteError('')
              }}
              disabled={isDeletingCustomer}
              className="button-secondary w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={deleteCustomer}
              disabled={isDeletingCustomer}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-rose-700 bg-rose-700 px-4 text-xs font-semibold text-white shadow-sm transition hover:border-rose-800 hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <Trash2 size={14} />
              {isDeletingCustomer ? 'Menonaktifkan...' : 'Ya, nonaktifkan'}
            </button>
          </div>
        </Modal>
      )}
      {mapCustomer && <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 text-sm text-white">Memuat peta...</div>}><RouteMapModal customer={mapCustomer} onClose={() => setMapCustomer(null)} /></Suspense>}
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
    </>
  )
}

export default CustomersPage
