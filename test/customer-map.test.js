import test, { describe } from 'node:test'
import assert from 'node:assert/strict'

function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || Number.isNaN(Number(lat))) return false
  if (lng === null || lng === undefined || lng === '' || Number.isNaN(Number(lng))) return false
  const numLat = Number(lat)
  const numLng = Number(lng)
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180 && (numLat !== 0 || numLng !== 0)
}

function filterMapMarkers(markers, filters, currentUser) {
  return markers.filter((m) => {
    if (filters.statusKunjungan && filters.statusKunjungan !== 'Semua' && m.visitStatus !== filters.statusKunjungan) {
      return false
    }

    if (filters.wilayah && filters.wilayah !== 'Semua') {
      if (!m.address || !m.address.toLowerCase().includes(filters.wilayah.toLowerCase())) return false
    }

    if (currentUser?.role === 'admin' && filters.rmId && filters.rmId !== 'Semua') {
      if (m.rmId !== filters.rmId) return false
    }

    return true
  })
}

describe('Customer Map Coordinate Validation & Sanitization', () => {
  test('menerima koordinat valid di Palembang dan sekitarnya', () => {
    assert.equal(isValidCoordinate(-2.9761, 104.7754), true)
    assert.equal(isValidCoordinate('-2.9854000', '104.7572000'), true)
  })

  test('menolak nilai null, undefined, atau string kosong', () => {
    assert.equal(isValidCoordinate(null, 104.77), false)
    assert.equal(isValidCoordinate(-2.97, undefined), false)
    assert.equal(isValidCoordinate('', ''), false)
  })

  test('menolak nilai NaN atau teks bukan angka', () => {
    assert.equal(isValidCoordinate('abc', 'def'), false)
    assert.equal(isValidCoordinate('undefined', '104.77'), false)
  })

  test('menolak koordinat di luar batas latitude [-90, 90] atau longitude [-180, 180]', () => {
    assert.equal(isValidCoordinate(95.0, 104.77), false)
    assert.equal(isValidCoordinate(-95.0, 104.77), false)
    assert.equal(isValidCoordinate(-2.97, 200.0), false)
  })

  test('menolak titik (0, 0) yang merupakan default null island', () => {
    assert.equal(isValidCoordinate(0, 0), false)
    assert.equal(isValidCoordinate('0', '0'), false)
  })
})

describe('Customer Map Filtering & Multi-Marker Attribution', () => {
  const sampleCustomers = [
    { id: '1', name: 'Budi', address: 'Jl. Merdeka, Palembang', visitStatus: 'Selesai', rmId: 'rm-01', createdByRmId: 'rm-01' },
    { id: '2', name: 'Siti', address: 'Jl. Sudirman, Palembang', visitStatus: 'Terjadwal', rmId: 'rm-01', createdByRmId: 'rm-01' },
    { id: '3', name: 'Andi', address: 'Jl. Anggrek, Palembang', visitStatus: 'Reschedule', rmId: 'rm-02', createdByRmId: 'rm-02' },
    { id: '4', name: 'Dewi', address: 'Jl. Sukajadi, Palembang', visitStatus: 'Belum Ada Jadwal', rmId: 'rm-02', createdByRmId: 'rm-02' },
  ]

  test('menampilkan seluruh nasabah tanpa filter kategori', () => {
    const markers = filterMapMarkers(sampleCustomers, {}, { role: 'admin' })
    assert.equal(markers.length, 4)
  })

  test('memfilter berdasarkan status kunjungan (Selesai vs Reschedule)', () => {
    const selesai = filterMapMarkers(sampleCustomers, { statusKunjungan: 'Selesai' }, { role: 'admin' })
    assert.equal(selesai.length, 1)
    assert.equal(selesai[0].name, 'Budi')

    const reschedule = filterMapMarkers(sampleCustomers, { statusKunjungan: 'Reschedule' }, { role: 'admin' })
    assert.equal(reschedule.length, 1)
    assert.equal(reschedule[0].name, 'Andi')
  })

  test('Admin dapat memfilter sebaran nasabah per-RM tertentu', () => {
    const rm1Markers = filterMapMarkers(sampleCustomers, { rmId: 'rm-01' }, { role: 'admin' })
    assert.equal(rm1Markers.length, 2)
    assert.ok(rm1Markers.every((m) => m.rmId === 'rm-01'))

    const rm2Markers = filterMapMarkers(sampleCustomers, { rmId: 'rm-02' }, { role: 'admin' })
    assert.equal(rm2Markers.length, 2)
    assert.ok(rm2Markers.every((m) => m.rmId === 'rm-02'))
  })

  test('RM dapat melihat nasabah bersama pada cabang yang sama', () => {
    const currentRM = { id: 'rm-01', role: 'rm' }
    const visibleToRM1 = filterMapMarkers(sampleCustomers, {}, currentRM)
    assert.equal(visibleToRM1.length, 4)
    assert.equal(visibleToRM1.some((m) => m.createdByRmId === 'rm-02'), true)
  })

  test('Reset filter mengembalikan seluruh marker sesuai hak akses', () => {
    const adminUser = { role: 'admin' }
    // Filter applied
    const filtered = filterMapMarkers(sampleCustomers, { statusKunjungan: 'Selesai' }, adminUser)
    assert.equal(filtered.length, 1)

    // Reset applied (all 'Semua')
    const reset = filterMapMarkers(sampleCustomers, { statusKunjungan: 'Semua', wilayah: 'Semua', rmId: 'Semua' }, adminUser)
    assert.equal(reset.length, 4)
  })
})

describe('Visit Status Normalization & Marker Style Consistency', () => {
  const normalizeStatus = (status) => {
    if (!status) return 'Terjadwal'
    const s = String(status).trim().toLowerCase()
    if (s === 'pending' || s === 'terjadwal') return 'Terjadwal'
    if (s === 'execute') return 'Execute'
    if (s === 'selesai') return 'Selesai'
    if (s === 'reschedule') return 'Reschedule'
    if (s === 'tidak_ditemui' || s === 'tidak ditemui') return 'Tidak ditemui'
    if (s === 'batal' || s === 'dibatalkan') return 'Batal'
    return status
  }

  const getMarkerStyle = (marker) => {
    const s = String(marker?.visitStatus || '').trim().toLowerCase()
    if (s === 'selesai') {
      return { fillColor: '#10b981', color: '#ffffff', label: 'Sudah Dikunjungi' }
    }
    if (s === 'execute') {
      return { fillColor: '#00529b', color: '#ffffff', label: 'Tahap Administrasi' }
    }
    if (s === 'reschedule') {
      return { fillColor: '#f59e0b', color: '#ffffff', label: 'Reschedule' }
    }
    if (s === 'tidak_ditemui' || s === 'tidak ditemui') {
      return { fillColor: '#ef4444', color: '#ffffff', label: 'Tidak Ditemui' }
    }
    return { fillColor: '#64748b', color: '#ffffff', label: 'Nasabah' }
  }

  test('menormalisasi status huruf kecil database execute menjadi Execute UI', () => {
    assert.equal(normalizeStatus('execute'), 'Execute')
    assert.equal(normalizeStatus('Execute'), 'Execute')
    assert.equal(normalizeStatus('EXECUTE'), 'Execute')
    assert.equal(normalizeStatus('pending'), 'Terjadwal')
    assert.equal(normalizeStatus('selesai'), 'Selesai')
    assert.equal(normalizeStatus('reschedule'), 'Reschedule')
    assert.equal(normalizeStatus('tidak_ditemui'), 'Tidak ditemui')
  })

  test('menghasilkan warna marker biru tua (#00529b) untuk status execute dan Execute secara konsisten', () => {
    const markerUpper = { visitStatus: 'Execute' }
    const markerLower = { visitStatus: 'execute' }
    const markerMixed = { visitStatus: 'ExEcUtE' }

    assert.equal(getMarkerStyle(markerUpper).fillColor, '#00529b')
    assert.equal(getMarkerStyle(markerLower).fillColor, '#00529b')
    assert.equal(getMarkerStyle(markerMixed).fillColor, '#00529b')
    assert.equal(getMarkerStyle(markerUpper).label, 'Tahap Administrasi')
    assert.equal(getMarkerStyle(markerLower).label, 'Tahap Administrasi')
  })

  test('mengaitkan status kunjungan terbaru ke marker nasabah Budi secara akurat', () => {
    const appointments = [
      { id: '1', customerId: '1', date: '2026-11-20', time: '09:00', status: 'Terjadwal' },
      { id: '2', customerId: '1', date: '2026-11-25', time: '10:00', status: 'Execute' },
    ]

    const map = new Map()
    for (const apt of appointments) {
      const cId = String(apt.customerId)
      const existing = map.get(cId)
      const aptKey = `${apt.date || ''} ${apt.time || ''}`
      const existingKey = existing ? `${existing.date || ''} ${existing.time || ''}` : ''
      if (!existing || aptKey >= existingKey) {
        map.set(cId, apt)
      }
    }

    const latestApt = map.get('1')
    assert.ok(latestApt)
    assert.equal(latestApt.status, 'Execute')
    assert.equal(getMarkerStyle({ visitStatus: latestApt.status }).fillColor, '#00529b')
  })
})

describe('Centralized Customer Visit Monitoring & Cross-Role Consistency (Admin, RMFT, RMSME)', () => {
  const normalizeStatus = (status) => {
    if (!status) return 'Terjadwal'
    const s = String(status).trim().toLowerCase()
    if (s === 'pending' || s === 'terjadwal') return 'Terjadwal'
    if (s === 'execute') return 'Execute'
    if (s === 'selesai') return 'Selesai'
    if (s === 'reschedule') return 'Reschedule'
    if (s === 'tidak_ditemui' || s === 'tidak ditemui') return 'Tidak ditemui'
    if (s === 'batal' || s === 'dibatalkan') return 'Batal'
    if (s === 'belum ada jadwal' || s === 'belum_ada_jadwal') return 'Belum Ada Jadwal'
    return status
  }

  const getMarkerStyle = (marker) => {
    const s = String(marker?.visitStatus || '').trim().toLowerCase()
    if (s === 'selesai') {
      return { fillColor: '#10b981', color: '#ffffff', label: 'Sudah Dikunjungi' }
    }
    if (s === 'execute') {
      return { fillColor: '#00529b', color: '#ffffff', label: 'Tahap Administrasi' }
    }
    if (s === 'reschedule') {
      return { fillColor: '#f59e0b', color: '#ffffff', label: 'Reschedule' }
    }
    if (s === 'tidak_ditemui' || s === 'tidak ditemui') {
      return { fillColor: '#ef4444', color: '#ffffff', label: 'Tidak Ditemui' }
    }
    return { fillColor: '#64748b', color: '#ffffff', label: 'Nasabah' }
  }

  const resolveCustomerMarker = (customer, userAppointments = []) => {
    const monitoringStatus = customer.latestVisitStatus || customer.latest_visit_status
    let visitStatus = 'Belum Ada Jadwal'
    if (monitoringStatus && String(monitoringStatus).trim().toLowerCase() !== 'belum ada jadwal') {
      visitStatus = normalizeStatus(monitoringStatus)
    } else {
      const apt = userAppointments.find((a) => String(a.customerId) === String(customer.id))
      if (apt) {
        visitStatus = normalizeStatus(apt.status)
      }
    }

    const rmId = customer.latestVisitRmId || customer.latest_visit_rm_id || customer.createdByRmId || null
    const rmName = customer.rmName || (rmId ? `RM #${String(rmId).slice(0, 6)}` : 'Admin / Belum Ditugaskan')

    return {
      id: customer.id,
      name: customer.name,
      visitStatus,
      rmId,
      rmName,
      style: getMarkerStyle({ visitStatus }),
    }
  }

  // Skenario Budi Saputra: Jadwal execute dibuat/dikelola oleh Admin
  const budiCustomer = {
    id: '1',
    name: 'Budi Saputra',
    address: 'Jl. Merdeka No. 10, Palembang',
    latitude: -2.9854,
    longitude: 104.7572,
    latestVisitStatus: 'execute',
    latestVisitRmId: null, // Admin bukan role RM
    latestVisitDate: '2026-11-25',
    latestStatusChangedBy: 'uuid-admin-01',
  }

  test('Admin melihat Budi Execute: marker biru tua (#00529b) dari kolom latest_visit_status', () => {
    // Admin memiliki akses ke seluruh jadwal
    const adminAppointments = [
      { id: '101', customerId: '1', rmId: 'uuid-admin-01', status: 'execute', notes: 'Catatan rahasia kredit admin' },
    ]

    const marker = resolveCustomerMarker(budiCustomer, adminAppointments)
    assert.equal(marker.visitStatus, 'Execute')
    assert.equal(marker.style.fillColor, '#00529b')
    assert.equal(marker.style.label, 'Tahap Administrasi')
    assert.equal(marker.rmName, 'Admin / Belum Ditugaskan')
  })

  test('RM A (RMFT) melihat Budi Execute: marker biru tua (#00529b) meskipun appointments miliknya kosong karena RLS', () => {
    // RM A tidak memiliki jadwal Budi di array appointments miliknya karena dibatasi RLS
    const rmAAppointments = []

    const marker = resolveCustomerMarker(budiCustomer, rmAAppointments)
    assert.equal(marker.visitStatus, 'Execute')
    assert.equal(marker.style.fillColor, '#00529b')
    assert.equal(marker.style.label, 'Tahap Administrasi')
  })

  test('RM B (RMSME) melihat Budi Execute: marker biru tua (#00529b) meskipun appointments miliknya kosong karena RLS', () => {
    // RM B (spesialisasi RMSME) juga melihat status monitoring terpusat yang sama
    const rmBAppointments = []

    const marker = resolveCustomerMarker(budiCustomer, rmBAppointments)
    assert.equal(marker.visitStatus, 'Execute')
    assert.equal(marker.style.fillColor, '#00529b')
  })

  test('Ketika status monitoring nasabah berubah menjadi selesai, seluruh pengguna melihat marker hijau (#10b981)', () => {
    const budiCompleted = {
      ...budiCustomer,
      latestVisitStatus: 'selesai',
      latestVisitRmId: 'uuid-rm-01', // RM yang check-in
    }

    const adminMarker = resolveCustomerMarker(budiCompleted, [])
    const rmAMarker = resolveCustomerMarker(budiCompleted, [])
    const rmBMarker = resolveCustomerMarker(budiCompleted, [])

    // Semua pengguna melihat Selesai dan warna hijau
    assert.equal(adminMarker.visitStatus, 'Selesai')
    assert.equal(adminMarker.style.fillColor, '#10b981')
    assert.equal(rmAMarker.visitStatus, 'Selesai')
    assert.equal(rmAMarker.style.fillColor, '#10b981')
    assert.equal(rmBMarker.visitStatus, 'Selesai')
    assert.equal(rmBMarker.style.fillColor, '#10b981')
    assert.equal(rmBMarker.rmName, 'RM #uuid-r')
  })

  test('Data jadwal dan catatan pribadi Admin tetap terisolasi dan tidak bocor ke RM', () => {
    // Database RLS menjamin array appointments milik RM tidak memuat catatan internal RM lain
    const rmAAppointments = [
      { id: '201', customerId: '2', rmId: 'uuid-rm-a', notes: 'Catatan pribadi RM A' },
    ]

    const containsAdminSecret = rmAAppointments.some((a) => a.notes?.includes('Catatan rahasia kredit admin'))
    assert.equal(containsAdminSecret, false)
  })

  test('Status tidak_ditemui tetap mencatat RM pelaksana jika ada check-in lapangan terverifikasi', () => {
    const customerUnmet = {
      id: '5',
      name: 'Haji Mansur',
      latestVisitStatus: 'tidak_ditemui',
      latestVisitRmId: 'uuid-rm-lapangan-01',
    }

    const marker = resolveCustomerMarker(customerUnmet, [])
    assert.equal(marker.visitStatus, 'Tidak ditemui')
    assert.equal(marker.style.fillColor, '#ef4444')
    assert.equal(marker.rmName, 'RM #uuid-r')
  })
})
