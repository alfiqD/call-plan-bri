# Panduan Migrasi, Keamanan, & Deployment CallPlan

Dokumen ini adalah panduan teknis bagi Software Architect, Database Engineer, dan DevOps dalam mengelola sistem CallPlan berbasis **React + Supabase PostgreSQL + Vercel**.

---

## 1. Skema Database & Relasi (PostgreSQL)

Database menggunakan PostgreSQL yang di-host pada Supabase. Seluruh skema telah dikonversi dari SQLite lama ke skema relasional yang aman dengan constraint, timezone eksplisit (`TIMESTAMPTZ`), dan foreign key berjenjang.

### Diagram Relasi Entitas (ERD)

```text
┌──────────────────────┐           ┌──────────────────────┐
│      auth.users      │           │    public.nasabahs   │
└──────────┬───────────┘           └──────────┬───────────┘
           │ 1:1                                  │ 1:N
           ▼                                      │
┌──────────────────────┐                          │
│   public.profiles    │                          │
├──────────────────────┤                          │
│ id (PK, UUID)        │                          │
│ nama, email          │                          │
│ role (rm/spv/admin)  │                          │
│ status (pnd/app/rej) │                          │
└──────────┬───────────┘                          │
           │ 1:N (rm_id)                          │ (nasabah_id)
           ▼                                      ▼
┌─────────────────────────────────────────────────────────┐
│                public.jadwal_kunjungans                 │
├─────────────────────────────────────────────────────────┤
│ id (PK, BIGINT IDENTITY)                                │
│ nasabah_id (FK -> nasabahs.id)                          │
│ rm_id (FK -> profiles.id)                               │
│ tanggal (DATE), waktu (TIME), tujuan                    │
│ prioritas (normal/tinggi), status                       │
│ catatan_hasil (TEXT)                                    │
│ check_in_at, check_in_latitude, check_in_longitude      │
│ check_in_accuracy, check_in_distance_meters             │
└──────────┬──────────────────────────────────────────────┘
           │ 1:N
           ▼
┌──────────────────────┐           ┌──────────────────────┐
│ public.jadwal_history│           │  public.audit_logs   │
├──────────────────────┤           ├──────────────────────┤
│ id, jadwal_id (FK)   │           │ id, actor_id (FK)    │
│ changed_by (FK)      │           │ action, entity_type  │
│ previous_status      │           │ entity_id, metadata  │
│ new_status, notes    │           │ created_at           │
└──────────────────────┘           └──────────────────────┘
           ▲
           │ (nullable jadwal_kunjungan_id)
┌─────────────────────────────────────────────────────────┐
│                    public.follow_ups                    │
├─────────────────────────────────────────────────────────┤
│ id (PK, BIGINT IDENTITY)                                │
│ nasabah_id (FK -> nasabahs.id)                          │
│ jadwal_kunjungan_id (FK -> jadwal_kunjungans.id, null)  │
│ rm_id (FK -> profiles.id)                               │
│ tanggal_follow_up (DATE), waktu_follow_up (TIME)        │
│ jenis_tindak_lanjut, prioritas, status                  │
│ catatan (TEXT), hasil_tindak_lanjut (TEXT)              │
│ completed_at (TIMESTAMPTZ)                              │
└─────────────────────────────────────────────────────────┘
```

### Rincian Tabel:
1. **`public.profiles`**: Terhubung secara langsung dengan `auth.users(id)` melalui trigger `on_auth_user_created`. Menyimpan data `nama`, `email`, `role`, dan `status`.
2. **`public.nasabahs`**: Data nasabah dengan dukungan `deleted_at` (soft-delete), koordinat `latitude` dan `longitude` (tipe `NUMERIC(10, 7)`), serta `no_rekening` bertipe string untuk mempertahankan angka nol di awal rekening.
3. **`public.jadwal_kunjungans`**: Agenda kunjungan. Mengikat relasi ke `nasabah_id` dan `rm_id`. Menampung log check-in GPS terverifikasi.
4. **`public.jadwal_history`**: Audit trail khusus perubahan jadwal (reschedule, perubahan status, catatan).
5. **`public.audit_logs`**: Log audit keamanan aktivitas sistem (pendaftaran akun, persetujuan, check-in, dan penghapusan).
6. **`public.follow_ups`**: Agenda reminder tindak lanjut pasca-kunjungan atau mandiri. Menghubungkan nasabah, RM, dan jadwal kunjungan asal (opsional) lengkap dengan RLS multi-tenant per RM.

---

## 2. Matriks Hak Akses & Role (RBAC)

CallPlan menerapkan dua role utama yang dilindungi secara ketat di level PostgreSQL Row Level Security (RLS) dan fungsi database (`SECURITY DEFINER`):

| Tindakan Operasional | RM (Approved) | Admin (Approved) | Pending / Rejected |
|---|:---:|:---:|:---:|
| Melihat Nasabah (`SELECT nasabahs`) | ✅ | ✅ | ❌ Ditolak |
| Menambah Nasabah (`INSERT nasabahs`) | ✅ | ✅ | ❌ Ditolak |
| Mengubah Nasabah (`UPDATE nasabahs`) | ✅ | ✅ | ❌ Ditolak |
| Menghapus Nasabah (`DELETE nasabahs`) | ❌ *(Terkunci)* | ✅ | ❌ Ditolak |
| Melihat Jadwal Kunjungan | ✅ (Hanya miliknya) | ✅ (Semua RM/Tim) | ❌ Ditolak |
| Membuat Jadwal Kunjungan | ✅ (Hanya untuk diri) | ✅ (Bisa tugaskan RM) | ❌ Ditolak |
| Check-in GPS Lapangan (`check_in_visit`) | ✅ (Jadwal miliknya) | ✅ | ❌ Ditolak |
| Reschedule Jadwal (`reschedule_visit`) | ✅ (Jadwal miliknya) | ✅ | ❌ Ditolak |
| Melihat & Mengelola Follow-up | ✅ (Hanya miliknya) | ✅ (Semua RM/Tim) | ❌ Ditolak |
| Riwayat Follow-up Nasabah | ✅ (Follow-up miliknya) | ✅ (Semua RM) | ❌ Ditolak |
| Melihat Log Audit (`audit_logs`) | ❌ | ✅ | ❌ Ditolak |
| Menyetujui Akun RM Baru (`admin_approve_user`) | ❌ | ✅ | ❌ Ditolak |
| Mengubah Role Pengguna (Admin <-> RM) | ❌ | ✅ | ❌ Ditolak |

> [!IMPORTANT]
> Pengguna yang baru mendaftar (`status = 'pending'`) **tidak memiliki izin** membaca baris apa pun pada tabel nasabah, jadwal kunjungan, maupun follow-up. Kebijakan ini diberlakukan langsung oleh PostgreSQL engine (RLS), bukan sekadar penyembunyian tombol di antarmuka React.

---

## 3. Langkah Menjalankan Migration di Supabase

Semua berkas migration telah disiapkan di folder `supabase/migrations/`:
1. `20261028000001_initial_schema.sql` (Tabel, relasi, constraint, indeks)
2. `20261028000002_functions_and_rpc.sql` (Trigger pendaftaran, fungsi Haversine, RPC check-in, dashboard summary)
3. `20261028000003_rls_policies.sql` (Aturan keamanan Row Level Security)
4. `20261029000001_simplify_to_two_roles.sql` (Penyederhanaan menjadi 2 Role: Admin & RM)
5. `20261029000002_create_follow_ups.sql` (Tabel Follow-ups, foreign key, index, dan RLS policies)
6. `seed.sql` (Data awal contoh opsional)

### Cara Eksekusi melalui Supabase Dashboard:
1. Buka proyek Anda di [Supabase Dashboard](https://supabase.com/dashboard).
2. Di bilah menu samping kiri, klik **SQL Editor**.
3. Klik **New query**, lalu salin dan tempelkan isi berkas secara berurutan:
   - Tempel isi `20261028000001_initial_schema.sql` -> Klik **Run**.
   - Tempel isi `20261028000002_functions_and_rpc.sql` -> Klik **Run**.
   - Tempel isi `20261028000003_rls_policies.sql` -> Klik **Run**.
   - Tempel isi `20261029000001_simplify_to_two_roles.sql` -> Klik **Run**.
   - Tempel isi `20261029000002_create_follow_ups.sql` -> Klik **Run**.
4. (Opsional) Tempel isi `seed.sql` jika ingin mengunggah data nasabah contoh Bandung.

---

## 4. Prosedur Bootstrap Akun Admin Awal Secara Aman

Demi mematuhi prinsip *Least Privilege* dan mencegah *privilege escalation*, sistem tidak memiliki akun admin dengan password hardcoded.

Ikuti prosedur bootstrap berikut untuk membuat Admin pertama:
1. Buka aplikasi web CallPlan Anda (atau di halaman pendaftaran), lalu daftarkan akun email untuk Admin (misalnya: `admin.callplan@bri.co.id`).
2. Sebagai alternatif, buka **Supabase Dashboard** -> **Authentication** -> **Users** -> Klik **Add user** -> Masukkan email dan password.
3. Setelah user dibuat di Supabase Auth, buka **SQL Editor** di Supabase Dashboard dan jalankan kueri berikut untuk mengangkat akun tersebut menjadi Administrator:
   ```sql
   UPDATE public.profiles
   SET role = 'admin',
       status = 'approved',
       approved_at = timezone('utc'::text, now())
   WHERE email = 'admin.callplan@bri.co.id';
   ```
4. Selesai. Masuk ke aplikasi dengan akun tersebut. Anda akan melihat menu **Kelola Akun (Admin)** di sidebar untuk menyetujui akun RM lainnya.

---

## 5. Prosedur Migrasi Data dari SQLite Lama

Script otomatis telah tersedia di [`scripts/migrate_sqlite_to_supabase.js`](file:///c:/SEMESTER%205%20ALFIQ/Tracking%20Nasabah/Call-Plan/scripts/migrate_sqlite_to_supabase.js).

### Langkah Menjalankan:
1. Buka terminal di folder `Call-Plan`.
2. Jalankan dry-run untuk memastikan seluruh data SQLite lama terbaca dan terverifikasi:
   ```sh
   node scripts/migrate_sqlite_to_supabase.js --dry-run
   ```
   *Output yang diharapkan:* `✅ 14 data nasabah siap diproses. ✅ 5 data jadwal siap diproses.`
3. Ambil `User ID (UUID)` dari akun RM di Supabase Anda (bisa dilihat di dashboard Supabase Authentication).
4. Jalankan migrasi live:
   ```sh
   node scripts/migrate_sqlite_to_supabase.js --live --assigned-rm-id=<UUID-RM-ANDA>
   ```

---

## 6. Prosedur Deployment ke Vercel

Frontend CallPlan telah dilengkapi berkas konfigurasi [`vercel.json`](file:///c:/SEMESTER%205%20ALFIQ/Tracking%20Nasabah/Call-Plan/vercel.json) dengan SPA rewrites dan header keamanan:
- `X-Frame-Options: DENY` (Mencegah serangan Clickjacking).
- `X-Content-Type-Options: nosniff` (Mencegah MIME-type sniffing).
- `Referrer-Policy: strict-origin-when-cross-origin`.
- `Permissions-Policy: geolocation=(self)` (Mengizinkan akses GPS akurat untuk check-in).

### Langkah Deploy:
1. Push branch proyek `Call-Plan` ke repositori Git Anda (GitHub/GitLab/Bitbucket).
2. Kunjungi [vercel.com](https://vercel.com) dan login.
3. Klik **Add New Project** -> Pilih repositori `Call-Plan`.
4. Pada bagian **Build and Output Settings**, pastikan framework terdeteksi sebagai **Vite**.
5. Pada bagian **Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`: `https://[ID-PROJECT-ANDA].supabase.co`
   - `VITE_SUPABASE_ANON_KEY`: `[ANON-KEY-PUBLIK-ANDA]`
   - `VITE_GOOGLE_MAPS_API_KEY`: *(Kosongkan jika menggunakan OpenStreetMap)*
6. Klik **Deploy**.
7. Setelah deployment berhasil, salin domain Vercel yang diberikan (misalnya `https://callplan-bri.vercel.app`).
8. Buka **Supabase Dashboard** -> **Authentication** -> **URL Configuration**:
   - Isi **Site URL**: `https://callplan-bri.vercel.app`
   - Tambahkan pada **Redirect URLs**:
     * `https://callplan-bri.vercel.app/**`
     * `http://localhost:5173/**` (untuk pengujian lokal)
9. Simpan perubahan. Sistem CallPlan kini online, aman, dan dapat diakses dari browser mana pun!

---

## 7. Status Fitur & Kriteria Selesai

| Fitur / Komponen | Status Implementasi | Keterangan |
|---|:---:|---|
| **Pemisahan dari Laravel** | ✅ Selesai | Jalur data utama dialihkan sepenuhnya ke Supabase PostgreSQL & RPC. |
| **Supabase Authentication** | ✅ Selesai | Login, Register, Forgot Password, Logout, dan Session Persistence. |
| **Persetujuan Akun (Approval Gate)** | ✅ Selesai | Akun baru otomatis pending; dilindungi `PendingApprovalPage` & RLS. |
| **Pengelolaan Akun Admin** | ✅ Selesai | Halaman `AdminUsersPage` untuk menyetujui RM, Supervisor, dan Admin. |
| **Skema Database & Indeks** | ✅ Selesai | Migration 1, 2, 3 lengkap dengan tabel, relasi, audit log, dan indeks. |
| **Validasi Check-In GPS (Haversine)** | ✅ Selesai | Terverifikasi di level server melalui fungsi `check_in_visit` radius 100m. |
| **Deteksi Tabrakan Jadwal** | ✅ Selesai | Peringatan jadwal bentrok jika RM memiliki agenda di jam yang sama. |
| **Pertahanan CSV Injection** | ✅ Selesai | Sanitasi cell Excel dari karakter berbahaya (`=`, `+`, `-`, `@`). |
| **Migrasi Script SQLite** | ✅ Selesai | Script `migrate_sqlite_to_supabase.js` dengan dry-run & live mode. |
| **Konfigurasi Vercel** | ✅ Selesai | `vercel.json` dengan rewrite SPA dan HTTP security headers. |
| **Pengujian Otomatis (QA)** | ✅ Selesai | 25 test suite passed (`npm test`). |
| **Pemeriksaan Lint & Build** | ✅ Selesai | `npm run lint` (0 error), `npm run build` (sukses). |

---

### Langkah Manual yang Masih Memerlukan Anda:
1. **Membuat Project di [Supabase.com](https://supabase.com)** (gratis).
2. **Menjalankan file SQL migration** di menu *SQL Editor* Supabase Dashboard (lihat Bagian 3).
3. **Mengisi nilai sebenarnya pada file `.env` lokal** (`VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY`).
4. **Mendaftarkan akun Admin pertama dan menjalankan kueri bootstrap SQL** (lihat Bagian 4).
5. **Menghubungkan repositori ke Vercel untuk deployment produksi** (lihat Bagian 6).
