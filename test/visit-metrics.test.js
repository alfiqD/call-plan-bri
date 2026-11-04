import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { calculateVisitMetrics, getWeekDateRange } from '../src/services/visitMetrics.js'

describe('Weekly visit metrics', () => {
  it('creates a Monday-to-Sunday range for any date in the week', () => {
    assert.deepEqual(
      getWeekDateRange(new Date(2026, 10, 4)),
      { start: '2026-11-02', end: '2026-11-08' }
    )
    assert.deepEqual(
      getWeekDateRange(new Date(2026, 10, 8)),
      { start: '2026-11-02', end: '2026-11-08' }
    )
  })

  it('keeps scheduled plans, completed visits, and pending visits as separate counts', () => {
    const appointments = [
      ...[2, 3, 4, 5].map((day) => ({
        date: `2026-11-0${day}`,
        checkInAt: `2026-11-0${day}T08:00:00.000Z`,
        status: 'Selesai',
      })),
      { date: '2026-11-06', status: 'Terjadwal' },
      { date: '2026-11-07', status: 'Batal' },
    ]

    assert.deepEqual(
      calculateVisitMetrics(appointments, { start: '2026-11-02', end: '2026-11-08' }),
      {
        plannedCount: 5,
        completedCount: 4,
        pendingCount: 1,
        rescheduledCount: 0,
        notMetCount: 0,
        cancelledCount: 1,
      }
    )
  })

  it('counts completed visits by check-in date, while plans follow the current scheduled date', () => {
    const appointments = [
      {
        date: '2026-10-30',
        checkInAt: '2026-11-03T08:00:00.000Z',
        status: 'Selesai',
      },
      { date: '2026-11-04', status: 'Reschedule' },
      { date: '2026-11-05', status: 'Tidak ditemui' },
    ]

    assert.deepEqual(
      calculateVisitMetrics(appointments, { start: '2026-11-02', end: '2026-11-08' }),
      {
        plannedCount: 2,
        completedCount: 1,
        pendingCount: 0,
        rescheduledCount: 1,
        notMetCount: 1,
        cancelledCount: 0,
      }
    )
  })
})
