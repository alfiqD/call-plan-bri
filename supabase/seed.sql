-- ==============================================================================
-- SEED DATA & BOOTSTRAPPING FOR CALLPLAN (Supabase)
-- ==============================================================================

-- Catatan Keamanan:
-- Akun Admin awal HARUS didaftarkan terlebih dahulu melalui antarmuka Supabase Auth
-- (atau dashboard Supabase > Authentication > Users > Add User).
-- Setelah user terdaftar, jalankan perintah di bawah ini untuk mengangkat user menjadi Admin:
--
-- UPDATE public.profiles
-- SET role = 'admin', status = 'approved', approved_at = now()
-- WHERE email = 'admin.callplan@bri.co.id';

-- Contoh Data Nasabah Sintetis (Demo untuk Bandung)
INSERT INTO public.nasabahs (
    id, nama, alamat, no_hp, no_rekening, kategori, status_pinjaman, latitude, longitude
) VALUES
(1, 'Budi Santoso', 'Jl. Merdeka No. 18, Bandung', '081234567890', '001201098765432', 'Debitur', 'Aktif', -6.9174640, 107.6191230),
(2, 'Siti Rahmawati', 'Jl. Cempaka No. 7, Bandung', '081322334455', NULL, 'Prospek', 'Belum ada pinjaman', -6.9147440, 107.6098100),
(3, 'Andi Wijaya', 'Komplek Puri Asri Blok C2, Bandung', '082166778899', '001201012345678', 'Debitur', 'Aktif', -6.9200000, 107.6250000),
(4, 'Dewi Anggraini', 'Jl. Sukajadi No. 42, Bandung', '085711223344', NULL, 'Prospek', 'Dalam pengajuan', -6.8850000, 107.5950000),
(5, 'Rudi Hermawan', 'Jl. Setiabudi No. 120, Bandung', '081955001234', '001201055443322', 'Debitur', 'Perlu tindak lanjut', -6.8600000, 107.5900000),
(6, 'Maya Puspita', 'Jl. Gegerkalong Hilir No. 9, Bandung', '087890801020', NULL, 'Prospek', 'Belum ada pinjaman', -6.8720000, 107.5850000)
ON CONFLICT (id) DO NOTHING;

-- Set identity sequence to max id
SELECT setval('public.nasabahs_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.nasabahs));
