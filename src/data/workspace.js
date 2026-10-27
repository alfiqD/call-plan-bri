export const STORAGE_KEY = 'call-plan-workspace-v1'

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
    { id: 'nasabah-1', name: 'Budi Santoso', phone: '0812-3456-7890', address: 'Jl. Merdeka No. 18, Bandung', type: 'Debitur', loanStatus: 'Aktif' },
    { id: 'nasabah-2', name: 'Siti Rahmawati', phone: '0813-2233-4455', address: 'Jl. Cempaka No. 7, Bandung', type: 'Prospek', loanStatus: 'Belum ada pinjaman' },
    { id: 'nasabah-3', name: 'Andi Wijaya', phone: '0821-6677-8899', address: 'Komplek Puri Asri Blok C2, Bandung', type: 'Debitur', loanStatus: 'Aktif' },
    { id: 'nasabah-4', name: 'Dewi Anggraini', phone: '0857-1122-3344', address: 'Jl. Sukajadi No. 42, Bandung', type: 'Prospek', loanStatus: 'Dalam pengajuan' },
    { id: 'nasabah-5', name: 'Rudi Hermawan', phone: '0819-5500-1234', address: 'Jl. Setiabudi No. 120, Bandung', type: 'Debitur', loanStatus: 'Perlu tindak lanjut' },
    { id: 'nasabah-6', name: 'Maya Puspita', phone: '0878-9080-1020', address: 'Jl. Gegerkalong Hilir No. 9, Bandung', type: 'Prospek', loanStatus: 'Belum ada pinjaman' },
  ]

  const appointments = [
    { id: 'jadwal-1', customerId: 'nasabah-1', date: dayOffset(0), time: '09:00', purpose: 'Penagihan', priority: 'Tinggi', status: 'Selesai', notes: 'Bertemu langsung, tindak lanjut sesuai kesepakatan.', evidence: '' },
    { id: 'jadwal-2', customerId: 'nasabah-2', date: dayOffset(0), time: '11:00', purpose: 'Penawaran Top-Up', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: 'jadwal-3', customerId: 'nasabah-3', date: dayOffset(0), time: '13:30', purpose: 'Survei Jaminan', priority: 'Tinggi', status: 'Reschedule', notes: 'Nasabah meminta penjadwalan ulang.', evidence: '' },
    { id: 'jadwal-4', customerId: 'nasabah-4', date: dayOffset(0), time: '15:00', purpose: 'Kunjungan Prospek', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: 'jadwal-5', customerId: 'nasabah-5', date: dayOffset(1), time: '10:00', purpose: 'Penagihan', priority: 'Tinggi', status: 'Terjadwal', notes: '', evidence: '' },
    { id: 'jadwal-6', customerId: 'nasabah-6', date: dayOffset(2), time: '14:00', purpose: 'Kunjungan Prospek', priority: 'Normal', status: 'Terjadwal', notes: '', evidence: '' },
    { id: 'jadwal-7', customerId: 'nasabah-1', date: dayOffset(-1), time: '10:30', purpose: 'Follow-up', priority: 'Normal', status: 'Selesai', notes: 'Dokumen sudah diterima.', evidence: '' },
  ]

  return { customers, appointments }
}

export function readWorkspace(createInitialData) {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return { workspace: createInitialData(), error: '' }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed.customers) || !Array.isArray(parsed.appointments)) {
      throw new Error('Format data Call Plan tidak sesuai.')
    }

    return { workspace: parsed, error: '' }
  } catch (error) {
    console.error('Gagal membaca data Call Plan dari penyimpanan browser.', error)
    return {
      workspace: createInitialData(),
      error: 'Data tersimpan tidak dapat dibaca. Aplikasi menggunakan data demo; perubahan berikutnya akan mencoba menyimpan kembali.',
    }
  }
}

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export function formatDate(dateString, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!dateString) return '-'
  return new Intl.DateTimeFormat('id-ID', options).format(new Date(`${dateString}T00:00:00`))
}

export function getCustomer(customers, customerId) {
  return customers.find((customer) => customer.id === customerId)
}

export function getAppointmentDateTime(appointment) {
  return new Date(`${appointment.date}T${appointment.time || '00:00'}:00`)
}
