# Panduan Sistem CallPlan

Dokumen ini menjelaskan aplikasi CallPlan untuk membantu Relationship Manager (RM) mengelola data nasabah, merencanakan kunjungan, mencatat hasil pertemuan, dan melihat laporan aktivitas.

## 1. Gambaran umum

CallPlan terdiri dari dua aplikasi yang berjalan terpisah:

1. **Frontend**: React untuk menampilkan halaman dan menerima tindakan pengguna.
2. **Backend**: Laravel REST API untuk memvalidasi permintaan dan membaca atau menyimpan data.
3. **Database**: SQLite untuk menyimpan data nasabah dan jadwal.

```text
Pengguna
   │
   ▼
Frontend React + Vite (http://localhost:5173)
   │ HTTP/JSON melalui /api
   ▼
Backend Laravel (http://127.0.0.1:8000)
   │ Eloquent ORM
   ▼
Database SQLite
```

Frontend dan backend berada di folder berbeda:

```text
Tracking Nasabah/
├── Call-Plan/       # Frontend React
└── Call-Plan-API/   # Backend Laravel
```

## 2. Teknologi yang digunakan

| Teknologi | Kegunaan |
|---|---|
| React | Membuat antarmuka dengan komponen dan state. |
| Vite | Menjalankan server pengembangan frontend dan membuat build produksi. |
| Tailwind CSS v4 | Menata layout, warna, jarak, dan tampilan responsif. |
| Lucide React | Ikon pada navigasi, tombol, dan informasi. |
| Leaflet + React Leaflet | Menampilkan peta OpenStreetMap. |
| Google Maps JavaScript API | Peta dan geocoding Google jika API key disediakan. |
| Laravel | Menyediakan endpoint REST, validasi data, dan aturan check-in. |
| Eloquent ORM | Menghubungkan model Laravel dengan tabel database. |
| SQLite | Database lokal dalam satu file. |
| Nominatim / OpenStreetMap | Pencarian alamat dan alamat berdasarkan koordinat. |
| OSRM | Menghitung rute jalan pada peta. |

## 3. Struktur folder

### Frontend: `Call-Plan/`

```text
src/
├── main.jsx
├── App.jsx
├── index.css
├── components/
│   ├── AppShell.jsx
│   ├── Sidebar.jsx
│   ├── CustomerForm.jsx
│   ├── AppointmentForm.jsx
│   ├── VisitUpdateModal.jsx
│   ├── LocationMap.jsx
│   ├── GoogleMapLocation.jsx
│   ├── RouteMapModal.jsx
│   ├── Modal.jsx
│   └── StatusBadge.jsx
├── pages/
│   ├── DashboardPage.jsx
│   ├── CustomersPage.jsx
│   ├── SchedulePage.jsx
│   └── ReportsPage.jsx
├── services/
│   ├── jadwalKunjungan.js
│   ├── geocoding.js
│   ├── googleMaps.js
│   ├── mapRouting.js
│   └── mapLinks.js
└── data/
    └── workspace.js
```

- `main.jsx` memasang React ke halaman HTML dan memuat CSS utama.
- `App.jsx` memilih halaman, memuat data dari Laravel, dan menyediakan operasi simpan/hapus kepada halaman.
- `AppShell.jsx` dan `Sidebar.jsx` membentuk kerangka aplikasi dan navigasi.
- `pages/` berisi empat halaman utama. Halaman dimuat secara malas dengan `React.lazy` agar kode halaman dapat dipisahkan.
- `components/` berisi elemen antarmuka yang digunakan di berbagai halaman, seperti form, modal, peta, dan label status.
- `services/` menangani komunikasi API dan layanan peta.
- `data/workspace.js` berisi helper tanggal dan data demo. Jalur utama aplikasi saat ini mengambil data dari API; helper data demo/local storage di file ini bukan sumber data utama yang sedang dipakai `App.jsx`.
- `index.css` mengatur gaya global dan tombol/form bersama. Tema antarmuka saat ini memakai putih, biru, dan aksen oranye.

### Backend: `Call-Plan-API/`

```text
app/
├── Http/
│   ├── Controllers/Api/
│   ├── Requests/
│   └── Resources/
└── Models/
routes/
└── api.php
database/
└── migrations/
```

- `routes/api.php` mendaftarkan endpoint API.
- `Controllers/Api/` menjalankan operasi daftar, tambah, ubah, hapus, dan check-in.
- `Requests/` memeriksa format dan aturan input sebelum controller memprosesnya.
- `Resources/` menentukan bentuk JSON yang dikirim ke frontend.
- `Models/` mewakili tabel dan hubungan antardata.
- `database/migrations/` mendefinisikan struktur dan perubahan tabel database.

## 4. Halaman dan fungsi

### Dashboard

Menampilkan ringkasan agenda hari ini, jumlah kunjungan selesai, jadwal ulang, agenda hari ini, rute prioritas, dan jumlah nasabah. Ringkasan yang ditampilkan dashboard dihitung dari data nasabah dan jadwal yang sudah dimuat frontend.

Backend juga memiliki endpoint ringkasan tersendiri, tetapi halaman dashboard saat ini tidak memanggil endpoint tersebut.

### Data Nasabah

Pengguna dapat mencari nasabah, memfilter prospek/debitur, menambahkan atau mengubah data, membuka lokasi, dan menonaktifkan data nasabah. Nomor rekening ditampilkan tersamarkan: hanya empat digit terakhir yang terlihat.

### Jadwal Kunjungan / Call Plan

Pengguna dapat melihat kalender atau daftar, berpindah bulan, memilih tanggal, memfilter status, membuat atau mengubah jadwal, menghapus jadwal, serta membuka lokasi/rute nasabah.

### Riwayat dan Laporan

Pengguna dapat memfilter aktivitas berdasarkan rentang tanggal, status, dan kata kunci. Data dapat diunduh sebagai CSV yang bisa dibuka di Excel, atau dicetak/disimpan sebagai PDF melalui dialog cetak browser.

## 5. Data dan hubungan tabel

### Nasabah (`nasabahs`)

Satu baris menyimpan informasi seperti:

- `id`: identitas unik dari database.
- `nama`, `alamat`, `no_hp`: data kontak.
- `no_rekening`: opsional, disimpan sebagai teks agar angka nol di depan tidak hilang.
- `kategori`: `Prospek` atau `Debitur`.
- `status_pinjaman`: status informasi pinjaman.
- `latitude`, `longitude`: koordinat lokasi nasabah, boleh kosong sampai lokasi dipilih.
- `created_at`, `updated_at`, `deleted_at`: waktu pencatatan dan penanda soft delete.

### Jadwal Kunjungan (`jadwal_kunjungans`)

Satu jadwal merujuk ke satu nasabah melalui `nasabah_id`, dengan informasi:

- `tanggal`, `waktu`, `tujuan`, `prioritas`.
- `status` dan `catatan_hasil`.
- `check_in_at`, `check_in_latitude`, `check_in_longitude` setelah check-in sukses.

Hubungannya adalah **satu nasabah mempunyai banyak jadwal**. Penghapusan nasabah menggunakan soft delete agar data dan hubungan riwayat tetap tersedia; penghapusan jadwal menghapus data jadwal melalui API.

Status yang digunakan:

| Tampilan aplikasi | Nilai yang disimpan API |
|---|---|
| Terjadwal | `pending` |
| Selesai | `selesai` |
| Reschedule | `reschedule` |
| Tidak ditemui | `tidak_ditemui` |

Frontend menggunakan nama field yang mudah dibaca, misalnya `name` dan `date`. API menggunakan nama field database, misalnya `nama` dan `tanggal`. `jadwalKunjungan.js` menerjemahkan data di antara kedua bentuk tersebut.

## 6. Alur utama sistem

### Saat aplikasi dibuka

1. `main.jsx` menjalankan React.
2. `App.jsx` memeriksa apakah `VITE_API_BASE_URL` tersedia.
3. Frontend meminta daftar `/nasabah` dan `/jadwal-kunjungan` dari Laravel secara bersamaan.
4. Laravel memvalidasi filter, membaca data SQLite, lalu mengirim JSON.
5. Daftar API dipaginasi, 15 data per halaman. Frontend meminta halaman berikutnya sampai semua data terkumpul.
6. Data API diterjemahkan ke bentuk yang digunakan komponen React.
7. Jika API gagal, frontend menampilkan pesan error dan tombol **Coba lagi**; ia tidak diam-diam mengganti data dengan data demo.

### Saat menambah atau mengubah data

```text
Form React
  → fungsi pada halaman
  → handler data pada App.jsx
  → service jadwalKunjungan.js
  → endpoint Laravel
  → Form Request memvalidasi
  → Controller menyimpan ke SQLite
  → Resource mengirim JSON
  → service mengubah JSON ke bentuk frontend
  → state React diperbarui
```

- Data baru dikirim dengan `POST`.
- Data yang sudah ada dikirim dengan `PATCH`.
- Hapus nasabah dan jadwal dilakukan dengan `DELETE`.
- Laravel dapat mengirim error validasi dalam JSON; frontend menampilkan pesan error tersebut.

### Saat check-in selesai

1. RM membuka form hasil kunjungan dan memilih status **Selesai**.
2. Catatan hasil wajib diisi; lokasi nasabah juga harus memiliki koordinat.
3. Browser meminta izin GPS. Akurasi GPS perangkat harus memadai untuk batas validasi 100 meter.
4. Frontend mengirim latitude, longitude, dan catatan ke endpoint check-in.
5. Laravel memeriksa bahwa jadwal belum selesai dan masih berstatus `pending`, lokasi nasabah tersedia, serta jarak koordinat RM ke nasabah tidak lebih dari 100 meter.
6. Jika semua syarat lolos, Laravel mengubah status menjadi `selesai` dan menyimpan catatan, waktu, serta koordinat check-in.
7. Jika pengguna memilih **Reschedule** atau **Tidak ditemui**, frontend memperbarui status/catatan melalui endpoint jadwal biasa; opsi Reschedule juga mengirim tanggal dan waktu baru.

Perhitungan jarak dilakukan di backend menggunakan rumus Haversine. Pemeriksaan di server tetap menjadi penentu; pemeriksaan GPS di browser membantu memberi umpan balik sebelum permintaan dikirim.

### Saat mencari lokasi dan rute

1. Form nasabah dapat mencari alamat menggunakan Google Geocoding jika API key diatur, atau Nominatim/OpenStreetMap.
2. Pengguna dapat memeriksa dan memilih pin pada peta.
3. Aplikasi dapat menggunakan GPS browser sebagai lokasi asal.
4. Untuk garis rute jalan di dalam aplikasi, frontend meminta OSRM menghitung rute.
5. Tautan Google Maps/OpenStreetMap juga dapat dibuka untuk melihat lokasi atau navigasi di layanan peta tersebut.

Pencarian alamat/rute membutuhkan koneksi internet. Lokasi browser biasanya memerlukan izin pengguna dan konteks `localhost` atau HTTPS.

## 7. Endpoint API

Semua endpoint berikut memakai awalan `/api`.

| Metode | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/dashboard/ringkasan?tanggal=YYYY-MM-DD` | Mengambil hitungan jadwal untuk satu tanggal. |
| `GET` | `/nasabah` | Mengambil daftar nasabah; mendukung pencarian `q` dan pagination. |
| `POST` | `/nasabah` | Membuat nasabah baru. |
| `GET` | `/nasabah/{id}` | Mengambil satu nasabah. |
| `PATCH` | `/nasabah/{id}` | Memperbarui nasabah. |
| `DELETE` | `/nasabah/{id}` | Menonaktifkan nasabah (soft delete). |
| `GET` | `/jadwal-kunjungan` | Mengambil daftar jadwal; mendukung filter tanggal, rentang tanggal, status, dan pagination. |
| `POST` | `/jadwal-kunjungan` | Membuat jadwal dengan status awal `pending`. |
| `GET` | `/jadwal-kunjungan/{id}` | Mengambil satu jadwal. |
| `PATCH` | `/jadwal-kunjungan/{id}` | Memperbarui jadwal atau hasil yang bukan check-in selesai. |
| `DELETE` | `/jadwal-kunjungan/{id}` | Menghapus jadwal. |
| `POST` | `/jadwal-kunjungan/{id}/check-in` | Memvalidasi GPS dan menyimpan check-in selesai. |

Contoh body tambah jadwal:

```json
{
  "nasabah_id": 1,
  "tanggal": "2026-10-28",
  "waktu": "09:30",
  "tujuan": "Kunjungan Prospek",
  "prioritas": "normal"
}
```

Contoh body check-in:

```json
{
  "latitude": -6.2,
  "longitude": 106.8,
  "catatan_hasil": "Bertemu langsung dengan nasabah."
}
```

## 8. Cara menjalankan di komputer lokal

Jalankan frontend dan backend pada dua terminal terpisah.

### Backend Laravel

Di PowerShell:

```powershell
Set-Location "C:\SEMESTER 5 ALFIQ\Tracking Nasabah\Call-Plan-API"
$env:PHP_INI_SCAN_DIR = (Join-Path (Get-Location) "php-conf")
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000
```

`PHP_INI_SCAN_DIR` mengaktifkan ekstensi SQLite dari konfigurasi proyek lokal untuk PHP. Biarkan terminal server tetap berjalan. Migrasi membuat atau memperbarui struktur database.

### Frontend React

Di terminal PowerShell lain:

```powershell
Set-Location "C:\SEMESTER 5 ALFIQ\Tracking Nasabah\Call-Plan"
npm install
npm run dev
```

Buka alamat Vite yang ditampilkan di terminal, biasanya `http://localhost:5173`. Alamat API di file `.env` frontend harus menunjuk ke:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

Setelah mengubah `.env`, restart server Vite. CORS backend sudah mengizinkan origin lokal Vite `localhost`/`127.0.0.1` pada port 5173 dan 5174.

## 9. Pemeriksaan proyek

Dari folder frontend:

```powershell
npm run lint
npm run build
```

- `lint` memeriksa masalah gaya dan pola kode JavaScript/JSX.
- `build` membuat berkas frontend siap produksi di folder `dist/`.

## 10. Batasan dan hal yang perlu dipahami

- API CRUD saat ini belum mewajibkan autentikasi/otorisasi RM. Endpoint `/api/user` memakai Sanctum, tetapi operasi nasabah dan jadwal yang digunakan frontend belum dilindungi login.
- Nomor rekening ditampilkan tersamarkan di daftar, tetapi penyimpanan database belum menerapkan enkripsi khusus. Penyamaran di layar bukan enkripsi.
- Jangan gunakan data nasabah atau nomor rekening asli sampai keamanan, akses pengguna, penyimpanan, dan kebijakan data organisasi disetujui.
- Foto bukti dapat dipilih pada form, tetapi belum diunggah atau disimpan oleh backend. Foto tidak dijamin tetap ada setelah halaman dimuat ulang.
- Pengingat saat ini berupa informasi di dalam aplikasi; belum mengirim notifikasi ke perangkat.
- Peta dan geocoding mengirim alamat/koordinat ke penyedia layanan eksternal yang dipilih. Rute jalan menggunakan layanan OSRM publik.
- Dashboard menghitung statistik dari daftar yang telah dimuat frontend. Endpoint `/api/dashboard/ringkasan` tersedia di backend, tetapi saat ini belum menjadi sumber statistik halaman dashboard.
- Aplikasi berfokus pada jadwal dan aktivitas kunjungan; bukan sistem pencatatan target uang, nominal kredit, atau pencairan.

