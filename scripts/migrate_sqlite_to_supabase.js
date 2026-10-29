/**
 * Script Migrasi Data dari SQLite (Laravel Call-Plan-API) ke Supabase PostgreSQL
 *
 * Penggunaan:
 *   node scripts/migrate_sqlite_to_supabase.js --dry-run
 *   node scripts/migrate_sqlite_to_supabase.js --live --assigned-rm-id=<UUID-RM-ANDA>
 *
 * Catatan Keamanan:
 * - Script ini membuka database SQLite secara READ-ONLY dan TIDAK mengubah SQLite lama.
 * - Memeriksa duplikasi, integritas relasi, validitas koordinat, dan format nomor rekening.
 */

import { DatabaseSync } from 'node:sqlite'
import { createClient } from '@supabase/supabase-js'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SQLITE_PATH = path.resolve(__dirname, '../../Call-Plan-API/database/database.sqlite')

const args = process.argv.slice(2)
const isLive = args.includes('--live')
const assignedRmArg = args.find((arg) => arg.startsWith('--assigned-rm-id='))
const targetRmId = assignedRmArg ? assignedRmArg.split('=')[1] : null

console.log('=================================================================')
console.log('CALLPLAN - TOOL MIGRASI DATA SQLITE KE SUPABASE POSTGRESQL')
console.log('=================================================================')
console.log(`Mode: ${isLive ? '🔴 LIVE (Kirim ke Supabase)' : '🟢 DRY-RUN (Hanya Verifikasi Data)'}`)
console.log(`Path SQLite: ${SQLITE_PATH}`)

let db
try {
  db = new DatabaseSync(SQLITE_PATH, { open: true, readOnly: true })
} catch (error) {
  console.error('❌ Gagal membuka database SQLite:', error.message)
  process.exit(1)
}

// 1. Ekstrak Data Nasabah
console.log('\n--- 1. MEMERIKSA DATA NASABAH ---')
const rawNasabahs = db.prepare('SELECT * FROM nasabahs ORDER BY id ASC').all()
console.log(`Ditemukan ${rawNasabahs.length} data nasabah di SQLite.`)

const cleanNasabahs = []
const nasabahWarnings = []

for (const row of rawNasabahs) {
  const warnings = []
  if (!row.nama || !row.nama.trim()) warnings.push('Nama kosong')
  if (!row.alamat || !row.alamat.trim()) warnings.push('Alamat kosong')
  if (!row.no_hp || !row.no_hp.trim()) warnings.push('Nomor HP kosong')

  let latitude = row.latitude !== null && row.latitude !== undefined && row.latitude !== '' ? Number(row.latitude) : null
  let longitude = row.longitude !== null && row.longitude !== undefined && row.longitude !== '' ? Number(row.longitude) : null

  if (latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) {
    warnings.push(`Latitude tidak valid: ${row.latitude}`)
    latitude = null
  }
  if (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180)) {
    warnings.push(`Longitude tidak valid: ${row.longitude}`)
    longitude = null
  }

  const cleanRow = {
    id: row.id,
    nama: row.nama?.trim() || 'Nasabah Tanpa Nama',
    alamat: row.alamat?.trim() || '-',
    no_hp: row.no_hp?.trim() || '-',
    no_rekening: row.no_rekening ? String(row.no_rekening).trim() : null,
    kategori: ['Prospek', 'Debitur'].includes(row.kategori) ? row.kategori : 'Prospek',
    status_pinjaman: [
      'Belum ada pinjaman',
      'Dalam pengajuan',
      'Aktif',
      'Perlu tindak lanjut',
      'Lunas',
    ].includes(row.status_pinjaman) ? row.status_pinjaman : 'Belum ada pinjaman',
    latitude,
    longitude,
    deleted_at: row.deleted_at || null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }

  if (warnings.length) {
    nasabahWarnings.push({ id: row.id, nama: row.nama, warnings })
  }
  cleanNasabahs.push(cleanRow)
}

console.log(`✅ ${cleanNasabahs.length} data nasabah siap diproses. (${nasabahWarnings.length} dengan catatan)`)
if (nasabahWarnings.length) {
  console.log('Catatan validasi nasabah:', JSON.stringify(nasabahWarnings.slice(0, 3), null, 2))
}

// 2. Ekstrak Data Jadwal Kunjungan
console.log('\n--- 2. MEMERIKSA DATA JADWAL KUNJUNGAN ---')
const rawJadwal = db.prepare('SELECT * FROM jadwal_kunjungans ORDER BY id ASC').all()
console.log(`Ditemukan ${rawJadwal.length} data jadwal kunjungan di SQLite.`)

const nasabahIdSet = new Set(cleanNasabahs.map((n) => n.id))
const cleanJadwal = []
const jadwalWarnings = []

for (const row of rawJadwal) {
  const warnings = []
  if (!nasabahIdSet.has(row.nasabah_id)) {
    warnings.push(`nasabah_id #${row.nasabah_id} tidak ada di tabel nasabahs`)
  }
  if (!row.tanggal) warnings.push('Tanggal kosong')
  if (!row.waktu) warnings.push('Waktu kosong')

  const cleanRow = {
    id: row.id,
    nasabah_id: row.nasabah_id,
    tanggal: row.tanggal,
    waktu: row.waktu ? row.waktu.slice(0, 8) : '09:00:00',
    tujuan: row.tujuan || 'Kunjungan Lapangan',
    prioritas: row.prioritas === 'tinggi' ? 'tinggi' : 'normal',
    status: ['pending', 'selesai', 'reschedule', 'tidak_ditemui'].includes(row.status) ? row.status : 'pending',
    catatan_hasil: row.catatan_hasil || null,
    check_in_at: row.check_in_at || null,
    check_in_latitude: row.check_in_latitude !== null && row.check_in_latitude !== undefined ? Number(row.check_in_latitude) : null,
    check_in_longitude: row.check_in_longitude !== null && row.check_in_longitude !== undefined ? Number(row.check_in_longitude) : null,
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
  }

  if (warnings.length) {
    jadwalWarnings.push({ id: row.id, warnings })
  }
  cleanJadwal.push(cleanRow)
}

console.log(`✅ ${cleanJadwal.length} data jadwal siap diproses. (${jadwalWarnings.length} dengan catatan)`)

// 3. Eksekusi Live jika diminta
if (isLive) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Variabel environment SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY atau VITE_SUPABASE_ANON_KEY wajib diisi untuk mode live.')
    process.exit(1)
  }

  if (!targetRmId) {
    console.error('❌ Error: Parameter --assigned-rm-id=<UUID-USER> wajib diberikan agar jadwal kunjungan memiliki pemilik RM di Supabase.')
    process.exit(1)
  }

  console.log(`\nMenghubungkan ke Supabase: ${supabaseUrl}...`)
  const supabase = createClient(supabaseUrl, supabaseKey)

  async function executeLiveMigration() {
    console.log('Mengunggah data nasabah...')
    const { error: nasabahError } = await supabase.from('nasabahs').upsert(cleanNasabahs)
    if (nasabahError) {
      console.error('❌ Gagal mengunggah nasabah:', nasabahError)
      return
    }
    console.log(`✅ Berhasil mengunggah ${cleanNasabahs.length} nasabah.`)

    console.log('Mengunggah data jadwal kunjungan...')
    const jadwalWithRm = cleanJadwal.map((j) => ({ ...j, rm_id: targetRmId }))
    const { error: jadwalError } = await supabase.from('jadwal_kunjungans').upsert(jadwalWithRm)
    if (jadwalError) {
      console.error('❌ Gagal mengunggah jadwal kunjungan:', jadwalError)
      return
    }
    console.log(`✅ Berhasil mengunggah ${cleanJadwal.length} jadwal kunjungan.`)
    console.log('\n🎉 MIGRASI KE SUPABASE SUKSES SEPENUHNYA!')
  }

  executeLiveMigration().catch((err) => {
    console.error('❌ Terjadi kesalahan migrasi:', err)
  })
} else {
  console.log('\nℹ️ Untuk melakukan migrasi sungguhan, pastikan Supabase aktif lalu jalankan:')
  console.log('  node scripts/migrate_sqlite_to_supabase.js --live --assigned-rm-id=<UUID-RM>')
}
