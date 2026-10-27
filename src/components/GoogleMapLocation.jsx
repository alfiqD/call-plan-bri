import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle } from 'lucide-react'
import { loadGoogleMaps } from '../services/googleMaps'

const PALEMBANG_CENTER = { lat: -2.9761, lng: 104.7754 }

function GoogleMapLocation({ position, onPick, className = '' }) {
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
    let isActive = true
    let clickListener

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
      setIsReady(true)
    }).catch((mapError) => {
      if (isActive) setError(mapError instanceof Error ? mapError.message : 'Google Maps gagal dimuat.')
    })

    return () => {
      isActive = false
      clickListener?.remove()
      markerRef.current?.setMap(null)
    }
  }, [])

  useEffect(() => {
    if (!isReady || !mapRef.current || latitude === undefined || longitude === undefined) return
    const center = { lat: Number(latitude), lng: Number(longitude) }
    mapRef.current.setCenter(center)
    markerRef.current?.setPosition(center)
    markerRef.current?.setMap(mapRef.current)
  }, [isReady, latitude, longitude])

  if (error) {
    return (
      <div className={`flex h-[360px] flex-col items-center justify-center gap-3 rounded-xl bg-slate-100 p-6 text-center ${className}`}>
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
    <div className={`relative h-[360px] w-full overflow-hidden rounded-xl bg-slate-100 ${className}`}>
      {!isReady && <div className="absolute inset-0 z-10 flex items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Memuat Google Maps...</div>}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  )
}

export default GoogleMapLocation
