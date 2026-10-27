const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving'

export async function getDrivingRoute(origin, destination) {
  const coordinates = [
    `${Number(origin.longitude)},${Number(origin.latitude)}`,
    `${Number(destination.longitude)},${Number(destination.latitude)}`,
  ].join(';')
  const url = `${OSRM_ROUTE_URL}/${coordinates}?overview=full&geometries=geojson`
  let response

  try {
    response = await fetch(url)
  } catch (error) {
    console.error('Tidak dapat terhubung ke layanan rute OSRM.', error)
    throw new Error('Layanan rute tidak dapat dijangkau. Periksa koneksi internet lalu coba lagi.', { cause: error })
  }

  if (!response.ok) {
    throw new Error(`Layanan rute gagal merespons (${response.status}).`)
  }

  const payload = await response.json()
  const route = payload.routes?.[0]
  if (!route?.geometry?.coordinates?.length) {
    throw new Error('Rute jalan tidak ditemukan untuk kedua titik tersebut.')
  }

  return {
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
    distance: route.distance,
    duration: route.duration,
  }
}
