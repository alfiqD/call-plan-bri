import { useState, useMemo, useEffect, useRef } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Compass,
  ExternalLink,
  Filter,
  Layers,
  MapPin,
  Maximize2,
  Phone,
  RefreshCw,
  Search,
  User,
  X,
} from 'lucide-react'

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
  const [selectedKategori, setSelectedKategori] = useState('Semua') // 'Semua', 'Debitur', 'Prospek'
  const [selectedStatusKunjungan, setSelectedStatusKunjungan] = useState('Semua')
  const [selectedWilayah, setSelectedWilayah] = useState('Semua')
  const [selectedRmId, setSelectedRmId] = useState('Semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [resetCount, setResetCount] = useState(0)

  // Map customer ID to latest appointment info for quick status resolution
  const customerAppointmentMap = useMemo(() => {
    const map = new Map()
    for (const apt of appointments) {
      const cId = String(apt.customerId)
      const existing = map.get(cId)
      if (!existing || apt.date >= existing.date) {
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
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }))
  }, [appointments, isAdmin])

  // Prepare all valid markers
  const allValidMarkers = useMemo(() => {
    return customers
      .filter((c) => isValidCoordinate(c.latitude, c.longitude))
      .map((c) => {
        const lat = Number(c.latitude)
        const lng = Number(c.longitude)
        const apt = customerAppointmentMap.get(String(c.id))
        const visitStatus = apt ? apt.status : 'Belum Ada Jadwal'
        const rmId = apt?.rmId || c.createdByRmId || null
        const rmName = apt?.rmName || 'RM'

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          address: c.address,
          type: c.type || 'Prospek',
          loanStatus: c.loanStatus || 'Belum ada pinjaman',
          noRekening: c.noRekening || '',
          lat,
          lng,
          visitStatus,
          rmId,
          rmName,
          lastVisitDate: apt?.date || null,
        }
      })
  }, [customers, customerAppointmentMap])

  // Filter markers according to user selections
  const filteredMarkers = useMemo(() => {
    return allValidMarkers.filter((m) => {
      // Filter kategori
      if (selectedKategori !== 'Semua' && m.type !== selectedKategori) return false

      // Filter status kunjungan
      if (selectedStatusKunjungan !== 'Semua') {
        if (m.visitStatus !== selectedStatusKunjungan) return false
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
  }, [allValidMarkers, selectedKategori, selectedStatusKunjungan, selectedWilayah, selectedRmId, searchQuery, isAdmin])

  const handleResetFilters = () => {
    setSelectedKategori('Semua')
    setSelectedStatusKunjungan('Semua')
    setSelectedWilayah('Semua')
    setSelectedRmId('Semua')
    setSearchQuery('')
    setResetCount((prev) => prev + 1)
  }

  const hasActiveFilters =
    selectedKategori !== 'Semua' ||
    selectedStatusKunjungan !== 'Semua' ||
    selectedWilayah !== 'Semua' ||
    (isAdmin && selectedRmId !== 'Semua') ||
    Boolean(searchQuery.trim())

  // Determine marker color based on category and visit status
  const getMarkerStyle = (marker) => {
    if (marker.visitStatus === 'Selesai') {
      return { fillColor: '#10b981', color: '#ffffff', label: 'Sudah Dikunjungi' }
    }
    if (marker.visitStatus === 'Reschedule') {
      return { fillColor: '#f59e0b', color: '#ffffff', label: 'Reschedule' }
    }
    if (marker.visitStatus === 'Tidak ditemui') {
      return { fillColor: '#ef4444', color: '#ffffff', label: 'Tidak Ditemui' }
    }
    if (marker.type === 'Debitur') {
      return { fillColor: '#00529b', color: '#ffffff', label: 'Debitur Aktif' }
    }
    return { fillColor: '#f37021', color: '#ffffff', label: 'Nasabah Prospek' }
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden ${className}`}>
      {/* Header Bar */}
      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
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
                Visualisasi titik geografis debitur &amp; prospek Bank BRI KCP Iskandar Palembang
              </p>
            </div>
          </div>

          {/* Action / Reset Button */}
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition shadow-2xs"
                title="Tampilkan kembali seluruh marker"
              >
                <RefreshCw size={12} className="text-[#00529b]" />
                <span>Reset Filter</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setResetCount((c) => c + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition shadow-2xs"
              title="Pusatkan kembali peta ke seluruh marker"
            >
              <Maximize2 size={12} />
              <span className="hidden sm:inline">Pusatkan Peta</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-3.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {/* Search */}
          <div className="relative col-span-2 sm:col-span-1">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama / alamat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-2.5 text-xs text-slate-800 focus:border-[#00529b] focus:outline-none"
            />
          </div>

          {/* Kategori Nasabah */}
          <div>
            <select
              value={selectedKategori}
              onChange={(e) => setSelectedKategori(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-[#00529b] focus:outline-none"
            >
              <option value="Semua">Semua Kategori</option>
              <option value="Debitur">Debitur</option>
              <option value="Prospek">Prospek</option>
            </select>
          </div>

          {/* Status Kunjungan */}
          <div>
            <select
              value={selectedStatusKunjungan}
              onChange={(e) => setSelectedStatusKunjungan(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-[#00529b] focus:outline-none"
            >
              <option value="Semua">Semua Status Kunjungan</option>
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
              className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs text-slate-700 focus:border-[#00529b] focus:outline-none"
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
                className="w-full rounded-lg border border-slate-200 bg-white py-1.5 px-2 text-xs font-semibold text-[#00529b] focus:border-[#00529b] focus:outline-none"
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
            <div className="flex items-center px-2 py-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-lg">
              <span className="truncate">👤 Nasabah Kelolaan Saya</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full" style={{ height }}>
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
            <MapViewportController markers={filteredMarkers} resetTrigger={resetCount} />
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
                      {marker.type} · {marker.visitStatus}
                    </span>
                  </Tooltip>

                  <Popup minWidth={240} maxWidth={280}>
                    <div className="p-1 space-y-2 text-xs">
                      {/* Name & Badge */}
                      <div className="border-b border-slate-100 pb-1.5">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-slate-900 text-sm truncate">{marker.name}</h4>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              marker.type === 'Debitur'
                                ? 'bg-blue-50 text-[#00529b]'
                                : 'bg-orange-50 text-[#f37021]'
                            }`}
                          >
                            {marker.type}
                          </span>
                        </div>
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
                      </div>

                      {/* Action Buttons */}
                      <div className="pt-1 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onNavigate?.('customers')}
                          className="flex-1 rounded-lg bg-[#00529b] py-1.5 text-center text-[11px] font-semibold text-white hover:bg-[#003d74] transition"
                        >
                          Detail Nasabah
                        </button>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition"
                          title="Buka rute di Google Maps"
                        >
                          <ExternalLink size={13} />
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
              <span className="size-2.5 rounded-full bg-[#00529b] ring-1 ring-white" />
              <span>Debitur</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f37021] ring-1 ring-white" />
              <span>Prospek</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-[#10b981] ring-1 ring-white" />
              <span>Selesai (Dikunjungi)</span>
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
          <p className="text-[10px] text-slate-400">
            Klik penanda untuk melihat profil nasabah dan membuka navigasi.
          </p>
        </div>
      </div>
    </div>
  )
}

export default CustomerDistributionMap
