function StatusBadge({ status }) {
  const styles = {
    Terjadwal: 'bg-blue-50 text-blue-700 ring-blue-600/10',
    Selesai: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    Reschedule: 'bg-amber-50 text-amber-700 ring-amber-600/10',
    'Tidak ditemui': 'bg-rose-50 text-rose-700 ring-rose-600/10',
    Debitur: 'bg-indigo-50 text-indigo-700 ring-indigo-600/10',
    Prospek: 'bg-violet-50 text-violet-700 ring-violet-600/10',
    Aktif: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
    'Dalam pengajuan': 'bg-amber-50 text-amber-700 ring-amber-600/10',
    'Perlu tindak lanjut': 'bg-orange-50 text-orange-700 ring-orange-600/10',
    'Belum ada pinjaman': 'bg-slate-100 text-slate-600 ring-slate-500/10',
  }

  return <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${styles[status] || 'bg-slate-100 text-slate-600 ring-slate-500/10'}`}>{status}</span>
}

export default StatusBadge
