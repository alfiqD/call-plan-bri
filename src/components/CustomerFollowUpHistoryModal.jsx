import { CalendarClock, CheckCircle2, Clock, Phone, Plus, XCircle } from 'lucide-react'
import Modal from './Modal'
import { formatDate } from '../data/workspace'
import { getFollowUpStatusInfo } from '../services/followUp'

function CustomerFollowUpHistoryModal({
  customer,
  followUps = [],
  onClose,
  onCreateFollowUp,
}) {
  const customerFollowUps = followUps
    .filter((f) => String(f.customerId) === String(customer.id))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))

  return (
    <Modal
      title={`Riwayat Follow-up: ${customer.name}`}
      description="Daftar pengingat dan catatan tindak lanjut untuk nasabah ini."
      onClose={onClose}
    >
      <div className="space-y-4">
        {/* Customer Header Info */}
        <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{customer.name}</span>
              <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                {customer.type}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              <a href={`tel:${customer.phone.replace(/[^\d+]/g, '')}`} className="inline-flex items-center gap-1 hover:text-indigo-600">
                <Phone size={12} /> {customer.phone}
              </a>
              {' · '}{customer.address}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose()
              onCreateFollowUp(customer)
            }}
            className="button-primary inline-flex items-center gap-1.5 py-1.5 text-xs whitespace-nowrap self-start sm:self-auto"
          >
            <Plus size={14} /> Buat Tindak Lanjut
          </button>
        </div>

        {/* Timeline of Follow-ups */}
        <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1">
          {customerFollowUps.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
              <CalendarClock className="mx-auto size-9 opacity-40 mb-2" />
              <p className="text-xs font-semibold text-slate-600">Belum ada riwayat follow-up untuk nasabah ini</p>
              <p className="text-[11px] text-slate-400 mt-1">
                Jadwalkan panggilan atau janji temu pertama untuk menindaklanjuti nasabah.
              </p>
            </div>
          ) : (
            customerFollowUps.map((item) => {
              const { isOverdue, isDueToday, isCompleted, isCanceled } = getFollowUpStatusInfo(item)

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border p-4 transition ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50/30'
                      : isCanceled
                        ? 'border-slate-200 bg-slate-50/50 opacity-75'
                        : isOverdue
                          ? 'border-rose-200 bg-rose-50/30 ring-1 ring-rose-200'
                          : isDueToday
                            ? 'border-amber-200 bg-amber-50/30 ring-1 ring-amber-200'
                            : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-900">{item.type}</span>
                      <span className="text-[11px] text-slate-500">
                        {formatDate(item.date)} · {item.time}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.priority === 'Tinggi' && (
                        <span className="rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
                          Prioritas Tinggi
                        </span>
                      )}

                      {isCompleted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <CheckCircle2 size={11} /> Selesai
                        </span>
                      ) : isCanceled ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          <XCircle size={11} /> Dibatalkan
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 animate-pulse">
                          <Clock size={11} /> Terlambat
                        </span>
                      ) : isDueToday ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          <Clock size={11} /> Jatuh Tempo Hari Ini
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                          <Clock size={11} /> Mendatang
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-700">{item.notes}</p>

                  {item.resultNotes && (
                    <div className="mt-2.5 rounded-xl border border-emerald-100 bg-white p-2.5 text-[11px] text-emerald-900">
                      <p className="font-bold text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 size={12} /> Hasil Tindak Lanjut:
                      </p>
                      <p className="mt-0.5">{item.resultNotes}</p>
                    </div>
                  )}

                  {item.appointmentId && (
                    <p className="mt-2 text-[10px] text-slate-400">
                      🔗 Berasal dari kunjungan lapangan #{item.appointmentId}
                    </p>
                  )}
                </div>
              )
            })
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button type="button" onClick={onClose} className="button-secondary text-xs">
            Tutup
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default CustomerFollowUpHistoryModal
