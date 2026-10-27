import { useState } from 'react'
import { ExternalLink, LoaderCircle, LocateFixed, MapPin, Route } from 'lucide-react'
import Modal from './Modal'
import LocationMap from './LocationMap'
import { getDrivingRoute } from '../services/mapRouting'
import { getMapLinks } from '../services/mapLinks'

function getCurrentLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Browser ini tidak mendukung akses lokasi perangkat.'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => {
        const messages = {
          1: 'Izin lokasi ditolak. Izinkan akses lokasi pada pengaturan browser lalu coba kembali.',
          2: 'Lokasi perangkat tidak tersedia. Periksa GPS atau layanan lokasi perangkat.',
          3: 'Permintaan lokasi melewati batas waktu. Coba kembali di area dengan sinyal GPS lebih baik.',
        }
        reject(new Error(messages[error.code] || 'Lokasi perangkat gagal dibaca.'))
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  })
}

function formatDistance(meters) {
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`
}

function formatDuration(seconds) {
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `sekitar ${minutes} menit` : `sekitar ${Math.floor(minutes / 60)} jam ${minutes % 60} menit`
}

function RouteMapModal({ customer, onClose }) {
  const hasCoordinates = customer.latitude !== null
    && customer.latitude !== undefined
    && customer.latitude !== ''
    && Number.isFinite(Number(customer.latitude))
    && customer.longitude !== null
    && customer.longitude !== undefined
    && customer.longitude !== ''
    && Number.isFinite(Number(customer.longitude))
  const [currentPosition, setCurrentPosition] = useState(null)
  const [route, setRoute] = useState(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createRoute = async () => {
    if (!hasCoordinates) return
    setError('')
    setIsLoading(true)
    try {
      const origin = await getCurrentLocation()
      setCurrentPosition(origin)
      const nextRoute = await getDrivingRoute(origin, {
        latitude: Number(customer.latitude),
        longitude: Number(customer.longitude),
      })
      setRoute(nextRoute)
    } catch (routeError) {
      console.error('Gagal menampilkan rute kunjungan.', routeError)
      setError(routeError instanceof Error ? routeError.message : 'Rute tidak dapat dimuat.')
    } finally {
      setIsLoading(false)
    }
  }

  const customerPosition = hasCoordinates
    ? { lat: Number(customer.latitude), lng: Number(customer.longitude) }
    : null
  const mapLinks = getMapLinks(customer)
  const hasDestination = hasCoordinates || Boolean(customer.address?.trim())
  const googleMapsRouteUrl = hasDestination
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hasCoordinates ? `${customer.latitude},${customer.longitude}` : customer.address)}&travelmode=driving`
    : ''
  const googleMapsPlaceUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.latitude},${customer.longitude}`)}`
    : mapLinks.googleMaps

  return (
    <Modal
      title={`Peta kunjungan · ${customer.name}`}
      description="Peta dan rute ditampilkan di dalam Call Plan."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <MapPin size={15} className="mt-0.5 shrink-0 text-indigo-600" />
          <div>
            <p className="font-semibold text-slate-800">{customer.address}</p>
            {hasCoordinates
              ? <p className="mt-1 text-[10px] text-slate-500">Titik nasabah tersimpan pada peta.</p>
              : <p className="mt-1 text-[10px] text-amber-700">Pin belum tersedia. Ubah data nasabah lalu pilih titik lokasinya pada peta.</p>}
          </div>
        </div>
        <LocationMap
          position={customerPosition}
          currentPosition={currentPosition}
          routeCoordinates={route?.coordinates}
        />
        {route && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Rute berkendara {formatDistance(route.distance)} · {formatDuration(route.duration)}</p>}
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <p className="text-[10px] leading-4 text-slate-400">Peta memakai OpenStreetMap; rute berkendara meminta layanan OSRM publik. Untuk prototipe ini, gunakan data demo—jangan kirim lokasi nasabah nyata.</p>
        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="button-secondary">Tutup</button>
          <a
            href={mapLinks.openStreetMap}
            target="_blank"
            rel="noopener noreferrer"
            className="button-secondary"
          >
            <ExternalLink size={14} />OpenStreetMap
          </a>
          <a
            href={googleMapsPlaceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="button-secondary"
          >
            <ExternalLink size={14} />Lihat di Google Maps
          </a>
          <a
            href={googleMapsRouteUrl || undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!hasDestination}
            onClick={(event) => {
              if (!hasDestination) event.preventDefault()
            }}
            className={`button-secondary ${!hasDestination ? 'pointer-events-none opacity-50' : ''}`}
          >
            <ExternalLink size={14} /><Route size={14} />Rute Google Maps
          </a>
          {hasCoordinates && <a href={mapLinks.streetView} target="_blank" rel="noopener noreferrer" className="button-secondary"><ExternalLink size={14} />Street View</a>}
          <button type="button" onClick={createRoute} disabled={!hasCoordinates || isLoading} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">
            {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <><LocateFixed size={14} /><Route size={14} /></>}
            {isLoading ? 'Membuat rute...' : 'Buat rute dari lokasi saya'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default RouteMapModal
