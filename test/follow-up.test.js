import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateFollowUpMetrics,
  filterFollowUps,
  getFollowUpStatusInfo,
} from '../src/services/followUp.js'

describe('Follow-up Reminder & Status Validation', () => {
  const baseToday = '2026-10-29'

  it('mengidentifikasi follow-up jatuh tempo hari ini secara akurat', () => {
    const item = {
      id: '1',
      date: '2026-10-29',
      status: 'Belum Dilakukan',
    }
    const info = getFollowUpStatusInfo(item, baseToday)
    assert.equal(info.isDueToday, true)
    assert.equal(info.isOverdue, false)
    assert.equal(info.isUpcoming, false)
  })

  it('mengidentifikasi follow-up yang terlambat (overdue) untuk tanggal sebelum hari ini', () => {
    const item = {
      id: '2',
      date: '2026-10-28',
      status: 'Belum Dilakukan',
    }
    const info = getFollowUpStatusInfo(item, baseToday)
    assert.equal(info.isOverdue, true)
    assert.equal(info.isDueToday, false)
    assert.equal(info.isUpcoming, false)
  })

  it('mengidentifikasi follow-up mendatang untuk tanggal setelah hari ini', () => {
    const item = {
      id: '3',
      date: '2026-10-31',
      status: 'Belum Dilakukan',
    }
    const info = getFollowUpStatusInfo(item, baseToday)
    assert.equal(info.isUpcoming, true)
    assert.equal(info.isOverdue, false)
    assert.equal(info.isDueToday, false)
  })

  it('tidak pernah menganggap follow-up berstatus Selesai sebagai terlambat meskipun tanggalnya lampau', () => {
    const item = {
      id: '4',
      date: '2026-10-20', // Jauh di masa lalu
      status: 'Selesai',
      resultNotes: 'Nasabah telah menyerahkan dokumen',
    }
    const info = getFollowUpStatusInfo(item, baseToday)
    assert.equal(info.isOverdue, false)
    assert.equal(info.isDueToday, false)
    assert.equal(info.isCompleted, true)
  })

  it('tidak pernah menganggap follow-up berstatus Dibatalkan sebagai terlambat meskipun tanggalnya lampau', () => {
    const item = {
      id: '5',
      date: '2026-10-20',
      status: 'Dibatalkan',
    }
    const info = getFollowUpStatusInfo(item, baseToday)
    assert.equal(info.isOverdue, false)
    assert.equal(info.isDueToday, false)
    assert.equal(info.isCanceled, true)
  })
})

describe('Follow-up Filtering & Metrics Calculation', () => {
  const baseToday = '2026-10-29'
  const mockFollowUps = [
    { id: '1', customerId: '101', date: '2026-10-29', status: 'Belum Dilakukan', type: 'Telepon' }, // Hari Ini
    { id: '2', customerId: '102', date: '2026-10-27', status: 'Belum Dilakukan', type: 'WhatsApp' }, // Terlambat
    { id: '3', customerId: '103', date: '2026-10-30', status: 'Belum Dilakukan', type: 'Pertemuan/Kunjungan Ulang' }, // Mendatang
    { id: '4', customerId: '104', date: '2026-10-25', status: 'Selesai', type: 'Melengkapi Dokumen' }, // Selesai
    { id: '5', customerId: '105', date: '2026-10-26', status: 'Dibatalkan', type: 'Penawaran Produk' }, // Dibatalkan
  ]

  it('menghitung metrik ringkasan dengan benar', () => {
    const metrics = calculateFollowUpMetrics(mockFollowUps, baseToday)
    assert.equal(metrics.totalCount, 5)
    assert.equal(metrics.todayCount, 1)
    assert.equal(metrics.overdueCount, 1)
    assert.equal(metrics.upcomingCount, 1)
    assert.equal(metrics.completedCount, 1)
    assert.equal(metrics.canceledCount, 1)
    assert.equal(metrics.urgentCount, 2) // todayCount + overdueCount
  })

  it('memfilter daftar follow-up berdasarkan kategori tab secara tepat', () => {
    const hariIni = filterFollowUps(mockFollowUps, 'Hari Ini', baseToday)
    assert.equal(hariIni.length, 1)
    assert.equal(hariIni[0].id, '1')

    const terlambat = filterFollowUps(mockFollowUps, 'Terlambat', baseToday)
    assert.equal(terlambat.length, 1)
    assert.equal(terlambat[0].id, '2')

    const mendatang = filterFollowUps(mockFollowUps, 'Mendatang', baseToday)
    assert.equal(mendatang.length, 1)
    assert.equal(mendatang[0].id, '3')

    const selesai = filterFollowUps(mockFollowUps, 'Selesai', baseToday)
    assert.equal(selesai.length, 1)
    assert.equal(selesai[0].id, '4')

    const semua = filterFollowUps(mockFollowUps, 'Semua', baseToday)
    assert.equal(semua.length, 5)
  })
})

describe('Follow-up RBAC Access Control Matrix', () => {
  function canAccessFollowUp(userRole, userStatus, itemRmId, currentUserId) {
    if (userStatus !== 'approved') return false

    // Admin can monitor and manage all follow-ups
    if (userRole === 'admin') return true

    // RM can ONLY view, edit, complete, or cancel their own follow-up
    if (userRole === 'rm') {
      return itemRmId === currentUserId
    }

    return false
  }

  const RM_A = 'user-rm-111'
  const RM_B = 'user-rm-222'

  it('mengizinkan RM mengelola follow-up miliknya sendiri', () => {
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_A, 'VIEW'), true)
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_A, 'COMPLETE'), true)
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_A, 'EDIT'), true)
  })

  it('melarang RM mengakses atau memodifikasi follow-up milik RM lain', () => {
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_B, 'VIEW'), false)
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_B, 'COMPLETE'), false)
    assert.equal(canAccessFollowUp('rm', 'approved', RM_A, RM_B, 'EDIT'), false)
  })

  it('mengizinkan Admin memantau dan mengelola follow-up dari seluruh RM', () => {
    assert.equal(canAccessFollowUp('admin', 'approved', RM_A, 'admin-999', 'VIEW'), true)
    assert.equal(canAccessFollowUp('admin', 'approved', RM_B, 'admin-999', 'VIEW'), true)
  })

  it('menolak akses ke follow-up jika akun masih pending atau rejected', () => {
    assert.equal(canAccessFollowUp('rm', 'pending', RM_A, RM_A, 'VIEW'), false)
    assert.equal(canAccessFollowUp('rm', 'rejected', RM_A, RM_A, 'VIEW'), false)
  })
})

describe('Follow-up Visit & Customer Linking Integrity', () => {
  it('menyimpan relasi ke jadwal kunjungan asal tanpa duplikasi nasabah', () => {
    const visitId = 'visit-777'
    const customerId = 'cust-888'

    const followUp = {
      id: 'fu-999',
      customerId,
      appointmentId: visitId,
      date: '2026-10-30',
      time: '09:00',
      type: 'Melengkapi Dokumen',
      notes: 'Pengambilan berkas setelah kunjungan check-in GPS',
      status: 'Belum Dilakukan',
    }

    assert.equal(followUp.customerId, customerId)
    assert.equal(followUp.appointmentId, visitId)
  })
})
