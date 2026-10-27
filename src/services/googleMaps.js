const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
let googleMapsPromise
let callbackSequence = 0

export function hasGoogleMapsApiKey() {
  return Boolean(GOOGLE_MAPS_API_KEY)
}

export function loadGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps hanya dapat dimuat di browser.'))
  }

  if (window.google?.maps?.Geocoder) return Promise.resolve(window.google.maps)
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps belum dikonfigurasi. Isi VITE_GOOGLE_MAPS_API_KEY di .env lalu restart Vite.'))
  }
  if (googleMapsPromise) return googleMapsPromise

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = `callPlanGoogleMapsReady${callbackSequence++}`
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => {
      delete window[callbackName]
      googleMapsPromise = undefined
      reject(new Error('Google Maps gagal dimuat. Periksa API key, izin Maps JavaScript API, billing, dan HTTP referrer di Google Cloud.'))
    }, 20000)

    window[callbackName] = () => {
      window.clearTimeout(timeout)
      delete window[callbackName]
      resolve(window.google.maps)
    }

    script.async = true
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&callback=${callbackName}&loading=async&v=weekly`
    script.onerror = () => {
      window.clearTimeout(timeout)
      delete window[callbackName]
      googleMapsPromise = undefined
      reject(new Error('Google Maps gagal dimuat. Periksa koneksi internet dan konfigurasi API key.'))
    }
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

async function geocode(request) {
  const maps = await loadGoogleMaps()
  let response
  try {
    response = await new maps.Geocoder().geocode(request)
  } catch (error) {
    const status = String(error?.status || error?.code || '')
    if (status.includes('REQUEST_DENIED')) {
      throw new Error('Google Geocoding ditolak. Aktifkan Geocoding API, billing, dan HTTP referrer untuk domain aplikasi.', { cause: error })
    }
    if (status.includes('OVER_QUERY_LIMIT')) {
      throw new Error('Kuota Google Geocoding tercapai. Periksa kuota dan billing di Google Cloud.', { cause: error })
    }
    throw new Error(error instanceof Error ? error.message : 'Google Maps gagal mencari alamat.', { cause: error })
  }
  const result = response.results?.[0]

  if (!result) return null

  return {
    latitude: result.geometry.location.lat(),
    longitude: result.geometry.location.lng(),
    address: result.formatted_address,
  }
}

export async function searchGoogleAddress(address) {
  return geocode({ address, region: 'id' })
}

export async function reverseGoogleGeocode(latitude, longitude) {
  const result = await geocode({ location: { lat: Number(latitude), lng: Number(longitude) } })
  return result?.address || ''
}
