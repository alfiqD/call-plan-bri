import {
  CalendarDays,
  ClipboardList,
  Compass,
  LayoutDashboard,
  MapPin,
  UsersRound,
} from 'lucide-react'

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'schedule', label: 'Jadwal Kunjungan', icon: CalendarDays },
  { id: 'customers', label: 'Data Nasabah', icon: UsersRound },
  { id: 'reports', label: 'Riwayat & Laporan', icon: ClipboardList },
]

function Sidebar({ activePage, onNavigate }) {
  return (
    <div className="flex h-full flex-col border-r border-slate-200 bg-white px-4 pb-5 pt-6">
      <div className="flex items-center gap-3 px-2">
        <div className="relative flex size-11 items-center justify-center rounded-[14px] bg-[#00529b] text-white shadow-md shadow-blue-900/15">
          <Compass size={22} strokeWidth={2.1} />
          <span className="absolute bottom-1 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-[#f36f21]" />
        </div>
        <div>
          <p className="text-[17px] font-extrabold leading-5 tracking-tight text-slate-900">call<span className="text-indigo-600">plan</span></p>
          <p className="mt-1 text-[10px] font-semibold tracking-[.12em] text-slate-400">BRI · FIELD ACTIVITY</p>
        </div>
      </div>

      <div className="mt-10 px-3 text-[10px] font-bold tracking-[.16em] text-slate-400">MENU UTAMA</div>
      <nav className="mt-3 space-y-1" aria-label="Navigasi utama">
        {navigation.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-medium transition ${
              activePage === id
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
            aria-current={activePage === id ? 'page' : undefined}
          >
            <Icon size={18} strokeWidth={activePage === id ? 2.2 : 1.8} />
            <span className="flex-1">{label}</span>
            {activePage === id && <span className="size-1.5 rounded-full bg-indigo-600" />}
          </button>
        ))}
      </nav>

      <div className="mt-auto">
        <div className="rounded-2xl bg-[#003b70] p-4 text-white">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/10 text-[#ff9a55]">
            <MapPin size={17} />
          </div>
          <p className="mt-3 text-xs font-semibold">Fokus perjalanan</p>
          <p className="mt-1 text-[11px] leading-5 text-slate-400">Atur prioritas kunjungan dan catat hasil pertemuan di lapangan.</p>
          <div className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[10px] font-medium text-blue-100">
            <span className="size-1.5 rounded-full bg-emerald-400" />
            Area Bandung
          </div>
        </div>
        <p className="mt-4 px-2 text-[10px] text-slate-400">Versi 1.0.0 · Prototipe KP</p>
      </div>
    </div>
  )
}

export default Sidebar
