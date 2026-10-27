const NOMINATIM_URL = 'https://nominatim.openstreetmap.org'
let requestQueue = Promise.resolve()
let lastRequestAt = 0

async function requestNominatim(path, signal) {
  let response
  const request = requestQueue.then(async () => {
    if (signal?.aborted) throw new DOMException('Address lookup was cancelled.', 'AbortError')
    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt))
    if (delay) await new Promise((resolve) => window.setTimeout(resolve, delay))
    if (signal?.aborted) throw new DOMException('Address lookup was cancelled.', 'AbortError')
    lastRequestAt = Date.now()
    return fetch(`${NOMINATIM_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'id',
      },
      signal,
    })
  })
  requestQueue = request.then(() => undefined, () => undefined)

  try {
    response = await request
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    console.error('Tidak dapat terhubung ke layanan pencarian alamat OpenStreetMap.', error)
    throw new Error('Layanan pencarian alamat tidak dapat dijangkau. Periksa koneksi internet lalu coba lagi.', { cause: error })
  }

  if (!response.ok) {
    throw new Error(`Layanan pencarian alamat gagal merespons (${response.status}).`)
  }

  return response.json()
}

export async function searchAddress(address, { signal } = {}) {
  const results = await requestNominatim(
    `/search?format=jsonv2&limit=1&q=${encodeURIComponent(address)}`,
    signal,
  )
  const result = results[0]

  if (!result) return null

  return {
    latitude: Number(result.lat),
    longitude: Number(result.lon),
    address: result.display_name,
  }
}

export async function reverseGeocode(latitude, longitude, { signal } = {}) {
  const result = await requestNominatim(
    `/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`,
    signal,
  )

  return result.display_name || ''
}
