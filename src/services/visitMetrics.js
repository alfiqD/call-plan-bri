import { localDateKey } from '../data/workspace.js'

export function getWeekDateRange(date = new Date()) {
  const monday = new Date(date)
  monday.setHours(12, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  return {
    start: localDateKey(monday),
    end: localDateKey(sunday),
  }
}

export function calculateVisitMetrics(appointments = [], { start, end }) {
  const planned = appointments.filter((appointment) => (
    appointment.date >= start &&
    appointment.date <= end &&
    appointment.status !== 'Batal'
  ))

  const completed = appointments.filter((appointment) => {
    if (appointment.status !== 'Selesai') return false
    const completedDate = appointment.checkInAt
      ? localDateKey(new Date(appointment.checkInAt))
      : appointment.date
    return completedDate >= start && completedDate <= end
  })

  const pending = planned.filter((appointment) => appointment.status === 'Terjadwal')
  const rescheduled = planned.filter((appointment) => appointment.status === 'Reschedule')
  const notMet = planned.filter((appointment) => appointment.status === 'Tidak ditemui')
  const cancelled = appointments.filter((appointment) => (
    appointment.date >= start &&
    appointment.date <= end &&
    appointment.status === 'Batal'
  ))

  return {
    plannedCount: planned.length,
    completedCount: completed.length,
    pendingCount: pending.length,
    rescheduledCount: rescheduled.length,
    notMetCount: notMet.length,
    cancelledCount: cancelled.length,
  }
}
