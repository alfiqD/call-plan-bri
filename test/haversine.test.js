import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * Standard Haversine distance formula implementation (mirroring PostgreSQL and Laravel backend)
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) return null

  const earthRadius = 6371000.0 // meters
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2

  const clampedA = Math.min(1, Math.max(0, a))
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))
  return earthRadius * c
}

describe('Haversine GPS Distance & Check-In Validation', () => {
  const NASABAH_LAT = -6.9174640
  const NASABAH_LNG = 107.6191230

  it('mengembalikan 0 meter untuk koordinat yang identik', () => {
    const dist = haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, NASABAH_LAT, NASABAH_LNG)
    assert.equal(Math.round(dist), 0)
  })

  it('mengizinkan check-in jika RM berada di dalam radius 100 meter (misal ~35 meter)', () => {
    // Sedikit bergeser ~0.0003 derajat (~33 meter)
    const rmLat = -6.9177640
    const rmLng = 107.6191230
    const dist = haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, rmLat, rmLng)

    assert.ok(dist <= 100, `Jarak ${dist} meter seharusnya <= 100 meter`)
    assert.ok(dist >= 30 && dist <= 40)
  })

  it('menolak check-in jika RM berada di luar radius 100 meter (misal ~550 meter)', () => {
    const rmLat = -6.9124640
    const rmLng = 107.6191230
    const dist = haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, rmLat, rmLng)

    assert.ok(dist > 100, `Jarak ${dist} meter seharusnya > 100 meter`)
  })

  it('mengembalikan null jika salah satu koordinat bernilai null', () => {
    assert.equal(haversineDistanceMeters(null, NASABAH_LNG, NASABAH_LAT, NASABAH_LNG), null)
    assert.equal(haversineDistanceMeters(NASABAH_LAT, null, NASABAH_LAT, NASABAH_LNG), null)
    assert.equal(haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, null, NASABAH_LNG), null)
    assert.equal(haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, NASABAH_LAT, null), null)
  })

  it('menolak koordinat bernilai NaN atau tidak terdefinisi', () => {
    assert.equal(haversineDistanceMeters(NaN, NASABAH_LNG, NASABAH_LAT, NASABAH_LNG), null)
    assert.equal(haversineDistanceMeters(NASABAH_LAT, NASABAH_LNG, undefined, NASABAH_LNG), null)
  })

  it('mengukur jarak secara akurat di ekuator (Pontianak, 0 derajat)', () => {
    const lat1 = 0.0
    const lon1 = 109.3333
    // 0.0009 derajat di ekuator adalah ~100 meter (111.32 km per derajat)
    const lat2 = 0.0009
    const lon2 = 109.3333
    const dist = haversineDistanceMeters(lat1, lon1, lat2, lon2)

    assert.ok(dist >= 98 && dist <= 102, `Jarak ekuator ${dist} meter seharusnya ~100 meter`)
  })
})
