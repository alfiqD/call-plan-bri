# CallPlan — Sistem Penjadwalan Kunjungan

Prototipe frontend untuk membantu Relationship Manager merencanakan jadwal dan lokasi kunjungan nasabah, mencatat check-in, serta merangkum riwayat aktivitas.

## Fitur

- Dashboard ringkasan jadwal hari ini, kunjungan selesai, dan jadwal ulang.
- CRUD data nasabah prospek/debitur, termasuk kontak, nomor rekening opsional, alamat, dan status pinjaman.
- Call plan dengan kalender bulanan, daftar jadwal, prioritas rute, dan pengingat agenda terdekat.
- Check-in dengan status hasil, catatan pertemuan, jadwal ulang, dan unggah foto bukti.
- Riwayat kunjungan dengan filter rentang tanggal dan status; ekspor CSV yang dapat dibuka di Excel serta cetak ke PDF melalui dialog cetak browser.

## Batas ruang lingkup

Aplikasi ini berfokus pada waktu, jadwal, lokasi, dan aktivitas kunjungan. Tidak ada pencatatan target uang, nominal kredit, atau pengelolaan pencairan. Pengingat ditampilkan di dalam aplikasi; pengiriman notifikasi perangkat belum terhubung ke layanan backend.

## Struktur kode

```text
src/
├── components/
│   ├── AppShell.jsx
│   ├── Sidebar.jsx
│   ├── Modal.jsx
│   ├── StatusBadge.jsx
│   ├── AppointmentForm.jsx
│   ├── CustomerForm.jsx
│   ├── LocationMap.jsx
│   ├── RouteMapModal.jsx
│   └── VisitUpdateModal.jsx
├── data/
│   └── workspace.js
├── services/
│   ├── jadwalKunjungan.js
│   └── mapRouting.js
├── pages/
│   ├── DashboardPage.jsx
│   ├── CustomersPage.jsx
│   ├── SchedulePage.jsx
│   └── ReportsPage.jsx
├── App.jsx
├── index.css
└── main.jsx
```

Halaman di dalam `pages/` dimuat menggunakan `React.lazy` dan `Suspense`. UI menggunakan Tailwind CSS v4 melalui plugin Vite, dengan aturan CSS global dan komponen form kecil di `src/index.css`.

## Menjalankan aplikasi

```sh
npm install
npm run dev
```

Untuk menghubungkan check-in ke Laravel, salin `.env.example` menjadi `.env` di root frontend:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api
VITE_GOOGLE_MAPS_API_KEY=
```

Untuk memakai Google Maps interaktif dan pencarian alamat Google, isi `VITE_GOOGLE_MAPS_API_KEY` di `.env` lokal. Aktifkan **Maps JavaScript API** dan **Geocoding API**, billing, serta batasi key dengan HTTP referrer untuk origin aplikasi dan API Google yang diperlukan. Key frontend dapat dilihat pengguna di browser; jangan memakai key tanpa pembatasan. Restart Vite setelah mengubah `.env`. Tanpa key, pilih OpenStreetMap untuk mencari alamat dan memilih titik; tautan Google Maps untuk melihat lokasi/rute tetap tersedia.

Alamat yang diketik dicari saat kolom alamat ditinggalkan menggunakan penyedia yang dipilih. Klik peta untuk menyimpan pin dan mengisi alamat dari Google Maps atau OpenStreetMap. Dialog peta dan halaman rute menyediakan tautan Google Maps; tautan rute dapat memakai koordinat pin atau alamat bila pin belum tersedia. **Buat rute dari lokasi saya** menampilkan rute jalan di dalam aplikasi melalui OSRM publik. Layanan peta/geocoding mengirim alamat atau koordinat ke penyedia yang dipilih. Gunakan data demo saja sampai kebijakan keamanan/data Bank menyetujui penyedia layanan ini.

Browser perlu izin lokasi dan akses melalui `localhost` atau HTTPS. Laravel tetap menjadi pihak yang memvalidasi check-in dalam radius 100 meter berdasarkan koordinat nasabah dan RM.

Pemeriksaan kode dan build produksi:

```sh
npm run lint
npm run build
```

## Penyimpanan dan batasan

Data nasabah dan jadwal diambil dari database Laravel. Nomor rekening disimpan sebagai teks agar angka nol di depan tetap terjaga, dan ditampilkan tersamarkan pada daftar nasabah. Nomor rekening merupakan data sensitif: database saat ini belum menerapkan enkripsi khusus untuk nomor rekening dan endpoint pengelolaan belum memiliki autentikasi atau otorisasi RM. Foto bukti masih sebatas state antarmuka dan belum dikirim ke API. Jangan gunakan nomor rekening atau data nasabah nyata sampai keamanan API, enkripsi, dan kebijakan data Bank telah disetujui.
