import { useState, useMemo, useEffect } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  Filter,
  MapPin,
  Maximize2,
  Phone,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { normalizeVisitStatus } from '../services/jadwalKunjungan'

// Default center to Bank BRI KCP Iskandar Palembang area
const PALEMBANG_CENTER = [-2.9761, 104.7754]

/**
 * Validates if coordinates are numerical and within reasonable geographic bounds
 */
function isValidCoordinate(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || isNaN(Number(lat))) return false
  if (lng === null || lng === undefined || lng === '' || isNaN(Number(lng))) return false
  const numLat = Number(lat)
  const numLng = Number(lng)
  return numLat >= -90 && numLat <= 90 && numLng >= -180 && numLng <= 180 && (numLat !== 0 || numLng !== 0)
}

/**
 * Helper component to fit map bounds to current markers and invalidate size
 */
function MapViewportController({ markers = [], resetTrigger = 0 }) {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    const timer = setTimeout(() => {
      map.invalidateSize()

      if (!markers || markers.length === 0) {
        map.setView(PALEMBANG_CENTER, 13)
        return
      }

      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], 15)
        return
      }

      const validLatLngs = markers.map((m) => [m.lat, m.lng])
      const bounds = L.latLngBounds(validLatLngs)
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 16,
          animate: true,
        })
      }
    }, 150)

    return () => clearTimeout(timer)
  }, [map, markers, resetTrigger])

  return null
}

function CustomerDistributionMap({
  customers = [],
  appointments = [],
  isAdmin = false,
  onNavigate,
  height = '480px',
  className = '',
}) {
  const [selectedStatusKunjungan, setSelectedStatusKunjungan] = useState('Semua')
  const [selectedWilayah, setSelectedWilayah] = useState('Semua')
  const [selectedRmId, setSelectedRmId] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [resetCount, setResetCount] = useState(0)
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  // Map customer ID to latest appointment info for quick status resolution
  const customerAppointmentMap = useMemo(() => {
    const map = new Map()
    for (const apt of appointments) {
      const cId = String(apt.customerId)
      const existing = map.get(cId)
      const aptKey = `${apt.date || ''} ${apt.time || ''}`
      const existingKey = existing ? `${existing.date || ''} ${existing.time || ''}` : ''
      if (!existing || aptKey >= existingKey) {
        map.set(cId, apt)
      }
    }
    return map
  }, [appointments])

  // Extract distinct wilayah/kota options from address field
  const wilayahOptions = useMemo(() => {
    const set = new Set()
    for (const c of customers) {
      if (!c.address) continue
      const parts = c.address.split(',')
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1].trim()
        if (lastPart.length > 2) set.add(lastPart)
      }
    }
    return Array.from(set).sort()
  }, [customers])

  // Extract distinct RM list from appointments/customers (for Admin filter)
  const rmOptions = useMemo(() => {
    if (!isAdmin) return []
    const map = new Map()
    for (const apt of appointments) {
      if (apt.rmId && !map.has(apt.rmId)) {
        map.set(apt.rmId, apt.rmName || `RM #${apt.rmId.slice(0, 6)}`)
      }
    }
    for (const c of customers) {
      const rmId = c.latestVisitRmId || c.createdByRmId
      if (rmId && !map.has(rmId)) {
        map.set(rmId, `RM #${String(rmId).slice(0, 6)}`)
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [appointments, customers, isAdmin])

  // Prepare all valid markers
  const allValidMarkers = useMemo(() => {
    return customers
      .filter((c) => isValidCoordinate(c.latitude, c.longitude))
      .map((c) => {
        const lat = Number(c.latitude)
        const lng = Number(c.longitude)
        const apt = customerAppointmentMap.get(String(c.id))

        // Sumber Status Monitoring Terpusat (dari public.nasabahs):
        // Seluruh role (Admin, RMFT, RMSME) membaca status yang sama dari kolom monitoring nasabah
        const monitoringStatus = c.latestVisitStatus || c.latest_visit_status
        let visitStatus = 'Belum Ada Jadwal'
        if (monitoringStatus && String(monitoringStatus).trim().toLowerCase() !== 'belum ada jadwal') {
          visitStatus = normalizeVisitStatus(monitoringStatus)
        } else if (monitoringStatus && String(monitoringStatus).trim().toLowerCase() === 'belum ada jadwal') {
          visitStatus = 'Belum Ada Jadwal'
        } else if (apt) {
          // Fallback lokal jika data nasabah belum memiliki kolom monitoring (misal data mock/test)
          visitStatus = normalizeVisitStatus(apt.status)
        }

        const rmId = c.latestVisitRmId || c.latest_visit_rm_id || apt?.rmId || c.createdByRmId || null
        const lastVisitDate = c.latestVisitDate || c.latest_visit_date || apt?.date || null
        const rmName = apt?.rmName || (rmId ? `RM #${String(rmId).slice(0, 6)}` : 'Admin / Belum Ditugaskan')

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          picName: c.picName || '',
          loanStatus: c.loanStatus || 'Belum ada pinjaman',
          noRekening: c.noRekening || '',
          lat,
          lng,
          visitStatus,
          rmId,
          rmName,
          lastVisitDate,
          latestVisitRmId: c.latestVisitRmId || c.latest_visit_rm_id || null,
          latestStatusChangedBy: c.latestStatusChangedBy || c.latest_status_changed_by || null,
          latestStatusUpdatedAt: c.latestStatusUpdatedAt || c.latest_status_updated_at || null,
        }
      })
  }, [customers, customerAppointmentMap])

  // Filter markers according to user selections
  const filteredMarkers = useMemo(() => {
    return allValidMarkers.filter((m) => {
      // Filter status kunjungan
      if (selectedStatusKunjungan !== 'Semua') {
        const markerStatus = normalizeVisitStatus(m.visitStatus)
        const filterStatus = normalizeVisitStatus(selectedStatusKunjungan)
        if (markerStatus !== filterStatus && m.visitStatus !== selectedStatusKunjungan) return false
      }

      // Filter wilayah
      if (selectedWilayah !== 'Semua') {
        if (!m.address || !m.address.toLowerCase().includes(selectedWilayah.toLowerCase())) return false
      }

      // Filter RM (Admin only)
      if (isAdmin && selectedRmId !== 'Semua') {
        if (m.rmId !== selectedRmId) return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = m.name.toLowerCase().includes(q)
        const matchAddr = (m.address || '').toLowerCase().includes(q)
        const matchPhone = (m.phone || '').includes(q)
        if (!matchName && !matchAddr && !matchPhone) return false
      }

      return true
    })
  }, [allValidMarkers, selectedStatusKunjungan, selectedWilayah, selectedRmId, searchQuery, isAdmin])

  const handleResetFilters = () => {
    setSelectedStatusKunjungan('Semua')
    setSelectedWilayah('Semua')
    setSelectedRmId('Semua')
    setSearchQuery('')
    setResetCount((prev) => prev + 1)
  }

  const hasActiveFilters =
    selectedStatusKunjungan !== 'Semua' ||
    selectedWilayah !== 'Semua' ||
    (isAdmin && selectedRmId !== 'Semua') ||
    Boolean(searchQuery.trim())

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (selectedStatusKunjungan !== 'Semua') count += 1
    if (selectedWilayah !== 'Semua') count += 1
    if (isAdmin && selectedRmId !== 'Semua') count += 1
    if (searchQuery.trim()) count += 1
    return count
  }, [selectedStatusKunjungan, selectedWilayah, selectedRmId, searchQuery, isAdmin])

  // Determine marker color based on visit status
  const getMarkerStyle = (marker) => {
    const s = String(marker?.visitStatus || '').trim().toLowerCase()
    if (s === 'selesai') {
      return { fillColor: '#10b981', color: '#ffffff', label: 'Sudah Dikunjungi' }
    }
    if (s === 'execute') {
      return { fillColor: '#00529b', color: '#ffffff', label: 'Tahap Administrasi' }
    }
    if (s === 'reschedule') {
      return { fillColor: '#f59e0b', color: '#ffffff', label: 'Reschedule' }
    }
    if (s === 'tidak_ditemui' || s === 'tidak ditemui') {
      return { fillColor: '#ef4444', color: '#ffffff', label: 'Tidak Ditemui' }
    }
    return { fillColor: '#64748b', color: '#ffffff', label: 'Nasabah' }
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 sm:px-5 sm:py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#00529b]/10 text-[#00529b]">
              <Compass size={20} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Peta Sebaran Lokasi Nasabah
                </h3>
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#00529b] border border-blue-200">
                  {filteredMarkers.length} dari {allValidMarkers.length} Titik GPS
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Sebaran titik lokasi nasabah pada peta operasional
              </p>
            </div>
          </div>

          {/* Action / Reset Button */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Mobile / Tablet Filter Toggle Button (hidden on desktop lg+) */}
            <button
              type="button"
              onClick={() => setIsMobileFilterOpen((prev) => !prev)}
              aria-expanded={isMobileFilterOpen}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition shadow-2xs lg:hidden ${
                isMobileFilterOpen || activeFilterCount > 0
                  ? 'border-[#00529b] bg-[#eaf3fb] text-[#00529b]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Filter size={13} className={activeFilterCount > 0 ? 'text-[#00529b]' : 'text-slate-500'} />
              <span>Filter Peta</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex size-4.5 items-center justify-center rounded-full bg-[#00529b] text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
              {isMobileFilterOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                title="Tampilkan kembali seluruh marker"
              >
                <RefreshCw size={12} className="text-[#00529b]" />
                <span>Reset Filter</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setResetCount((c) => c + 1)}
              className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition shadow-2xs"
              title="Pusatkan kembali peta ke seluruh marker"
            >
              <Maximize2 size={12} />
              <span className="hidden sm:inline">Pusatkan Peta</span>
            </button>
          </div>
        </div>

        {/* Active Filter Indicator Strip on Mobile/Tablet (when filter collapsed) */}
        {!isMobileFilterOpen && activeFilterCount > 0 && (
          <div className="mt-2.5 flex items-center justify-between rounded-lg border border-blue-100 bg-[#eaf3fb]/80 px-2.5 py-1.5 text-[11px] text-[#00529b] lg:hidden">
            <span className="flex items-center gap-1.5 font-medium">
              <Filter size={11} />
              <span>{activeFilterCount} filter aktif diterapkan</span>
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="font-bold underline hover:text-[#003d74]"
            >
              Reset
            </button>
          </div>
        )}

        {/* Filter Controls Row */}
        <div className={`mt-3.5 ${isMobileFilterOpen ? 'grid' : 'hidden lg:grid'} grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5`}>
          {/* Search */}
          <div className="relative col-span-1 min-[400px]:col-span-2 sm:col-span-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-2.5 text-xs text-slate-800 focus:border-[#00529b] focus:outline-none"
            />
          </div>

          {/* Status Kunjungan */}
          <div>
            <select
              value={selectedStatusKunjungan}
              onChange={(e) => setSelectedStatusKunjungan(e.target.value)}
              className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:border-[#00529b] focus:outline-none"
            >
              <option value="Semua">Semua Status Kunjungan</option>
              <option value="Execute">Execute (Tahap Administrasi)</option>
              <option value="Selesai">Selesai (Sudah Dikunjungi)</option>
              <option value="Terjadwal">Terjadwal (Menunggu)</option>
              <option value="Reschedule">Reschedule</option>
              <option value="Tidak ditemui">Tidak Ditemui</option>
              <option value="Belum Ada Jadwal">Belum Ada Jadwal</option>
            </select>
          </div>

          {/* Wilayah */}
          <div>
            <select
              value={selectedWilayah}
              onChange={(e) => setSelectedWilayah(e.target.value)}
              className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs text-slate-700 focus:border-[#00529b] focus:outline-none"
            >
              <option value="Semua">Semua Wilayah</option>
              {wilayahOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Filter RM (Admin only) */}
          {isAdmin ? (
            <div>
              <select
                value={selectedRmId}
                onChange={(e) => setSelectedRmId(e.target.value)}
                className="w-full min-h-[38px] rounded-lg border border-slate-200 bg-white py-1.5 px-2.5 text-xs font-semibold text-[#00529b] focus:border-[#00529b] focus:outline-none"
              >
                <option value="Semua">Semua Petugas RM</option>
                {rmOptions.map((rm) => (
                  <option key={rm.id} value={rm.id}>
                    {rm.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex min-h-[38px] items-center px-3 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-lg">
              <span className="truncate">👤 Nasabah Kelolaan Saya</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full" style={{ height: `clamp(320px, 52vh, ${height})` }}>
        {allValidMarkers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center bg-slate-50">
            <MapPin size={32} className="text-slate-300 mb-2" />
            <p className="text-xs font-bold text-slate-700">Belum Ada Titik Koordinat Nasabah</p>
            <p className="text-[11px] text-slate-500 max-w-sm mt-1">
              Nasabah belum memiliki data koordinat latitude dan longitude. Atur titik lokasi pada form edit data nasabah.
            </p>
          </div>
        ) : filteredMarkers.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center bg-slate-50">
            <X size={28} className="text-amber-500 mb-2" />
            <p className="text-xs font-bold text-slate-800">Tidak Ada Marker yang Sesuai Filter</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Tidak ada lokasi nasabah yang cocok dengan kombinasi filter saat ini.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-3 rounded-lg bg-[#00529b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#003d74] transition"
            >
              Reset Filter
            </button>
          </div>
        ) : (
          <MapContainer
            center={PALEMBANG_CENTER}
            zoom={13}
            scrollWheelZoom
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <MapViewportController markers={filteredMarkers} resetTrigger={resetCount + (isMobileFilterOpen ? 1 : 0)} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {filteredMarkers.map((marker) => {
              const style = getMarkerStyle(marker)

              return (
                <CircleMarker
                  key={marker.id}
                  center={[marker.lat, marker.lng]}
                  radius={8}
                  pathOptions={{
                    fillColor: style.fillColor,
                    color: style.color,
                    weight: 2.5,
                    fillOpacity: 0.9,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                    <span className="text-xs font-bold">{marker.name}</span>
                    <span className="block text-[10px] text-slate-500">
                      {marker.visitStatus}
                    </span>
                  </Tooltip>

                  <Popup minWidth={240} maxWidth={280}>
                    <div className="p-1 space-y-2 text-xs">
                      {/* Name & Badge */}
                      <div className="border-b border-slate-100 pb-1.5">
                        <h4 className="font-bold text-slate-900 text-sm truncate">{marker.name}</h4>
                        {marker.picName && <p className="mt-0.5 text-[11px] text-slate-500">PIC: {marker.picName}</p>}
                        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone size={11} /> {marker.phone || '-'}
                        </p>
                      </div>

                      {/* Address */}
                      <div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Alamat</p>
                        <p className="text-[11px] text-slate-700 leading-relaxed mt-0.5">
                          {marker.address || 'Alamat belum diisi'}
                        </p>
                      </div>

                      {/* Status Kunjungan */}
                      <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-50 p-2 text-[10px]">
                        <div>
                          <span className="text-slate-400 block">Status Kunjungan</span>
                          <span className="font-semibold text-slate-800 block truncate">{marker.visitStatus}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Pinjaman</span>
                          <span className="font-semibold text-slate-800 block truncate">{marker.loanStatus}</span>
                        </div>
                        {marker.lastVisitDate && (
                          <div>
                            <span className="text-slate-400 block">Tgl Kunjungan</span>
                            <span className="font-semibold text-slate-800 block truncate">{marker.lastVisitDate}</span>
                          </div>
                        )}
                        {marker.visitStatus !== 'Belum Ada Jadwal' && (
                          <div>
                            <span className="text-slate-400 block">Petugas RM</span>
                            <span className="font-semibold text-slate-800 block truncate" title={marker.rmName}>
                              {marker.rmName}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigate?.('customers')}
                          className="flex-1 min-h-[38px] rounded-lg bg-[#00529b] py-2 text-center text-xs font-semibold text-white hover:bg-[#003d74] transition"
                        >
                          Detail Nasabah
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          title="Buka rute di Google Maps"
                        >
                          <ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}
      </div>

      {/* Map Legend & Summary Footer */}
      <div className="border-t border-slate-100 bg-[#f8fafc] px-5 py-2.5 text-xs text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <span className="font-semibold text-slate-700">Legenda Pin:</span>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#64748b] ring-1 ring-white" />
              <span>Nasabah</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#10b981] ring-1 ring-white" />
              <span>Selesai</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#00529b] ring-1 ring-white" />
              <span>Execute (Administrasi)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f59e0b] ring-1 ring-white" />
              <span>Reschedule</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ef4444] ring-1 ring-white" />
              <span>Tidak Ditemui</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            Klik penanda untuk melihat ringkasan profil nasabah.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CustomerDistributionMap
