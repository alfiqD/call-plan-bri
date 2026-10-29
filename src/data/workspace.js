export const STORAGE_KEY = 'call-plan-workspace-v2'

const dayOffset = (offset) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return localDateKey(date)
}

export function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function createSeedData() {
  const customers = [
    {
      id: '1',
      name: 'Budi Santoso',
      phone: '0812-3456-7890',
      noRekening: '001201098765432',
      address: 'Jl. Merdeka No. 18, Bandung',
      type: 'Debitur',
      loanStatus: 'Aktif',
      latitude: '-6.9174640',
      longitude: '107.6191230',
    },
    {
      id: '2',
      name: 'Siti Rahmawati',
      phone: '0813-2233-4455',
      noRekening: '',
      address: 'Jl. Cempaka No. 7, Bandung',
      type: 'Prospek',
      loanStatus: 'Belum ada pinjaman',
      latitude: '-6.9147440',
      longitude: '107.6098100',
    },
    {
      id: '3',
      name: 'Andi Wijaya',
      phone: '0821-6677-8899',
      noRekening: '001201012345678',
      address: 'Komplek Puri Asri Blok C2, Bandung',
      type: 'Debitur',
      loanStatus: 'Aktif',
      latitude: '-6.9200000',
      longitude: '107.6250000',
    },
    {
      id: '4',
      name: 'Dewi Anggraini',
      phone: '0857-1122-3344',
      noRekening: '',
      address: 'Jl. Sukajadi No. 42, Bandung',
      type: 'Prospek',
      loanStatus: 'Dalam pengajuan',
      latitude: '-6.8850000',
      longitude: '107.5950000',
    },
    {
      id: '5',
      name: 'Rudi Hermawan',
      phone: '0819-5500-1234',
      noRekening: '001201055443322',
      address: 'Jl. Setiabudi No. 120, Bandung',
      type: 'Debitur',
      loanStatus: 'Perlu tindak lanjut',
      latitude: '-6.8600000',
      longitude: '107.5900000',
    },
    {
      id: '6',
      name: 'Maya Puspita',
      phone: '0878-9080-1020',
      noRekening: '',
      address: 'Jl. Gegerkalong Hilir No. 9, Bandung',
      type: 'Prospek',
      loanStatus: 'Belum ada pinjaman',
      latitude: '-6.8720000',
      longitude: '107.5850000',
    },
  ]

  const appointments = [
    { id: '1', customerId: '1', date: dayOffset(0), time: '09:00', purpose: 'Penagihan', priority: 'Tinggi', status: 'Selesai', notes: 'Bertemu langsung, tindak lanjut sesuai kesepakatan.', evidence: '', checkInAt: new Date().toISOString(), checkInLatitude: -6.9174640, checkInLongitude: 107.6191230 },
    { id: '2', customerId: '2', date: dayOffset(0), time: '11:00', purpose: 'Penawaran Top-Up', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: '3', customerId: '3', date: dayOffset(0), time: '13:30', purpose: 'Survei Jaminan', priority: 'Tinggi', status: 'Reschedule', notes: 'Nasabah meminta penjadwalan ulang.', evidence: '' },
    { id: '4', customerId: '4', date: dayOffset(0), time: '15:00', purpose: 'Kunjungan Prospek', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: '5', customerId: '5', date: dayOffset(1), time: '10:00', purpose: 'Penagihan', priority: 'Tinggi', status: 'Terjadwal', notes: '', evidence: '' },
    { id: '6', customerId: '6', date: dayOffset(2), time: '14:00', purpose: 'Kunjungan Prospek', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: '7', customerId: '1', date: dayOffset(-1), time: '10:30', purpose: 'Follow-up', priority: 'Normal', status: 'Selesai', notes: 'Dokumen sudah diterima.', evidence: '' },
  ]

  const followUps = [
    {
      id: '1',
      customerId: '1',
      appointmentId: '1',
      date: dayOffset(0),
      time: '14:00',
      type: 'Melengkapi Dokumen',
      notes: 'Ambil berkas fotokopi sertifikat jaminan yang telah disiapkan nasabah.',
      priority: 'Tinggi',
      status: 'Belum Dilakukan',
      resultNotes: '',
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      customerId: '2',
      appointmentId: null,
      date: dayOffset(-1),
      time: '10:00',
      type: 'Telepon',
      notes: 'Konfirmasi keputusan pengajuan plafon pinjaman modal kerja.',
      priority: 'Tinggi',
      status: 'Belum Dilakukan',
      resultNotes: '',
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      customerId: '3',
      appointmentId: '3',
      date: dayOffset(2),
      time: '11:00',
      type: 'Pertemuan/Kunjungan Ulang',
      notes: 'Kunjungan ulang bersama analis kredit untuk survei agunan tambahan.',
      priority: 'Normal',
      status: 'Belum Dilakukan',
      resultNotes: '',
      completedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '4',
      customerId: '4',
      appointmentId: null,
      date: dayOffset(-2),
      time: '15:30',
      type: 'WhatsApp',
      notes: 'Kirimkan brosur simulasi cicilan Kupedes BRI ke nomor WA nasabah.',
      priority: 'Normal',
      status: 'Selesai',
      resultNotes: 'Brosur dan simulasi telah dikirim via WA, nasabah berminat plafon 50 juta.',
      completedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  return { customers, appointments, followUps }
}

export function readWorkspace(createInitialData = createSeedData) {
  if (typeof window === 'undefined') return { workspace: createInitialData(), error: '' }
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      const initial = createInitialData()
      writeWorkspace(initial)
      return { workspace: initial, error: '' }
    }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.appointments)) {
      throw new Error('Format data Call Plan tidak sesuai.')
    }
    if (!Array.isArray(parsed.followUps)) {
      parsed.followUps = createInitialData().followUps
    }

    return { workspace: parsed, error: '' }
  } catch (error) {
    console.warn('Gagal membaca data dari localStorage, menggunakan seed data:', error)
    return {
      workspace: createInitialData(),
      error: '',
    }
  }
}

export function writeWorkspace(workspace) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } catch (error) {
    console.warn('Gagal menulis data ke localStorage:', error)
  }
}

export function createId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', options).format(new Date(`${dateString}T00:00:00`))
}

export function getCustomer(customers, customerId) {
  return customers.find((customer) => String(customer.id) === String(customerId))
}

export function getAppointmentDateTime(appointment) {
  return new Date(`${appointment.date}T${appointment.time || '00:00'}:00`)
}
