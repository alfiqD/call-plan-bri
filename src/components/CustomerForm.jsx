import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, MapPin, Search } from 'lucide-react'
import { createId } from '../data/workspace'
import { reverseGeocode, searchAddress } from '../services/geocoding'
import { hasGoogleMapsApiKey, reverseGoogleGeocode, searchGoogleAddress } from '../services/googleMaps'
import { getMapLinks } from '../services/mapLinks'
import Modal from './Modal'

const LocationMap = lazy(() => import('./LocationMap'))
const GoogleMapLocation = lazy(() => import('./GoogleMapLocation'))

const emptyCustomer = {
  name: '',
  phone: '',
  noRekening: '',
  address: '',
  type: 'Prospek',
  loanStatus: 'Belum ada pinjaman',
  latitude: '',
  longitude: '',
}

function CustomerForm({ customer, onClose, onSubmit }) {
  const [form, setForm] = useState(() => ({ ...emptyCustomer, ...customer, noRekening: customer?.noRekening || '' }))
  const [error, setError] = useState('')
  const [isMapOpen, setIsMapOpen] = useState(false)
  const [mapProvider, setMapProvider] = useState('openstreetmap')
  const [addressLookup, setAddressLookup] = useState('')
  const [googleMapNotice, setGoogleMapNotice] = useState('')
  const [mapSearchQuery, setMapSearchQuery] = useState(form.address)
  const [mapSearchStatus, setMapSearchStatus] = useState('')
  const addressRef = useRef(form.address)
  const resolvedAddressRef = useRef(customer?.address || '')
  const resolvedProviderRef = useRef(customer?.address ? mapProvider : '')
  const lookupController = useRef(null)
  const update = (event) => {
    const { name, value } = event.target
    if (name === 'address') addressRef.current = value
    setForm((current) => ({
      ...current,
      ...(name === 'address' && value !== current.address ? { latitude: '', longitude: '' } : {}),
      [name]: name === 'noRekening' ? value.replace(/\D/g, '') : value,
    }))
  }
  const mapPosition = form.latitude && form.longitude
    ? { lat: Number(form.latitude), lng: Number(form.longitude) }
    : null
  const mapLinks = getMapLinks({
    address: form.address,
    latitude: form.latitude,
    longitude: form.longitude,
  })
  const handleGoogleMapError = useCallback((mapError) => {
    setMapProvider('openstreetmap')
    const message = mapError instanceof Error
      ? mapError.message
      : 'Google Maps tidak dapat dimuat. Periksa API key dan pengaturan Google Cloud.'
    setGoogleMapNotice(`${message} Peta di formulir tetap menggunakan OpenStreetMap.`)
  }, [])

  useEffect(() => () => lookupController.current?.abort(), [])

  const startAddressLookup = () => {
    lookupController.current?.abort()
    const controller = new AbortController()
    lookupController.current = controller
    return controller
  }

  const findPositionFromAddress = useCallback(async (address) => {
    const query = address.trim()
    const hasCoordinates = Boolean(form.latitude && form.longitude)
    if (query.length < 5 || (resolvedAddressRef.current === query && hasCoordinates && resolvedProviderRef.current === mapProvider)) return

    const controller = startAddressLookup()
    setAddressLookup('Mencari titik dan alamat di peta...')
    let providerUsed = mapProvider
    try {
      let result
      if (mapProvider === 'google') {
        try {
          result = await searchGoogleAddress(query)
        } catch (googleError) {
          if (controller.signal.aborted) return
          console.error('Pencarian Google Maps gagal; mencoba OpenStreetMap.', googleError)
          providerUsed = 'openstreetmap'
          setAddressLookup('Google Maps tidak tersedia. Mencoba mencari alamat melalui OpenStreetMap...')
          result = await searchAddress(query, { signal: controller.signal })
        }
      } else {
        result = await searchAddress(query, { signal: controller.signal })
      }
      if (controller.signal.aborted) return
      if (!result && providerUsed === 'google') {
        providerUsed = 'openstreetmap'
        setAddressLookup('Alamat tidak ditemukan di Google Maps. Mencoba OpenStreetMap...')
        result = await searchAddress(query, { signal: controller.signal })
      }
      if (controller.signal.aborted) return
      if (addressRef.current !== address) return
      if (!result) {
        setAddressLookup('Alamat tidak ditemukan. Periksa alamat atau pilih titik secara manual di peta.')
        return
      }
      setForm((current) => ({
        ...current,
        address: result.address,
        latitude: result.latitude.toFixed(7),
        longitude: result.longitude.toFixed(7),
      }))
      addressRef.current = result.address
      resolvedAddressRef.current = result.address
      resolvedProviderRef.current = providerUsed
      if (providerUsed !== mapProvider) setMapProvider(providerUsed)
      setAddressLookup(providerUsed === 'google'
        ? 'Lokasi ditemukan. Periksa kembali pin dan alamat lengkapnya.'
        : mapProvider === 'google'
          ? 'Lokasi ditemukan melalui OpenStreetMap. Periksa kembali pin dan alamatnya.'
          : 'Lokasi ditemukan. Periksa kembali pin dan alamat lengkapnya.')
    } catch (lookupError) {
      if (controller.signal.aborted) return
      if (lookupError.name === 'AbortError') return
      console.error('Gagal mencari lokasi berdasarkan alamat.', lookupError)
      setAddressLookup(lookupError instanceof Error ? lookupError.message : 'Lokasi alamat gagal dicari.')
    }
  }, [form.latitude, form.longitude, mapProvider])

  const searchMapLocation = async () => {
    const query = mapSearchQuery.trim()
    if (query.length < 3) {
      setMapSearchStatus('Masukkan alamat atau nama tempat (minimal 3 karakter).')
      return
    }

    const controller = startAddressLookup()
    setMapSearchStatus('Mencari lokasi...')
    let providerUsed = mapProvider
    try {
      let result
      if (mapProvider === 'google') {
        try {
          result = await searchGoogleAddress(query)
        } catch (googleError) {
          if (controller.signal.aborted) return
          console.error('Pencarian lokasi Google Maps gagal; mencoba OpenStreetMap.', googleError)
          providerUsed = 'openstreetmap'
          setMapSearchStatus('Google Maps tidak tersedia. Mencoba OpenStreetMap...')
          result = await searchAddress(query, { signal: controller.signal })
        }
      } else {
        result = await searchAddress(query, { signal: controller.signal })
      }

      if (controller.signal.aborted) return
      if (!result && providerUsed === 'google') {
        providerUsed = 'openstreetmap'
        setMapSearchStatus('Lokasi tidak ditemukan di Google Maps. Mencoba OpenStreetMap...')
        result = await searchAddress(query, { signal: controller.signal })
      }
      if (controller.signal.aborted) return
      if (!result) {
        setMapSearchStatus('Lokasi tidak ditemukan. Coba kata kunci atau alamat yang lebih lengkap.')
        return
      }

      const latitude = Number(result.latitude).toFixed(7)
      const longitude = Number(result.longitude).toFixed(7)
      setForm((current) => ({ ...current, address: result.address, latitude, longitude }))
      addressRef.current = result.address
      resolvedAddressRef.current = result.address
      resolvedProviderRef.current = providerUsed
      setMapSearchQuery(result.address)
      if (providerUsed !== mapProvider) {
        setMapProvider(providerUsed)
        setGoogleMapNotice('Pencarian Google Maps gagal. Lokasi ditemukan melalui OpenStreetMap.')
      }
      setMapSearchStatus('Lokasi ditemukan. Pin telah dipindahkan ke hasil pencarian.')
    } catch (lookupError) {
      if (controller.signal.aborted || lookupError.name === 'AbortError') return
      console.error('Gagal mencari lokasi pada pemilih titik.', lookupError)
      setMapSearchStatus(lookupError instanceof Error ? lookupError.message : 'Lokasi gagal dicari. Coba lagi.')
    }
  }

  useEffect(() => {
    if (form.address.trim().length < 5) return undefined

    const timeout = window.setTimeout(() => {
      void findPositionFromAddress(form.address)
    }, 900)

    return () => window.clearTimeout(timeout)
  }, [findPositionFromAddress, form.address])

  const selectMapPosition = async ({ lat, lng }) => {
    const latitude = lat.toFixed(7)
    const longitude = lng.toFixed(7)
    setForm((current) => ({
      ...current,
      latitude,
      longitude,
    }))
    const controller = startAddressLookup()
    setAddressLookup('Membaca alamat lengkap dari titik peta...')
    try {
      let address
      let providerUsed = mapProvider
      if (mapProvider === 'google') {
        try {
          address = await reverseGoogleGeocode(latitude, longitude)
        } catch (googleError) {
          if (controller.signal.aborted) return
          console.error('Reverse geocoding Google Maps gagal; mencoba OpenStreetMap.', googleError)
          providerUsed = 'openstreetmap'
          setAddressLookup('Google Maps tidak tersedia. Membaca alamat melalui OpenStreetMap...')
          address = await reverseGeocode(latitude, longitude, { signal: controller.signal })
        }
      } else {
        address = await reverseGeocode(latitude, longitude, { signal: controller.signal })
      }
      if (controller.signal.aborted) return
      if (!address) {
        setAddressLookup('Pin tersimpan, tetapi alamat lengkap tidak ditemukan untuk titik ini.')
        return
      }
      setForm((current) => ({ ...current, address }))
      addressRef.current = address
      resolvedAddressRef.current = address
      resolvedProviderRef.current = providerUsed
      if (providerUsed !== mapProvider) setMapProvider(providerUsed)
      setAddressLookup(providerUsed === 'google'
        ? 'Alamat lengkap diperbarui dari Google Maps.'
        : mapProvider === 'google'
          ? 'Alamat lengkap diperbarui dari OpenStreetMap.'
          : 'Alamat lengkap diperbarui dari peta.')
    } catch (lookupError) {
      if (controller.signal.aborted) return
      if (lookupError.name === 'AbortError') return
      console.error('Gagal membaca alamat dari titik peta.', lookupError)
      setAddressLookup(lookupError instanceof Error
        ? `Pin tersimpan, tetapi alamat otomatis gagal dibaca: ${lookupError.message}`
        : 'Pin tersimpan, tetapi alamat otomatis gagal dibaca. Isi alamat secara manual.')
    }
  }

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    if (Boolean(form.latitude) !== Boolean(form.longitude)) {
      setError('Latitude dan longitude harus diisi berpasangan.')
      return
    }

    try {
      await onSubmit({ ...form, id: customer?.id || createId('nasabah') })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Data nasabah gagal disimpan.')
    }
  }

  return (
    <Modal title={customer ? 'Ubah data nasabah' : 'Tambah nasabah'} description="Simpan informasi kontak yang dibutuhkan untuk perencanaan kunjungan." onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <label className="form-label">Nama lengkap
          <input name="name" value={form.name} onChange={update} required maxLength={100} placeholder="Nama nasabah" className="form-control" />
        </label>
        <label className="form-label">Nomor telepon
          <input name="phone" value={form.phone} onChange={update} required maxLength={24} placeholder="08xx-xxxx-xxxx" className="form-control" />
        </label>
        <label className="form-label">Nomor rekening
          <input name="noRekening" value={form.noRekening} onChange={update} maxLength={50} inputMode="numeric" pattern="[0-9]*" placeholder="Opsional — angka rekening nasabah" className="form-control" />
        </label>
        <label className="form-label">Alamat kunjungan
          <textarea name="address" value={form.address} onChange={update} required maxLength={500} rows={2} placeholder="Ketik alamat di Indonesia; titik peta dicari otomatis" className="form-control resize-y" />
        </label>
        <label className="form-label">Sumber pencarian alamat
          <select value={mapProvider} onChange={(event) => setMapProvider(event.target.value)} className="form-control">
            <option value="google">Google Maps {hasGoogleMapsApiKey() ? '' : '(perlu API key)'}</option>
            <option value="openstreetmap">OpenStreetMap (gratis)</option>
          </select>
        </label>
        {addressLookup && <p className="text-[10px] leading-4 text-slate-500" role="status">{addressLookup}</p>}
        <details open={Boolean(form.latitude || form.longitude)} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <summary className="cursor-pointer text-[11px] font-semibold text-slate-700">Titik peta <span className="font-normal text-slate-400">(diperlukan untuk rute dan validasi check-in GPS)</span></summary>
          <p className="mb-3 mt-2 text-[10px] leading-4 text-slate-500">Titik dicari otomatis saat Anda mengetik alamat. Pilih lokasi yang paling sesuai di peta agar pin tepat di rumah atau tempat usaha nasabah.</p>
          {mapPosition && !isMapOpen && (
            <div className="mb-3 space-y-2">
              <p className="text-[10px] font-medium text-emerald-700">Titik ditemukan: {form.latitude}, {form.longitude}</p>
              <Suspense fallback={<div className="flex h-[200px] items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Memuat peta...</div>}>
                {mapProvider === 'google'
                  ? <GoogleMapLocation
                    position={mapPosition}
                    onPick={selectMapPosition}
                    onMapError={handleGoogleMapError}
                    height="200px"
                  />
                  : <LocationMap position={mapPosition} onPick={selectMapPosition} height="200px" />}
              </Suspense>
            </div>
          )}
          <button type="button" onClick={() => { setMapSearchQuery(form.address); setMapSearchStatus(''); setIsMapOpen(true) }} className="button-secondary mb-3 w-full"><MapPin size={14} />Pilih titik di peta</button>
          {mapPosition && <p className="mb-3 text-[10px] text-emerald-700">Pin tersimpan: {form.latitude}, {form.longitude}</p>}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="form-label">Latitude
              <input type="number" name="latitude" value={form.latitude} onChange={update} min="-90" max="90" step="any" placeholder="-2.9761" className="form-control" />
            </label>
            <label className="form-label">Longitude
              <input type="number" name="longitude" value={form.longitude} onChange={update} min="-180" max="180" step="any" placeholder="104.7754" className="form-control" />
            </label>
          </div>
        </details>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="form-label">Kategori
            <select name="type" value={form.type} onChange={update} className="form-control">
              <option>Prospek</option>
              <option>Debitur</option>
            </select>
          </label>
          <label className="form-label">Status pinjaman
            <select name="loanStatus" value={form.loanStatus} onChange={update} className="form-control">
              <option>Belum ada pinjaman</option>
              <option>Dalam pengajuan</option>
              <option>Aktif</option>
              <option>Perlu tindak lanjut</option>
              <option>Lunas</option>
            </select>
          </label>
        </div>
        {error && <p className="text-xs text-rose-600" role="alert">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={onClose} className="button-secondary">Batal</button>
          <button type="submit" className="button-primary">{customer ? 'Simpan perubahan' : 'Tambah nasabah'}</button>
        </div>
      </form>
      {isMapOpen && (
        <Modal title="Pilih titik lokasi nasabah" description="Klik peta untuk menyimpan koordinat dan membaca alamat lengkap dari lokasi tersebut." onClose={() => setIsMapOpen(false)} wide portal>
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="search"
                value={mapSearchQuery}
                onChange={(event) => setMapSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void searchMapLocation()
                  }
                }}
                maxLength={500}
                placeholder="Cari alamat atau tempat di Indonesia..."
                aria-label="Cari lokasi pada peta"
                className="form-control min-w-0 flex-1"
              />
              <button type="button" onClick={() => void searchMapLocation()} className="button-primary shrink-0">
                <Search size={14} />Cari lokasi
              </button>
            </div>
            {mapSearchStatus && <p className="text-xs leading-5 text-slate-600" role="status">{mapSearchStatus}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => { setGoogleMapNotice(''); setMapProvider('google') }} aria-pressed={mapProvider === 'google'} className={`button-secondary ${mapProvider === 'google' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}>Google Maps</button>
              <button type="button" onClick={() => setMapProvider('openstreetmap')} aria-pressed={mapProvider === 'openstreetmap'} className={`button-secondary ${mapProvider === 'openstreetmap' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}>OpenStreetMap</button>
            </div>
            {googleMapNotice && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900" role="alert">
                <p>{googleMapNotice}</p>
                <a href={mapLinks.googleMaps} target="_blank" rel="noopener noreferrer" className="button-secondary shrink-0">
                  <ExternalLink size={14} />Buka Google Maps
                </a>
              </div>
            )}
            <Suspense fallback={<div className="flex h-[360px] items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Memuat peta...</div>}>
              {mapProvider === 'google'
                ? <GoogleMapLocation
                  position={mapPosition}
                  onPick={selectMapPosition}
                  onMapError={handleGoogleMapError}
                />
                : <LocationMap position={mapPosition} onPick={selectMapPosition} />}
            </Suspense>
            <p className="text-[10px] leading-4 text-slate-500">{mapPosition ? `Titik dipilih: ${form.latitude}, ${form.longitude}.` : 'Geser dan perbesar peta, lalu klik tepat pada lokasi nasabah.'} Klik pin untuk mengisi alamat lengkap dengan penyedia yang dipilih.</p>
            <div className="flex flex-wrap justify-between gap-2 border-t border-slate-100 pt-3">
              <div className="flex flex-wrap gap-2">
                <a href={mapLinks.openStreetMap} target="_blank" rel="noopener noreferrer" className="button-secondary"><ExternalLink size={14} />OpenStreetMap</a>
                <a href={mapLinks.googleMaps} target="_blank" rel="noopener noreferrer" className="button-secondary"><ExternalLink size={14} />Google Maps</a>
                {mapLinks.streetView && <a href={mapLinks.streetView} target="_blank" rel="noopener noreferrer" className="button-secondary"><ExternalLink size={14} />Street View</a>}
              </div>
              <button type="button" onClick={() => setIsMapOpen(false)} disabled={!mapPosition} className="button-primary disabled:cursor-not-allowed disabled:opacity-50">Gunakan titik ini</button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

export default CustomerForm
