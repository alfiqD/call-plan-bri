function hasCoordinates(location) {
  const hasLatitude = location.latitude !== null && location.latitude !== undefined && location.latitude !== ''
  const hasLongitude = location.longitude !== null && location.longitude !== undefined && location.longitude !== ''

  return hasLatitude
    && Number.isFinite(Number(location.latitude))
    && hasLongitude
    && Number.isFinite(Number(location.longitude))
}

export function getMapLinks(location) {
  const coordinates = hasCoordinates(location)
    ? `${location.latitude},${location.longitude}`
    : ''
  const query = coordinates || location.address || ''

  return {
    openStreetMap: coordinates
      ? `https://www.openstreetmap.org/?mlat=${encodeURIComponent(location.latitude)}&mlon=${encodeURIComponent(location.longitude)}#map=18/${encodeURIComponent(location.latitude)}/${encodeURIComponent(location.longitude)}`
      : `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`,
    googleMaps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
    streetView: coordinates
      ? `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${encodeURIComponent(coordinates)}`
      : '',
  }
}
