import { useState } from 'react'
import {
  Bell,
  CalendarPlus,
  ChevronDown,
  Menu,
  Search,
  X,
} from 'lucide-react'
import Sidebar from './Sidebar'

const pageInfo = {
  dashboard: { eyebrow: 'RINGKASAN', title: 'Dashboard' },
  customers: { eyebrow: 'DATABASE', title: 'Data Nasabah' },
  schedule: { eyebrow: 'PERENCANAAN', title: 'Call Plan' },
  reports: { eyebrow: 'AKTIVITAS', title: 'Riwayat Kunjungan' },
}

function AppShell({ activePage, onNavigate, children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const info = pageInfo[activePage]

  const navigate = (page) => {
    onNavigate(page)
    setMobileMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-800">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] lg:block">
        <Sidebar activePage={activePage} onNavigate={navigate} />
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Tutup menu" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative h-full w-[280px] max-w-[85vw]">
            <Sidebar activePage={activePage} onNavigate={navigate} />
            <button className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setMobileMenuOpen(false)} aria-label="Tutup navigasi">
              <X size={19} />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7 xl:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden" onClick={() => setMobileMenuOpen(true)} aria-label="Buka navigasi">
              <Menu size={20} />
            </button>
            <div>
              <p className="hidden text-[10px] font-bold tracking-[.18em] text-slate-400 sm:block">{info.eyebrow}</p>
              <h1 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:mt-0.5 sm:text-[21px]">{info.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <button className="hidden size-9 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 sm:flex" aria-label="Cari">
              <Search size={18} />
            </button>
            <div className="relative">
              <button className="relative flex size-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Pengingat">
                <Bell size={18} />
                <span className="absolute right-2 top-2 size-1.5 rounded-full bg-rose-500 ring-2 ring-white" />
              </button>
            </div>
            <div className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
            <button className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-slate-50">
              <span className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">AR</span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-semibold text-slate-800">Andi Rahman</span>
                <span className="mt-0.5 block text-[10px] text-slate-400">Relationship Manager</span>
              </span>
              <ChevronDown className="hidden text-slate-400 sm:block" size={15} />
            </button>
            {activePage !== 'schedule' && (
              <button onClick={() => navigate('schedule')} className="hidden h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 md:flex">
                <CalendarPlus size={15} />
                Buat jadwal
              </button>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          {children}
          <footer className="mt-10 flex flex-col justify-between gap-1 border-t border-slate-200/80 py-5 text-[11px] text-slate-400 sm:flex-row">
            <span>© {new Date().getFullYear()} CallPlan · Sistem Penjadwalan Kunjungan</span>
            <span>Cabang Bandung · Terhubung ke API Laravel</span>
          </footer>
        </main>
      </div>
    </div>
  )
}

export default AppShell
