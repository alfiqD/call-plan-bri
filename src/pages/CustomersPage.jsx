import { lazy, Suspense, useMemo, useState } from 'react'
import { MapPin, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, UsersRound } from 'lucide-react'
import CustomerForm from '../components/CustomerForm'
import StatusBadge from '../components/StatusBadge'

const RouteMapModal = lazy(() => import('../components/RouteMapModal'))

function CustomersPage({ customers, onSaveCustomer, onDeleteCustomer, onNotify }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [mapCustomer, setMapCustomer] = useState(null)
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
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs text-slate-500">Kelola kontak prospek dan debitur sebagai tujuan rute kunjungan.</p><p className="mt-2 text-[11px] text-slate-400">{customers.length} nasabah terdaftar</p></div>
        <button onClick={() => setIsCreating(true)} className="button-primary w-fit"><Plus size={16} /> Tambah nasabah</button>
      </div>
      {actionError && <p className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700" role="alert">{actionError}</p>}

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/30 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, telepon, rekening, atau alamat..." className="form-control pl-9" aria-label="Cari nasabah" />
        </div>
        <div className="flex w-fit items-center gap-1 rounded-xl bg-slate-100 p-1">
          {['Semua', 'Prospek', 'Debitur'].map((type) => <button key={type} onClick={() => setFilter(type)} className={`rounded-lg px-3 py-2 text-[11px] font-semibold transition ${filter === type ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>{type}</button>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/30">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h2 className="text-sm font-bold text-slate-900">Daftar nasabah</h2><p className="mt-1 text-[11px] text-slate-400">Informasi kontak dan lokasi kunjungan</p></div>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-50" aria-label="Opsi daftar"><MoreHorizontal size={18} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left">
            <thead><tr className="bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wider text-slate-400"><th className="px-5 py-3">Nasabah</th><th className="px-4 py-3">Kontak</th><th className="px-4 py-3">No. rekening</th><th className="px-4 py-3">Jenis</th><th className="px-4 py-3">Status pinjaman</th><th className="px-4 py-3">Alamat</th><th className="px-5 py-3 text-right">Aksi</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((customer, index) => (
                <tr key={customer.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><span className={`flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${['bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700', 'bg-indigo-100 text-indigo-700', 'bg-emerald-100 text-emerald-700'][index % 4]}`}>{customer.name.split(' ').slice(0, 2).map((word) => word[0]).join('')}</span><span className="text-xs font-semibold text-slate-800">{customer.name}</span></div></td>
                  <td className="px-4 py-3.5"><a className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-indigo-600" href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`}><Phone size={12} />{customer.phone}</a></td>
                  <td className="px-4 py-3.5 text-xs text-slate-600">{customer.noRekening ? `•••• ${customer.noRekening.slice(-4)}` : '-'}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={customer.type} /></td>
                  <td className="px-4 py-3.5"><StatusBadge status={customer.loanStatus} /></td>
                  <td className="max-w-[220px] px-4 py-3.5"><div className="flex flex-col items-start gap-1"><span className="flex items-start gap-1.5 text-[11px] leading-5 text-slate-500"><MapPin className="mt-0.5 size-3 shrink-0 text-slate-400" />{customer.address}</span><button type="button" onClick={() => setMapCustomer(customer)} className="ml-[18px] inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-600 hover:text-indigo-800"><MapPin size={11} />Lihat peta & rute</button></div></td>
                  <td className="px-5 py-3.5"><div className="flex justify-end gap-1"><button onClick={() => setEditingCustomer(customer)} aria-label={`Ubah ${customer.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"><Pencil size={14} /></button><button onClick={() => deleteCustomer(customer)} aria-label={`Hapus ${customer.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 size={14} /></button></div></td>
                </tr>
              ))}
              {!filteredCustomers.length && <tr><td colSpan="7" className="px-6 py-14 text-center"><UsersRound className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm font-semibold text-slate-700">Data nasabah tidak ditemukan</p><p className="mt-1 text-xs text-slate-400">Coba ubah kata kunci atau filter yang dipilih.</p></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-[10px] text-slate-400">Menampilkan {filteredCustomers.length} dari {customers.length} nasabah · data untuk kebutuhan penjadwalan kunjungan</div>
      </div>
      {(isCreating || editingCustomer) && <CustomerForm customer={editingCustomer} onClose={() => { setIsCreating(false); setEditingCustomer(null) }} onSubmit={saveCustomer} />}
      {mapCustomer && <Suspense fallback={<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 text-sm text-white">Memuat peta...</div>}><RouteMapModal customer={mapCustomer} onClose={() => setMapCustomer(null)} /></Suspense>}
    </>
  )
}

export default CustomersPage
