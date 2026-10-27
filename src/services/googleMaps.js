const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
let googleMapsPromise
let callbackSequence = 0
let authFailureHandlerInstalled = false
let googleMapsAuthError = ''

function installAuthFailureHandler() {
  if (authFailureHandlerInstalled) return

  const previousHandler = window.gm_authFailure
  window.gm_authFailure = () => {
    googleMapsAuthError = 'Google Maps menolak API key. Periksa key, billing, dan HTTP referrer di Google Cloud.'
    try {
      previousHandler?.()
    } finally {
      window.dispatchEvent(new CustomEvent('callplan-google-maps-auth-error', {
        detail: { message: googleMapsAuthError },
      }))
    }
  }
  authFailureHandlerInstalled = true
}

export function hasGoogleMapsApiKey() {
  return Boolean(GOOGLE_MAPS_API_KEY)
}

export function getGoogleMapsAuthError() {
  return googleMapsAuthError
}

export function loadGoogleMaps() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Google Maps hanya dapat dimuat di browser.'))
  }

  if (googleMapsAuthError) return Promise.reject(new Error(googleMapsAuthError))
  if (window.google?.maps?.Geocoder) return Promise.resolve(window.google.maps)
  if (!GOOGLE_MAPS_API_KEY) {
    return Promise.reject(new Error('Google Maps belum dikonfigurasi. Isi VITE_GOOGLE_MAPS_API_KEY di .env lalu restart Vite.'))
  }
  if (googleMapsPromise) return googleMapsPromise
  installAuthFailureHandler()

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
  let timeout
  let removeAuthListener
  const authFailure = new Promise((resolve, reject) => {
    const handler = (event) => reject(new Error(event.detail?.message || 'Google Maps menolak API key. Periksa key, billing, dan HTTP referrer di Google Cloud.'))
    window.addEventListener('callplan-google-maps-auth-error', handler, { once: true })
    removeAuthListener = () => window.removeEventListener('callplan-google-maps-auth-error', handler)
  })
  try {
    response = await Promise.race([
      new maps.Geocoder().geocode(request),
      authFailure,
      new Promise((resolve, reject) => {
        timeout = window.setTimeout(
          () => reject(new Error('Google Geocoding terlalu lama merespons.')),
          5000,
        )
      }),
    ])
  } catch (error) {
    const status = String(error?.status || error?.code || '')
    if (status.includes('REQUEST_DENIED')) {
      throw new Error('Google Geocoding ditolak. Aktifkan Geocoding API, billing, dan HTTP referrer untuk domain aplikasi.', { cause: error })
    }
    if (status.includes('OVER_QUERY_LIMIT')) {
      throw new Error('Kuota Google Geocoding tercapai. Periksa kuota dan billing di Google Cloud.', { cause: error })
    }
    throw new Error(error instanceof Error ? error.message : 'Google Maps gagal mencari alamat.', { cause: error })
  } finally {
    window.clearTimeout(timeout)
    removeAuthListener?.()
  }
  const result = response.results?.[0]

  if (!result) return null

  return {
    latitude: result.geometry.location.lat(),
    longitude: result.geometry.location.lng(),
    address: result.formatted_address,
    countryCode: result.address_components?.find((component) => component.types.includes('country'))?.short_name || '',
  }
}

export async function searchGoogleAddress(address) {
  const result = await geocode({
    address,
    componentRestrictions: { country: 'ID' },
    region: 'id',
  })
  return result?.countryCode.toUpperCase() === 'ID' ? result : null
}

export async function reverseGoogleGeocode(latitude, longitude) {
  const result = await geocode({ location: { lat: Number(latitude), lng: Number(longitude) } })
  return result?.countryCode.toUpperCase() === 'ID' ? result.address : ''
}
