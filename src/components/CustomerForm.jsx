import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { ExternalLink, LoaderCircle, MapPin } from 'lucide-react'
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
  const [mapProvider, setMapProvider] = useState('google')
  const [addressLookup, setAddressLookup] = useState('')
  const addressRef = useRef(form.address)
  const resolvedAddressRef = useRef(customer?.address || '')
  const resolvedProviderRef = useRef(customer?.address ? 'existing' : '')
  const lookupController = useRef(null)
  const update = (event) => {
    const { name, value } = event.target
    if (name === 'address') addressRef.current = value
    setForm((current) => ({
      ...current,
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

  useEffect(() => () => lookupController.current?.abort(), [])

  const startAddressLookup = () => {
    lookupController.current?.abort()
    const controller = new AbortController()
    lookupController.current = controller
    return controller
  }

  const findPositionFromAddress = async (address) => {
    const query = address.trim()
    if (!query || (resolvedAddressRef.current === query && mapPosition && resolvedProviderRef.current === mapProvider)) return

    const controller = startAddressLookup()
    setAddressLookup('Mencari titik dan alamat di peta...')
    try {
      const result = mapProvider === 'google'
        ? await searchGoogleAddress(query)
        : await searchAddress(query, { signal: controller.signal })
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
      resolvedProviderRef.current = mapProvider
      setAddressLookup('Lokasi ditemukan. Periksa kembali pin dan alamat lengkapnya.')
    } catch (lookupError) {
      if (controller.signal.aborted) return
      if (lookupError.name === 'AbortError') return
      console.error('Gagal mencari lokasi berdasarkan alamat.', lookupError)
      setAddressLookup(lookupError instanceof Error ? lookupError.message : 'Lokasi alamat gagal dicari.')
    }
  }

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
      const address = mapProvider === 'google'
        ? await reverseGoogleGeocode(latitude, longitude)
        : await reverseGeocode(latitude, longitude, { signal: controller.signal })
      if (controller.signal.aborted) return
      if (!address) {
        setAddressLookup('Pin tersimpan, tetapi alamat lengkap tidak ditemukan untuk titik ini.')
        return
      }
      setForm((current) => ({ ...current, address }))
      addressRef.current = address
      resolvedAddressRef.current = address
      resolvedProviderRef.current = mapProvider
      setAddressLookup('Alamat lengkap diperbarui dari peta.')
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
          <textarea name="address" value={form.address} onChange={update} onBlur={(event) => findPositionFromAddress(event.currentTarget.value)} required maxLength={500} rows={2} placeholder="Ketik alamat lengkap; lokasi akan dicari saat kolom ditinggalkan" className="form-control resize-y" />
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
          <p className="mb-3 mt-2 text-[10px] leading-4 text-slate-500">Pencarian alamat memakai {mapProvider === 'google' ? 'Google Maps' : 'OpenStreetMap'} dan dijalankan saat Anda meninggalkan kolom. Klik titik peta untuk mengisi alamat dan koordinat.</p>
          <button type="button" onClick={() => setIsMapOpen(true)} className="button-secondary mb-3 w-full"><MapPin size={14} />Pilih titik di peta</button>
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
        <Modal title="Pilih titik lokasi nasabah" description="Klik peta untuk menyimpan koordinat dan membaca alamat lengkap dari lokasi tersebut." onClose={() => setIsMapOpen(false)} wide>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMapProvider('google')} aria-pressed={mapProvider === 'google'} className={`button-secondary ${mapProvider === 'google' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}>Google Maps</button>
              <button type="button" onClick={() => setMapProvider('openstreetmap')} aria-pressed={mapProvider === 'openstreetmap'} className={`button-secondary ${mapProvider === 'openstreetmap' ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : ''}`}>OpenStreetMap</button>
            </div>
            <Suspense fallback={<div className="flex h-[360px] items-center justify-center text-xs text-slate-500"><LoaderCircle className="mr-2 size-4 animate-spin" />Memuat peta...</div>}>
              {mapProvider === 'google'
                ? <GoogleMapLocation position={mapPosition} onPick={selectMapPosition} />
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
