# CallPlan — Sistem Penjadwalan & Tracking Kunjungan Nasabah

Aplikasi web online modern untuk Relationship Manager (RM) dan Administrator Bank untuk merencanakan call plan kunjungan nasabah, memetakan rute lokasi, mencatat check-in berbasis validasi GPS (radius 100 meter), serta merangkum pelaporan aktivitas lapangan.

Proyek ini telah dimigrasikan dari arsitektur lokal React + Laravel REST API (SQLite) menjadi arsitektur cloud serverless berbasis **React + Vite + Tailwind CSS v4**, **Supabase PostgreSQL**, **Supabase Auth**, dan siap di-deploy ke **Vercel**.

---

## 1. Arsitektur Sistem

```text
Pengguna (Browser Desktop & Mobile)
   │
   ▼
Frontend React + Vite (Di-deploy ke Vercel via CDN HTTPS)
   │
   ├─► Supabase Auth (Email/Password, Session Persistence, PKCE Flow)
   │
   ├─► Row Level Security (RLS) & PostgreSQL RPC Functions:
   │   ├── check_in_visit()      -> Validasi Haversine GPS <= 100m di server
   │   ├── reschedule_visit()    -> Perubahan jadwal terkontrol & audit trail
   │   ├── mark_visit_unmet()    -> Pencatatan status tidak ditemui
   │   ├── get_dashboard_summary()-> Agregasi statistik di level database
   │   └── admin_approve_user()  -> Approval akun & penetapan role Admin / RM
   │
   └─► Layanan Peta & Geospasial:
       ├── OpenStreetMap (Leaflet) / Google Maps interaktif
       ├── Nominatim OSM (Pencarian alamat & reverse geocoding Indonesia)
       └── OSRM (Rute jalan, jarak, dan estimasi waktu berkendara)
```

---

## 2. Fitur Utama

1. **Autentikasi & Otorisasi Berjenjang (RBAC & RLS)**:
   - Login, pendaftaran akun baru, reset password melalui email via Supabase Auth.
   - Pendaftaran akun publik secara default memperoleh status **Menunggu Persetujuan Admin (Pending)** demi melindungi data perbankan.
   - Hak akses database dilindungi PostgreSQL Row Level Security (RLS) pada tabel `profiles`, `nasabahs`, `jadwal_kunjungans`, `jadwal_history`, dan `audit_logs`.
   - Role yang tersedia:
     * **Admin**: Menyetujui pendaftaran RM baru, mengelola akses pengguna, menghapus nasabah, dan audit log sistem.
     * **RM (Relationship Manager)**: Mengelola nasabah, membuat jadwal, dan mencatat kunjungan GPS lapangan.
2. **Dashboard Operasional**:
   - Menampilkan total agenda hari ini, kunjungan selesai, jadwal ulang, dan sisa pending.
   - Data ringkasan tersinkronisasi langsung dengan fungsi agregasi server `get_dashboard_summary()`.
   - Agenda hari ini dengan aksi cepat Check-In dan panel rute prioritas.
3. **Data Nasabah (CRUD & Keamanan Data)**:
   - Pengelolaan nasabah prospek & debitur lengkap dengan status pinjaman, kontak, alamat, dan titik koordinat.
   - Nomor rekening opsional disimpan sebagai teks (menjaga angka nol di depan) dan disamarkan di layar (`•••• 1234`).
   - Fitur hapus menggunakan soft-delete (`deleted_at`) agar riwayat audit masa lalu tetap terjaga.
4. **Call Plan & Kalender Kunjungan**:
   - Tampilan kalender 42-sel responsif dan mode daftar jadwal.
   - Deteksi otomatis jadwal bentrok pada jam dan tanggal yang sama untuk RM bersangkutan.
   - Pemilihan rute prioritas (Tinggi / Normal).
5. **Validasi Check-In Lapangan (GPS)**:
   - Validasi jarak dilakukan di level database PostgreSQL melalui rumus Haversine (`check_in_visit`).
   - Batas toleransi radius default 100 meter dari titik nasabah.
   - Proteksi idempotency dan row-locking (`FOR UPDATE`) untuk mencegah double check-in atau race condition.
   - Riwayat check-in mencatat waktu server, koordinat, estimasi akurasi GPS, dan jarak terhitung.
6. **Riwayat Aktivitas & Laporan**:
   - Filter aktivitas berdasarkan rentang tanggal, status kunjungan, dan kata kunci.
   - Ekspor data ke file Excel (CSV) yang telah dilindungi dari serangan **CSV / Formula Injection**.
   - Cetak laporan ke format PDF melalui dialog cetak browser dengan layout khusus `@media print`.
7. **Pengelolaan Akun Tim (Admin)**:
   - Halaman khusus Admin untuk meninjau pengguna baru, menyetujui akun sebagai RM/Supervisor, mengangkat Admin, atau menolak akses akun.

---

## 3. Struktur Direktori Proyek

```text
Call-Plan/
├── supabase/
│   ├── migrations/
│   │   ├── 20261028000001_initial_schema.sql      # Skema tabel profiles, nasabahs, jadwal, logs
│   │   ├── 20261028000002_functions_and_rpc.sql    # Trigger user, Haversine RPC, check-in, dashboard
│   │   └── 20261028000003_rls_policies.sql        # Kebijakan Row Level Security (RLS)
│   └── seed.sql                                   # Data contoh & panduan bootstrap Admin awal
├── scripts/
│   └── migrate_sqlite_to_supabase.js              # Tool migrasi otomatis SQLite -> Supabase
├── test/
│   ├── haversine.test.js                          # Pengujian rumus GPS Haversine radius 100m
│   ├── csv-export.test.js                         # Pengujian keamanan sanitasi CSV Formula Injection
│   ├── auth-roles.test.js                         # Pengujian matriks RBAC & approval status
│   └── schedule-conflict.test.js                  # Pengujian deteksi tabrakan jadwal RM
├── src/
│   ├── components/                                # AppShell, Sidebar, Modal, CustomerForm, Map, dll.
│   ├── context/                                   # AuthProvider, useAuth, authContextInstance
│   ├── data/                                      # Helper tanggal, workspace helpers
│   ├── pages/                                     # Dashboard, Customers, Schedule, Reports
│   │   ├── admin/AdminUsersPage.jsx               # Pengelolaan akun & approval (Admin)
│   │   └── auth/                                  # LoginPage, RegisterPage, ForgotPassword, PendingApproval
│   ├── services/                                  # supabase.js, jadwalKunjungan.js, geocoding.js, dll.
│   ├── App.jsx                                    # Router & state manager utama
│   └── main.jsx
├── vercel.json                                    # Konfigurasi SPA rewrite & HTTP security headers
├── .env.example                                   # Template variabel environment aman
└── package.json
```

---

## 4. Cara Menjalankan Secara Lokal

### Kebutuhan Perangkat Lunak
* **Node.js**: Versi 20.x atau 24.x LTS.
* **npm**: Versi 10.x atau lebih baru.
* Akun **Supabase** (gratis di [supabase.com](https://supabase.com)) untuk deployment database PostgreSQL & Auth.

### Langkah Instalasi
1. Masuk ke direktori frontend:
   ```sh
   cd "C:\SEMESTER 5 ALFIQ\Tracking Nasabah\Call-Plan"
   ```
2. Instal seluruh dependensi:
   ```sh
   npm install
   ```
3. Salin file environment:
   ```sh
   copy .env.example .env
   ```
4. Buka file `.env` dan isi kredensial proyek Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   ```
5. Jalankan server pengembangan lokal:
   ```sh
   npm run dev
   ```
6. Buka tautan di browser Anda (biasanya `http://localhost:5173`).

---

## 5. Pengujian & Quality Assurance (QA)

Jalankan seluruh pengujian otomatis bawaan:
```sh
npm test
```
*Hasil:* Menjalankan 25 skenario uji mandiri (Haversine GPS boundary 100m, sanitasi CSV Formula Injection, isolasi peran RBAC, dan tabrakan jadwal).

Jalankan pemeriksaan linting kode:
```sh
npm run lint
```

Jalankan verifikasi build bundle produksi:
```sh
npm run build
```

---

## 6. Prosedur Migrasi Data dari SQLite

Data nasabah dan jadwal kunjungan lama di file SQLite Laravel (`Call-Plan-API/database/database.sqlite`) dapat dimigrasikan ke Supabase PostgreSQL tanpa mengubah berkas SQLite lama:

1. **Uji Validasi (Dry Run)**:
   ```sh
   node scripts/migrate_sqlite_to_supabase.js --dry-run
   ```
2. **Migrasi Nyata (Live Migration)**:
   Pastikan variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` sudah terisi di `.env`, lalu jalankan:
   ```sh
   node scripts/migrate_sqlite_to_supabase.js --live --assigned-rm-id=<UUID-USER-RM-ANDA>
   ```

---

## 7. Panduan Deployment ke Vercel

1. Unggah kode ke repositori Git (GitHub / GitLab).
2. Buka dashboard [Vercel](https://vercel.com) dan pilih **Add New Project**.
3. Hubungkan repositori `Call-Plan`.
4. Masukkan **Environment Variables** di Vercel:
   * `VITE_SUPABASE_URL`: URL proyek Supabase Anda.
   * `VITE_SUPABASE_ANON_KEY`: Anon Key publik Supabase Anda.
   * `VITE_GOOGLE_MAPS_API_KEY`: (Opsional jika ingin menggunakan Google Maps).
5. Klik **Deploy**. Vercel akan otomatis membaca file `vercel.json` dan mem-build aplikasi dengan Vite.
6. Pada dashboard Supabase -> **Authentication** -> **URL Configuration**, tambahkan domain Vercel Anda (misal `https://callplan-bri.vercel.app`) pada bagian **Site URL** dan **Redirect URLs**.

Untuk panduan konfigurasi Supabase SQL dan bootstrap Admin awal secara rinci, lihat dokumen [PANDUAN-MIGRASI-DAN-DEPLOYMENT.md](file:///c:/SEMESTER%205%20ALFIQ/Tracking%20Nasabah/Call-Plan/PANDUAN-MIGRASI-DAN-DEPLOYMENT.md).
