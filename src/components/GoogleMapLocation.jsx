import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle } from 'lucide-react'
import { getGoogleMapsAuthError, loadGoogleMaps } from '../services/googleMaps'

const PALEMBANG_CENTER = { lat: -2.9761, lng: 104.7754 }

function GoogleMapLocation({ position, onPick, onMapError, className = '', height = '360px' }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onPickRef = useRef(onPick)
  const initialPositionRef = useRef(position)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')

  const latitude = position?.lat
  const longitude = position?.lng

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    const handleAuthFailure = (event) => {
      const message = event.detail?.message || 'Google Maps menolak API key. Periksa key, billing, dan HTTP referrer di Google Cloud.'
      setError(message)
      onMapError?.(new Error(message))
    }
    window.addEventListener('callplan-google-maps-auth-error', handleAuthFailure)
    if (getGoogleMapsAuthError()) handleAuthFailure({ detail: { message: getGoogleMapsAuthError() } })
    return () => window.removeEventListener('callplan-google-maps-auth-error', handleAuthFailure)
  }, [onMapError])

  useEffect(() => {
    let isActive = true
    let clickListener
    let tilesListener
    let tilesTimeout

    loadGoogleMaps().then((maps) => {
      if (!isActive || !containerRef.current) return

      const initialPosition = initialPositionRef.current
      const center = initialPosition
        ? { lat: Number(initialPosition.lat), lng: Number(initialPosition.lng) }
        : PALEMBANG_CENTER
      const map = new maps.Map(containerRef.current, {
        center,
        zoom: 16,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
      })
      const marker = new maps.Marker({
        map: initialPosition ? map : null,
        position: initialPosition ? center : undefined,
        title: 'Lokasi nasabah',
      })

      mapRef.current = map
      markerRef.current = marker
      tilesListener = map.addListener('tilesloaded', () => {
        window.clearTimeout(tilesTimeout)
        if (isActive) setIsReady(true)
        tilesListener?.remove()
      })
      tilesTimeout = window.setTimeout(() => {
        if (!isActive) return
        const mapError = new Error('Google Maps tidak memuat gambar peta. Periksa API key, billing, dan referrer; beralih ke OpenStreetMap.')
        setError(mapError.message)
        onMapError?.(mapError)
      }, 12000)
      clickListener = map.addListener('click', (event) => {
        if (!event.latLng) return
        const selectedPosition = {
          lat: event.latLng.lat(),
          lng: event.latLng.lng(),
        }
        marker.setPosition(selectedPosition)
        marker.setMap(map)
        onPickRef.current?.(selectedPosition)
      })
    }).catch((mapError) => {
      if (!isActive) return
      const message = mapError instanceof Error ? mapError.message : 'Google Maps gagal dimuat.'
      setError(message)
      onMapError?.(mapError)
    })

    return () => {
      isActive = false
      window.clearTimeout(tilesTimeout)
      tilesListener?.remove()
      clickListener?.remove()
      markerRef.current?.setMap(null)
    }
  }, [onMapError])

  useEffect(() => {
    if (!isReady || !mapRef.current || latitude === undefined || longitude === undefined) return
    const center = { lat: Number(latitude), lng: Number(longitude) }
    mapRef.current.setCenter(center)
    markerRef.current?.setPosition(center)
    markerRef.current?.setMap(mapRef.current)
  }, [isReady, latitude, longitude])

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-xl bg-slate-100 p-6 text-center ${className}`} style={{ height }}>
        <p className="text-xs leading-5 text-rose-700" role="alert">{error}</p>
        <a
          href="https://maps.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="button-secondary"
        >
          <ExternalLink size={14} />Buka Google Maps
        </a>
      </div>
    )
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-slate-100 ${className}`} style={{ height }}>
      {!isReady && <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Memuat Google Maps...</div>}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

export default GoogleMapLocation
