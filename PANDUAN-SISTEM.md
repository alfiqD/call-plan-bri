# Panduan Sistem CallPlan

Dokumen ini menjelaskan aplikasi CallPlan untuk membantu Relationship Manager (RM) mengelola data nasabah, merencanakan kunjungan mingguan, mencatat hasil pertemuan, dan memantau realisasi kunjungan.

## 1. Gambaran umum

CallPlan menggunakan frontend React yang terhubung langsung ke Supabase:

1. **Frontend**: React + Vite untuk menampilkan halaman dan menerima tindakan pengguna.
2. **Backend terkelola**: Supabase Auth, PostgreSQL, Row Level Security (RLS), RPC, dan Storage.

```text
Pengguna
   │
   ▼
React + Vite
   │ Supabase client (anon key + sesi pengguna)
   ├── Supabase Auth
   ├── PostgreSQL + RLS / RPC
   └── Supabase Storage
```

Kredensial Service Role tidak boleh digunakan di frontend. Pembatasan akses data dijalankan oleh RLS dan fungsi database.

## 2. Teknologi yang digunakan

| Teknologi | Kegunaan |
|---|---|
| React | Membuat antarmuka dengan komponen dan state. |
| Vite | Menjalankan server pengembangan frontend dan membuat build produksi. |
| Tailwind CSS v4 | Menata layout, warna, jarak, dan tampilan responsif. |
| Lucide React | Ikon pada navigasi, tombol, dan informasi. |
| Leaflet + React Leaflet | Menampilkan peta OpenStreetMap. |
| Google Maps JavaScript API | Peta dan geocoding Google jika API key disediakan. |
| Supabase Auth | Autentikasi pengguna dan sesi. |
| Supabase PostgreSQL | Menyimpan profil, nasabah, jadwal kunjungan, follow-up, serta audit. |
| Supabase RLS dan RPC | Membatasi akses data dan memvalidasi check-in di server. |
| Supabase Storage | Menyimpan dokumentasi kunjungan. |
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
│   ├── visitMetrics.js
│   ├── geocoding.js
│   ├── googleMaps.js
│   ├── mapRouting.js
│   └── mapLinks.js
└── data/
    └── workspace.js
```

- `main.jsx` memasang React ke halaman HTML dan memuat CSS utama.
- `App.jsx` memilih halaman, memuat data Supabase, dan menyediakan operasi simpan/hapus kepada halaman.
- `AppShell.jsx` dan `Sidebar.jsx` membentuk kerangka aplikasi dan navigasi.
- `pages/` berisi empat halaman utama. Halaman dimuat secara malas dengan `React.lazy` agar kode halaman dapat dipisahkan.
- `components/` berisi elemen antarmuka yang digunakan di berbagai halaman, seperti form, modal, peta, dan label status.
- `services/` menangani akses Supabase, autentikasi, GPS, penyimpanan foto, audit, dan layanan peta.
- `visitMetrics.js` memisahkan hitungan rencana mingguan dari realisasi berdasarkan waktu check-in.
- `data/workspace.js` menyediakan helper tanggal serta data demo/local storage untuk mode demonstrasi.
- `index.css` mengatur gaya global dan tombol/form bersama. Tema antarmuka saat ini memakai putih, biru, dan aksen oranye.

## 4. Halaman dan fungsi

### Dashboard

Dashboard RM dan Admin menyediakan ringkasan jadwal yang direncanakan, realisasi kunjungan berstatus Selesai, jadwal yang masih Terjadwal, Reschedule, dan Tidak ditemui. Ringkasan mingguan memisahkan jumlah jadwal dari jumlah realisasi; tidak ada kuota jumlah kunjungan tetap.

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
- `foto_lokasi` dan `foto_kunjungan` untuk dua jenis dokumentasi terpisah.

Hubungannya adalah **satu nasabah mempunyai banyak jadwal**. Penghapusan nasabah menggunakan soft delete agar data dan hubungan riwayat tetap tersedia; penghapusan jadwal menghapus data jadwal melalui API.

Status yang digunakan:

| Tampilan aplikasi | Nilai yang disimpan di PostgreSQL |
|---|---|
| Terjadwal | `pending` |
| Selesai | `selesai` |
| Reschedule | `reschedule` |
| Tidak ditemui | `tidak_ditemui` |
| Batal | `batal` |

Status `Execute` dan `Gagal` belum diterapkan karena definisi operasionalnya perlu dikonfirmasi BRI. Nilai status historis tidak boleh dihapus atau digabung tanpa pemetaan yang disetujui. Frontend menerjemahkan nama field database seperti `tanggal` dan `rm_id` ke field yang digunakan komponen.

## 6. Alur utama sistem

### Saat aplikasi dibuka

1. `main.jsx` menjalankan React.
2. `AuthContext.jsx` memulihkan sesi Supabase dan memuat profil.
3. Halaman meminta data melalui Supabase client; RLS membatasi baris yang dapat dibaca.
4. Data diterjemahkan ke bentuk yang digunakan komponen React.
5. Jika backend gagal, aplikasi menampilkan pesan error dan tombol **Coba lagi**.

### Saat menambah atau mengubah data

```text
Form React
  → fungsi pada halaman
  → handler data pada App.jsx
  → service jadwalKunjungan.js
  → Supabase client
  → PostgreSQL / RLS / RPC
  → service mengubah data ke bentuk frontend
  → state React diperbarui
```

- Operasi data menggunakan tabel Supabase yang sesuai; nonaktifkan nasabah dilakukan dengan soft delete.
- Error dari Supabase ditampilkan oleh halaman pemanggil.

### Saat check-in selesai

1. RM membuka form hasil kunjungan dan memilih status **Selesai**.
2. Catatan hasil wajib diisi; lokasi nasabah juga harus memiliki koordinat.
3. Browser meminta izin GPS. Akurasi GPS perangkat harus memadai untuk batas validasi 100 meter.
4. Frontend mengirim latitude, longitude, dan catatan ke RPC `check_in_visit`.
5. PostgreSQL memeriksa kepemilikan jadwal, status, koordinat nasabah, dan jarak maksimal 100 meter.
6. Jika semua syarat lolos, RPC menyimpan status `selesai`, catatan, waktu, serta koordinat check-in.
7. Jika pengguna memilih **Reschedule** atau **Tidak ditemui**, layanan memperbarui status/catatan; Reschedule juga mengubah tanggal dan waktu jadwal.

Perhitungan jarak dilakukan di backend menggunakan rumus Haversine. Pemeriksaan di server tetap menjadi penentu; pemeriksaan GPS di browser membantu memberi umpan balik sebelum permintaan dikirim.

### Saat mencari lokasi dan rute

1. Form nasabah dapat mencari alamat menggunakan Google Geocoding jika API key diatur, atau Nominatim/OpenStreetMap.
2. Pengguna dapat memeriksa dan memilih pin pada peta.
3. Aplikasi dapat menggunakan GPS browser sebagai lokasi asal.
4. Untuk garis rute jalan di dalam aplikasi, frontend meminta OSRM menghitung rute.
5. Tautan Google Maps/OpenStreetMap juga dapat dibuka untuk melihat lokasi atau navigasi di layanan peta tersebut.

Pencarian alamat/rute membutuhkan koneksi internet. Lokasi browser biasanya memerlukan izin pengguna dan konteks `localhost` atau HTTPS.

## 7. Tabel dan kontrol akses Supabase

| Tabel/objek | Fungsi |
|---|---|
| `profiles` | Profil pengguna, role (`admin`/`rm`), approval, dan wilayah. |
| `nasabahs` | Satu sumber data nasabah dengan koordinat dan soft delete. |
| `jadwal_kunjungans` | Jadwal, penanggung jawab, status, check-in, dan dua referensi foto. |
| `jadwal_history` | Riwayat perubahan jadwal dan reschedule. |
| `follow_ups` | Pengingat tindak lanjut yang terpisah dari realisasi kunjungan. |
| `audit_logs` | Aktivitas sistem yang dapat dibaca Admin sesuai RLS. |
| Storage `visit-evidence` | Berkas foto bukti kunjungan. |

Admin dapat memantau jadwal lintas RM sesuai RLS; setiap RM hanya dapat membaca dan mengelola jadwal miliknya. RM yang sudah disetujui dapat membaca basis nasabah bersama di aplikasi KCP Iskandar, sedangkan pengubahan nasabah tetap terbatas pada pembuatnya dan Admin. Akses baca nasabah bersama diterapkan oleh migrasi `20261103000001_allow_approved_rms_to_read_shared_customers.sql`; jangan gunakan konfigurasi ini untuk deployment multi-cabang tanpa pembatasan cabang.

## 8. Cara menjalankan di komputer lokal

Atur URL proyek Supabase dan anon key di `.env` lokal:

```powershell
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Jalankan frontend:

```powershell
npm install
npm run dev
```

Jangan menambahkan Service Role Key ke variabel `VITE_*` atau bundle frontend. Jalankan migrasi Supabase sesuai urutan pada `supabase/migrations/` setelah meninjau dampaknya dan memastikan proyek tujuan yang benar.

## 9. Pemeriksaan proyek

Dari folder frontend:

```powershell
npm run lint
npm run build
```

- `lint` memeriksa masalah gaya dan pola kode JavaScript/JSX.
- `build` membuat berkas frontend siap produksi di folder `dist/`.

## 10. Batasan dan hal yang perlu dipahami

- Operasi data utama menggunakan Supabase Auth dan RLS. Pastikan migrasi/policy aktif pada proyek sebelum menggunakan data operasional.
- Nomor rekening ditampilkan tersamarkan di daftar, tetapi penyimpanan database belum menerapkan enkripsi khusus. Penyamaran di layar bukan enkripsi.
- Foto lokasi dan dokumentasi disimpan dalam field terpisah. Hak akses bucket Storage harus ditinjau sebelum menyimpan dokumentasi nasabah yang sebenarnya.
- Pengingat saat ini berupa informasi di dalam aplikasi; belum mengirim notifikasi ke perangkat.
- Peta dan geocoding mengirim alamat/koordinat ke penyedia layanan eksternal yang dipilih. Rute jalan menggunakan layanan OSRM publik.
- Metrik mingguan memisahkan jadwal berdasarkan tanggal jadwal aktif dari realisasi berdasarkan status Selesai/check-in. Reschedule mengubah tanggal jadwal saat ini; histori tanggal sebelumnya tersedia pada `jadwal_history`.
- Aplikasi hanya untuk perencanaan, lokasi, check-in, hasil, dokumentasi, dan monitoring kunjungan—bukan Laporan Harian RM, pencatatan target uang, nominal kredit, atau pencairan.
