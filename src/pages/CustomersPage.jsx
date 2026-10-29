import { lazy, Suspense, useMemo, useState } from 'react'
import { CalendarClock, History, Lock, MoreHorizontal, Pencil, Phone, Plus, Search, ShieldCheck, Trash2, UsersRound } from 'lucide-react'
import CustomerForm from '../components/CustomerForm'
import StatusBadge from '../components/StatusBadge'
import CustomerFollowUpHistoryModal from '../components/CustomerFollowUpHistoryModal'
import CustomerActivityTimelineModal from '../components/CustomerActivityTimelineModal'
import FollowUpFormModal from '../components/FollowUpFormModal'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))

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
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mapCustomer, setMapCustomer] = useState(null)
  const [historyCustomer, setHistoryCustomer] = useState(null)
  const [followUpCustomer, setFollowUpCustomer] = useState(null)
  const [timelineCustomer, setTimelineCustomer] = useState(null)
  const [actionError, setActionError] = useState('')
  const filteredCustomers = useMemo(() => customers.filter((customer) => {
    const matchesType = filter === 'Semua' || customer.type === filter
    const matchesQuery = `${customer.name} ${customer.phone} ${customer.noRekening || ''} ${customer.address}`.toLowerCase().includes(query.toLowerCase())
    return matchesType && matchesQuery
  }), [customers, filter, query])

  const saveCustomer = async (customer) => {
    const savedCustomer = await onSaveCustomer(customer)
    setEditingCustomer(null)
    setIsCreating(false)
    setActionError('')
    onNotify('Data nasabah berhasil disimpan.')
    return savedCustomer
  }

  const deleteCustomer = async (customer) => {
    if (!isAdmin) {
      setActionError('Akses Dibatasi: Role RM tidak memiliki wewenang menghapus data nasabah. Fitur ini khusus Administrator.')
      return
    }
    const confirmed = window.confirm(`Nonaktifkan ${customer.name}? Jadwal dan riwayat kunjungan akan tetap disimpan.`)
    if (!confirmed) return
    setActionError('')
    try {
      await onDeleteCustomer(customer.id)
      onNotify('Nasabah dinonaktifkan. Jadwal dan riwayat tetap tersimpan.')
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Nasabah gagal dihapus.')
    }
  }

  return (
    <>
      {/* Top Header Bar */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
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
                <Lock size={10} className="text-slate-400" /> RM (Read & Edit)
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
          className="button-orange w-fit self-start sm:self-auto"
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
      <div className="mb-5 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Cari nama nasabah, telepon, no. rekening, atau alamat..."
            className="form-control pl-9 text-xs"
            aria-label="Cari nasabah"
          />
        </div>

        <div className="flex w-fit items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          {['Semua', 'Prospek', 'Debitur'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setFilter(type)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                filter === type
                  ? 'bg-white text-[#00529b] font-bold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {type}
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
                <th className="px-4 py-3">No. Rekening</th>
                <th className="px-4 py-3">Telepon</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3">Status Pinjaman</th>
                <th className="px-4 py-3">Alamat</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length > 0 ? (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#eaf3fb] text-[11px] font-bold text-[#00529b]">
                          {customer.name.slice(0, 2).toUpperCase()}
                        </span>
                        <span className="font-semibold text-slate-900">{customer.name}</span>
                      </div>
                    </td>
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
                      <StatusBadge status={customer.type} />
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
                        <button
                          type="button"
                          onClick={() => setEditingCustomer(customer)}
                          title="Ubah Data Nasabah"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-[#00529b] transition"
                        >
                          <Pencil size={15} />
                        </button>
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => deleteCustomer(customer)}
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
                  <td colSpan={7} className="py-12 text-center">
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
          Menampilkan {filteredCustomers.length} dari {customers.length} nasabah terdaftar
        </div>
      </div>

      {/* Mobile Card List View */}
      <div className="block md:hidden space-y-3">
        {filteredCustomers.length > 0 ? (
          filteredCustomers.map((customer) => (
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
                <div className="flex items-center gap-1">
                  <StatusBadge status={customer.type} />
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

              {customer.address && (
                <p className="mt-2 text-[11px] text-slate-500 line-clamp-2">
                  {customer.address}
                </p>
              )}

              <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  onClick={() => setTimelineCustomer(customer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                >
                  <History size={13} /> Timeline
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryCustomer(customer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-amber-50"
                >
                  <CalendarClock size={13} /> Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCustomer(customer)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Pencil size={13} /> Edit
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => deleteCustomer(customer)}
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
      {(isCreating || editingCustomer) && <CustomerForm customer={editingCustomer} onClose={() => { setIsCreating(false); setEditingCustomer(null) }} onSubmit={saveCustomer} />}
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
          onNewAppointment={(cust) => onNavigate?.('schedule')}
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
