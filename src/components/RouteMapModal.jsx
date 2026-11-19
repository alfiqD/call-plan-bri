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
  const googleMapsPlaceUrl = hasCoordinates
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.latitude},${customer.longitude}`)}`
    : mapLinks.googleMaps

  return (
    <Modal
      title={`Rute Kunjungan · ${customer.name}`}
      description="Peta navigasi dan rute perjalanan menuju lokasi nasabah."
      onClose={onClose}
      wide
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs leading-5 text-slate-600">
          <MapPin size={16} className="mt-0.5 shrink-0 text-[#00529b]" />
          <div>
            <p className="font-semibold text-slate-800">{customer.address}</p>
            {hasCoordinates
              ? <p className="mt-0.5 text-[11px] text-emerald-700 font-medium">Titik koordinat nasabah terverifikasi pada peta.</p>
              : <p className="mt-0.5 text-[11px] text-amber-700 font-medium">Pin belum tersedia. Ubah data nasabah lalu tandai titik lokasinya pada peta.</p>}
          </div>
        </div>
        <LocationMap
          position={customerPosition}
          currentPosition={currentPosition}
          routeCoordinates={route?.coordinates}
        />
        {route && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">Rute berkendara {formatDistance(route.distance)} · {formatDuration(route.duration)}</p>}
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <p className="text-[11px] leading-4 text-slate-500">Estimasi rute berkendara dihitung berdasarkan posisi perangkat saat ini.</p>
        <div className="sticky bottom-0 -mx-3.5 -mb-3.5 flex flex-col gap-2 border-t border-slate-100 bg-white px-3.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:static sm:mx-0 sm:mb-0 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            <a
              href={mapLinks.openStreetMap}
              target="_blank"
              rel="noopener noreferrer"
              className="button-secondary !min-h-[40px] flex-1 text-xs sm:flex-none"
            >
              <ExternalLink size={13} />OpenStreetMap
            </a>
            <a
              href={googleMapsPlaceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="button-secondary !min-h-[40px] flex-1 text-xs sm:flex-none"
            >
              <ExternalLink size={13} />Google Maps
            </a>
            {hasCoordinates && (
              <a
                href={mapLinks.streetView}
                target="_blank"
                rel="noopener noreferrer"
                className="button-secondary !min-h-[40px] flex-1 text-xs sm:flex-none"
              >
                <ExternalLink size={13} />Street View
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={createRoute}
            disabled={!hasCoordinates || isLoading}
            className="button-orange !min-h-[44px] w-full disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? <LoaderCircle size={14} className="animate-spin" /> : <><LocateFixed size={14} /><Route size={14} /></>}
            {isLoading ? 'Menghitung rute...' : 'Buat Rute dari Lokasi Saya'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default RouteMapModal
