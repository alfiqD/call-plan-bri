import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

function detectScheduleCollision(existingSchedules, newSchedule) {
  return existingSchedules.some((item) => {
    // If editing same schedule ID, skip
    if (newSchedule.id && String(item.id) === String(newSchedule.id)) {
      return false
    }

    // Collision condition: Same RM, same date, same time, and not cancelled/unmet
    const sameRm = item.rmId === newSchedule.rmId
    const sameDate = item.date === newSchedule.date
    const sameTime = item.time === newSchedule.time
    const isActive = item.status !== 'tidak_ditemui'

    return sameRm && sameDate && sameTime && isActive
  })
}

describe('Schedule Collision Detection for RM', () => {
  const currentSchedules = [
    { id: '1', rmId: 'rm-andi', date: '2026-10-28', time: '09:00', status: 'pending' },
    { id: '2', rmId: 'rm-andi', date: '2026-10-28', time: '11:00', status: 'selesai' },
    { id: '3', rmId: 'rm-andi', date: '2026-10-28', time: '14:00', status: 'tidak_ditemui' },
    { id: '4', rmId: 'rm-budi', date: '2026-10-28', time: '09:00', status: 'pending' },
  ]

  it('mendeteksi bentrok jika RM yang sama menjadwalkan kunjungan pada jam dan tanggal yang sama', () => {
    const newAppointment = {
      rmId: 'rm-andi',
      date: '2026-10-28',
      time: '09:00',
    }
    const hasConflict = detectScheduleCollision(currentSchedules, newAppointment)
    assert.equal(hasConflict, true)
  })

  it('mengizinkan jadwal baru jika jam atau tanggal berbeda untuk RM yang sama', () => {
    const newAppointment = {
      rmId: 'rm-andi',
      date: '2026-10-28',
      time: '10:00',
    }
    const hasConflict = detectScheduleCollision(currentSchedules, newAppointment)
    assert.equal(hasConflict, false)
  })

  it('mengizinkan jam yang sama untuk RM yang berbeda (tidak bentrok antar-RM)', () => {
    const newAppointment = {
      rmId: 'rm-citra',
      date: '2026-10-28',
      time: '09:00',
    }
    const hasConflict = detectScheduleCollision(currentSchedules, newAppointment)
    assert.equal(hasConflict, false)
  })

  it('mengizinkan jadwal pada slot waktu yang statusnya sudah tidak_ditemui', () => {
    const newAppointment = {
      rmId: 'rm-andi',
      date: '2026-10-28',
      time: '14:00',
    }
    const hasConflict = detectScheduleCollision(currentSchedules, newAppointment)
    assert.equal(hasConflict, false)
  })

  it('tidak mendeteksi bentrok jika memperbarui (edit) jadwal yang sama tanpa mengubah jam', () => {
    const editSelf = {
      id: '1',
      rmId: 'rm-andi',
      date: '2026-10-28',
      time: '09:00',
    }
    const hasConflict = detectScheduleCollision(currentSchedules, editSelf)
    assert.equal(hasConflict, false)
  })
})
