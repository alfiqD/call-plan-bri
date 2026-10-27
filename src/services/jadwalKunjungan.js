const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '')

const appointmentStatusFromApi = {
  pending: 'Terjadwal',
  selesai: 'Selesai',
  reschedule: 'Reschedule',
  tidak_ditemui: 'Tidak ditemui',
}

const appointmentStatusToApi = {
  Terjadwal: 'pending',
  Selesai: 'selesai',
  Reschedule: 'reschedule',
  'Tidak ditemui': 'tidak_ditemui',
}

export function isApiConfigured() {
  return Boolean(API_BASE_URL)
}

export function validateAppointmentApiReady(appointment) {
  if (!API_BASE_URL) {
    throw new Error('API Laravel belum dikonfigurasi. Isi VITE_API_BASE_URL pada file .env.')
  }

  if (!/^\d+$/.test(String(appointment.id))) {
    throw new Error('Jadwal ini masih memakai ID data demo. Hubungkan jadwal dengan data dari API Laravel sebelum check-in.')
  }
}

function getApiUrl(path) {
  return `${API_BASE_URL}${path}`
}

async function requestJson(path, options = {}) {
  let response

  try {
    response = await fetch(getApiUrl(path), {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    })
  } catch (error) {
    console.error('Tidak dapat terhubung ke API Laravel.', error)
    throw new Error('Tidak dapat terhubung ke API Laravel. Pastikan server aktif dan alamat API benar.', { cause: error })
  }

  if (response.status === 204) return null

  const payload = await response.json().catch((error) => {
    console.error('Respons API Laravel bukan JSON yang valid.', error)
    throw new Error('Respons API tidak dapat dibaca. Periksa konfigurasi endpoint Laravel.', { cause: error })
  })

  if (!response.ok) {
    const validationErrors = payload.errors
      ? Object.values(payload.errors).flat().join(' ')
      : ''
    throw new Error(validationErrors || payload.message || `Permintaan API gagal (${response.status}).`)
  }

  return payload
}

async function fetchAll(path) {
  const items = []
  let page = 1

  while (true) {
    const payload = await requestJson(`${path}${path.includes('?') ? '&' : '?'}page=${page}`)
    if (!Array.isArray(payload.data)) {
      throw new Error('Format daftar dari API tidak sesuai.')
    }
    items.push(...payload.data)
    const lastPage = Number(payload.meta?.last_page || 1)
    if (page >= lastPage) break
    page += 1
  }

  return items
}

export function mapCustomerFromApi(customer) {
  return {
    id: customer.id,
    name: customer.nama,
    phone: customer.no_hp,
    noRekening: customer.no_rekening || '',
    address: customer.alamat,
    type: customer.kategori || 'Prospek',
    loanStatus: customer.status_pinjaman || 'Belum ada pinjaman',
    latitude: customer.latitude === null ? '' : String(customer.latitude),
    longitude: customer.longitude === null ? '' : String(customer.longitude),
  }
}

export function mapAppointmentFromApi(appointment) {
  return {
    id: appointment.id,
    customerId: appointment.nasabah_id,
    date: appointment.tanggal,
    time: appointment.waktu,
    purpose: appointment.tujuan,
    priority: appointment.prioritas === 'tinggi' ? 'Tinggi' : 'Normal',
    status: appointmentStatusFromApi[appointment.status] || appointment.status,
    notes: appointment.catatan_hasil || '',
    evidence: '',
    checkInAt: appointment.check_in_at,
    checkInLatitude: appointment.check_in_latitude,
    checkInLongitude: appointment.check_in_longitude,
  }
}

export async function fetchCustomers() {
  const customers = await fetchAll('/nasabah')
  return customers.map(mapCustomerFromApi)
}

export async function fetchAppointments() {
  const appointments = await fetchAll('/jadwal-kunjungan')
  return appointments.map(mapAppointmentFromApi)
}

export async function saveCustomer(customer) {
  const payload = {
    nama: customer.name,
    alamat: customer.address,
    no_hp: customer.phone,
    no_rekening: customer.noRekening?.trim() || null,
    kategori: customer.type,
    status_pinjaman: customer.loanStatus,
    latitude: customer.latitude === '' ? null : Number(customer.latitude),
    longitude: customer.longitude === '' ? null : Number(customer.longitude),
  }
  const isExisting = /^\d+$/.test(String(customer.id))
  const response = await requestJson(
    isExisting ? `/nasabah/${customer.id}` : '/nasabah',
    {
      method: isExisting ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    },
  )

  return mapCustomerFromApi(response.data)
}

export async function deleteCustomer(customerId) {
  await requestJson(`/nasabah/${encodeURIComponent(customerId)}`, { method: 'DELETE' })
}

export async function saveAppointment(appointment) {
  const payload = {
    nasabah_id: Number(appointment.customerId),
    tanggal: appointment.date,
    waktu: appointment.time,
    tujuan: appointment.purpose,
    prioritas: appointment.priority === 'Tinggi' ? 'tinggi' : 'normal',
  }
  const isExisting = /^\d+$/.test(String(appointment.id))
  const response = await requestJson(
    isExisting ? `/jadwal-kunjungan/${appointment.id}` : '/jadwal-kunjungan',
    {
      method: isExisting ? 'PATCH' : 'POST',
      body: JSON.stringify(payload),
    },
  )

  return mapAppointmentFromApi(response.data)
}

export async function deleteAppointment(appointmentId) {
  await requestJson(`/jadwal-kunjungan/${encodeURIComponent(appointmentId)}`, { method: 'DELETE' })
}

export async function submitVisitResult(appointment, { status, notes, newDate, newTime, coordinates }) {
  validateAppointmentApiReady(appointment)

  if (status === 'Selesai') {
    const response = await requestJson(
      `/jadwal-kunjungan/${encodeURIComponent(appointment.id)}/check-in`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...coordinates,
          catatan_hasil: notes,
        }),
      },
    )
    return mapAppointmentFromApi(response.data)
  }

  const response = await requestJson(
    `/jadwal-kunjungan/${encodeURIComponent(appointment.id)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        status: appointmentStatusToApi[status],
        catatan_hasil: notes,
        ...(status === 'Reschedule' ? { tanggal: newDate, waktu: newTime } : {}),
      }),
    },
  )

  return mapAppointmentFromApi(response.data)
}
