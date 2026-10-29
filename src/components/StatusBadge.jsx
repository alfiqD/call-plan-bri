function StatusBadge({ status }) {
  const styles = {
    // Visit statuses
    Terjadwal: 'bg-blue-50 text-[#00529b] border-blue-200',
    Selesai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Reschedule: 'bg-amber-50 text-amber-700 border-amber-200',
    'Tidak ditemui': 'bg-rose-50 text-rose-700 border-rose-200',

    // Follow-up statuses
    'Belum Dilakukan': 'bg-blue-50 text-[#00529b] border-blue-200',
    Dibatalkan: 'bg-slate-100 text-slate-600 border-slate-200',
    Terlambat: 'bg-rose-50 text-rose-700 border-rose-200',
    'Hari Ini': 'bg-amber-50 text-amber-700 border-amber-200',
    Mendatang: 'bg-blue-50 text-[#00529b] border-blue-200',

    // Customer types & loan statuses
    Debitur: 'bg-blue-50 text-[#00529b] border-blue-200',
    Prospek: 'bg-slate-100 text-slate-700 border-slate-200',
    Aktif: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Dalam pengajuan': 'bg-amber-50 text-amber-700 border-amber-200',
    'Perlu tindak lanjut': 'bg-amber-50 text-amber-700 border-amber-200',
    'Belum ada pinjaman': 'bg-slate-100 text-slate-600 border-slate-200',
  }

  const activeStyle = styles[status] || 'bg-slate-100 text-slate-600 border-slate-200'

  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-medium border ${activeStyle}`}>
      {status}
    </span>
  )
}

export default StatusBadge
