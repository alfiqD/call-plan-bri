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
    // RM strict data isolation check
    if (currentUser?.role === 'rm') {
      if (m.createdByRmId && m.createdByRmId !== currentUser.id) return false
    }

    if (filters.kategori && filters.kategori !== 'Semua' && m.type !== filters.kategori) {
      return false
    }

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
  test('menerima koordinat valid di Palembang/Bandung', () => {
    assert.equal(isValidCoordinate(-2.9761, 104.7754), true)
    assert.equal(isValidCoordinate('-6.9174640', '107.6191230'), true)
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
    { id: '1', name: 'Budi', type: 'Debitur', address: 'Jl. Merdeka, Palembang', visitStatus: 'Selesai', rmId: 'rm-01', createdByRmId: 'rm-01' },
    { id: '2', name: 'Siti', type: 'Prospek', address: 'Jl. Sudirman, Palembang', visitStatus: 'Terjadwal', rmId: 'rm-01', createdByRmId: 'rm-01' },
    { id: '3', name: 'Andi', type: 'Debitur', address: 'Jl. Anggrek, Palembang', visitStatus: 'Reschedule', rmId: 'rm-02', createdByRmId: 'rm-02' },
    { id: '4', name: 'Dewi', type: 'Prospek', address: 'Jl. Sukajadi, Palembang', visitStatus: 'Belum Ada Jadwal', rmId: 'rm-02', createdByRmId: 'rm-02' },
  ]

  test('memfilter berdasarkan kategori (Debitur vs Prospek)', () => {
    const debiturs = filterMapMarkers(sampleCustomers, { kategori: 'Debitur' }, { role: 'admin' })
    assert.equal(debiturs.length, 2)
    assert.ok(debiturs.every((d) => d.type === 'Debitur'))
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

  test('RM hanya dapat melihat nasabah binaannya sendiri (mencegah kebocoran lintas RM)', () => {
    const currentRM = { id: 'rm-01', role: 'rm' }
    const visibleToRM1 = filterMapMarkers(sampleCustomers, {}, currentRM)
    assert.equal(visibleToRM1.length, 2)
    assert.ok(visibleToRM1.every((m) => m.createdByRmId === 'rm-01'))
    assert.equal(visibleToRM1.some((m) => m.createdByRmId === 'rm-02'), false)
  })

  test('Reset filter mengembalikan seluruh marker sesuai hak akses', () => {
    const adminUser = { role: 'admin' }
    // Filter applied
    const filtered = filterMapMarkers(sampleCustomers, { kategori: 'Debitur', statusKunjungan: 'Selesai' }, adminUser)
    assert.equal(filtered.length, 1)

    // Reset applied (all 'Semua')
    const reset = filterMapMarkers(sampleCustomers, { kategori: 'Semua', statusKunjungan: 'Semua', wilayah: 'Semua', rmId: 'Semua' }, adminUser)
    assert.equal(reset.length, 4)
  })
})
