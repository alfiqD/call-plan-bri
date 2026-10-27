import { useEffect } from 'react'
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

const PALEMBANG_CENTER = [-2.9761, 104.7754]

function MapViewport({ center }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 15))
    const timeout = window.setTimeout(() => map.invalidateSize(), 100)
    return () => window.clearTimeout(timeout)
  }, [center, map])

  return null
}

function MapClickHandler({ onPick }) {
  useMapEvents({
    click(event) {
      onPick?.({ lat: event.latlng.lat, lng: event.latlng.lng })
    },
  })

  return null
}

function LocationMap({
  position,
  currentPosition,
  routeCoordinates = [],
  onPick,
  className = '',
}) {
  const center = position
    ? [Number(position.lat ?? position.latitude), Number(position.lng ?? position.longitude)]
    : PALEMBANG_CENTER
  const start = currentPosition
    ? [Number(currentPosition.lat ?? currentPosition.latitude), Number(currentPosition.lng ?? currentPosition.longitude)]
    : null

  return (
    <MapContainer
      center={center}
      zoom={15}
      scrollWheelZoom
      className={`h-[360px] w-full rounded-xl ${className}`}
    >
      <MapViewport center={center} />
      <MapClickHandler onPick={onPick} />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {position && (
        <CircleMarker center={center} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#4f46e5', fillOpacity: 1 }}>
          <Tooltip permanent direction="top">Lokasi nasabah</Tooltip>
        </CircleMarker>
      )}
      {start && (
        <CircleMarker center={start} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#059669', fillOpacity: 1 }}>
          <Tooltip permanent direction="top">Lokasi RM</Tooltip>
        </CircleMarker>
      )}
      {routeCoordinates.length > 1 && (
        <Polyline positions={routeCoordinates} pathOptions={{ color: '#4f46e5', weight: 5, opacity: 0.8 }} />
      )}
    </MapContainer>
  )
}

export default LocationMap
