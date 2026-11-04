/**
 * GPS Validation & Geolocation Stabilization Service
 * CallPlan Bank BRI KCP Iskandar Palembang
 */

export const MAX_CHECK_IN_RADIUS_METERS = 100
export const MAX_ALLOWABLE_GPS_ACCURACY_METERS = 100
export const GOOD_GPS_ACCURACY_METERS = 30

/**
 * Standard Haversine distance formula in meters.
 * Returns null if any coordinate is null, undefined, or NaN.
 */
export function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (lat1 === null || lon1 === null || lat2 === null || lon2 === null) return null
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return null

  const nLat1 = Number(lat1)
  const nLon1 = Number(lon1)
  const nLat2 = Number(lat2)
  const nLon2 = Number(lon2)

  if (!Number.isFinite(nLat1) || !Number.isFinite(nLon1) || !Number.isFinite(nLat2) || !Number.isFinite(nLon2)) {
    return null
  }

  const earthRadius = 6371000.0 // meters
  const dLat = (nLat2 - nLat1) * (Math.PI / 180)
  const dLon = (nLon2 - nLon1) * (Math.PI / 180)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(nLat1 * (Math.PI / 180)) *
      Math.cos(nLat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) ** 2

  const clampedA = Math.min(1, Math.max(0, a))
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA))
  return earthRadius * c
}

/**
 * Requests high-accuracy GPS coordinates with hardware stabilization.
 * Listens for up to 2.5 seconds to acquire the best accuracy reading if the first fix has high variance.
 */
export function getHighAccuracyLocation({
  timeout = 15000,
  stabilizeTimeMs = 2500,
  targetAccuracyMeters = GOOD_GPS_ACCURACY_METERS,
} = {}) {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Peramban (browser) ini tidak mendukung sensor GPS Geolocation.'))
      return
    }

    let bestReading = null
    let watchId = null
    let stabilizationTimer = null
    let hardTimeoutTimer = null
    let isSettled = false

    const cleanup = () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId)
        watchId = null
      }
      if (stabilizationTimer) {
        clearTimeout(stabilizationTimer)
        stabilizationTimer = null
      }
      if (hardTimeoutTimer) {
        clearTimeout(hardTimeoutTimer)
        hardTimeoutTimer = null
      }
    }

    const finish = (reading) => {
      if (isSettled) return
      isSettled = true
      cleanup()
      resolve(reading)
    }

    const fail = (error) => {
      if (isSettled) return
      // If we already have any valid fix, return it rather than failing
      if (bestReading) {
        finish(bestReading)
        return
      }
      isSettled = true
      cleanup()

      const messages = {
        1: 'Izin akses GPS ditolak. Silakan aktifkan izin lokasi pada pengaturan browser atau perangkat Anda.',
        2: 'Sinyal GPS tidak tersedia. Periksa apakah GPS dan layanan lokasi perangkat Anda aktif.',
        3: 'Pengambilan lokasi GPS melewati batas waktu (timeout). Disarankan mencoba di area terbuka.',
      }
      reject(new Error(messages[error?.code] || error?.message || 'Lokasi perangkat gagal dibaca.'))
    }

    // Set hard timeout fallback
    hardTimeoutTimer = setTimeout(() => {
      if (bestReading) {
        finish(bestReading)
      } else {
        fail({ code: 3, message: 'GPS timeout' })
      }
    }, timeout)

    // Watch position for stabilization window
    try {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, altitude, heading, speed } = position.coords
          const currentFix = {
            latitude,
            longitude,
            accuracy: accuracy || 999,
            altitude: altitude ?? null,
            heading: heading ?? null,
            speed: speed ?? null,
            timestamp: position.timestamp || Date.now(),
          }

          if (!bestReading || currentFix.accuracy < bestReading.accuracy) {
            bestReading = currentFix
          }

          // If reading meets optimal target accuracy right away, resolve immediately
          if (bestReading.accuracy <= targetAccuracyMeters) {
            finish(bestReading)
            return
          }

          // Otherwise, start stabilization timer if not already running
          if (!stabilizationTimer) {
            stabilizationTimer = setTimeout(() => {
              if (bestReading) {
                finish(bestReading)
              }
            }, stabilizeTimeMs)
          }
        },
        (error) => {
          // If error occurs but we already have a previous reading, use it
          if (bestReading) {
            finish(bestReading)
          } else {
            fail(error)
          }
        },
        {
          enableHighAccuracy: true,
          timeout,
          maximumAge: 0,
        }
      )
    } catch (err) {
      fail(err)
    }
  })
}

/**
 * Validates whether GPS fix is acceptable for check-in against customer location.
 */
export function validateCheckInLocation({
  customerLat,
  customerLng,
  rmLat,
  rmLng,
  accuracy,
}) {
  if (customerLat === null || customerLat === undefined || customerLat === '' ||
      customerLng === null || customerLng === undefined || customerLng === '') {
    return {
      isValid: false,
      distanceMeters: null,
      isAccuracyPoor: false,
      isWithinRadius: false,
      message: 'Koordinat nasabah belum tersedia pada peta. Tentukan titik lokasi nasabah terlebih dahulu.',
    }
  }

  const distance = haversineDistanceMeters(customerLat, customerLng, rmLat, rmLng)
  if (distance === null) {
    return {
      isValid: false,
      distanceMeters: null,
      isAccuracyPoor: false,
      isWithinRadius: false,
      message: 'Koordinat lokasi perangkat tidak valid.',
    }
  }

  const roundedDistance = Math.round(distance)
  const roundedAccuracy = Math.round(accuracy || 0)
  const isAccuracyPoor = roundedAccuracy > MAX_ALLOWABLE_GPS_ACCURACY_METERS
  const isWithinRadius = roundedDistance <= MAX_CHECK_IN_RADIUS_METERS

  if (isAccuracyPoor) {
    return {
      isValid: false,
      distanceMeters: roundedDistance,
      accuracy: roundedAccuracy,
      isAccuracyPoor: true,
      isWithinRadius,
      message: `Akurasi sinyal GPS perangkat Anda saat ini kurang memadai (±${roundedAccuracy} meter). Toleransi akurasi maksimal ${MAX_ALLOWABLE_GPS_ACCURACY_METERS} meter. Disarankan berpindah ke area terbuka agar sinyal satelit GPS lebih presisi.`,
    }
  }

  if (!isWithinRadius) {
    return {
      isValid: false,
      distanceMeters: roundedDistance,
      accuracy: roundedAccuracy,
      isAccuracyPoor: false,
      isWithinRadius: false,
      message: `Check-in ditolak. Anda berada sejauh ${roundedDistance} meter dari titik nasabah. Radius maksimal yang diizinkan adalah ${MAX_CHECK_IN_RADIUS_METERS} meter.`,
    }
  }

  return {
    isValid: true,
    distanceMeters: roundedDistance,
    accuracy: roundedAccuracy,
    isAccuracyPoor: false,
    isWithinRadius: true,
    message: `Lokasi valid. Anda berjarak ${roundedDistance} meter dari titik nasabah dengan akurasi GPS ±${roundedAccuracy} meter.`,
  }
}
