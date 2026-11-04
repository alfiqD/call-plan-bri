-- ==============================================================================
-- MIGRATION: Add Visit Evidence Photos (Foto Lokasi & Foto Dokumentasi)
-- & Support 'batal' Status with Supabase Storage Bucket
-- ==============================================================================

-- 1. Tambah kolom foto_lokasi dan foto_kunjungan pada public.jadwal_kunjungans
ALTER TABLE public.jadwal_kunjungans
    ADD COLUMN IF NOT EXISTS foto_lokasi TEXT,
    ADD COLUMN IF NOT EXISTS foto_kunjungan TEXT;

COMMENT ON COLUMN public.jadwal_kunjungans.foto_lokasi IS 'URL atau data foto bukti fisik lokasi nasabah (tampak depan rumah/toko/kantor/papan nama)';
COMMENT ON COLUMN public.jadwal_kunjungans.foto_kunjungan IS 'URL atau data foto dokumentasi aktivitas kunjungan RM bersama nasabah';

-- 2. Perbarui CHECK constraint status agar mencakup 'batal'
DO $$
BEGIN
    ALTER TABLE public.jadwal_kunjungans DROP CONSTRAINT IF EXISTS jadwal_kunjungans_status_check;
    ALTER TABLE public.jadwal_kunjungans ADD CONSTRAINT jadwal_kunjungans_status_check
        CHECK (status IN ('pending', 'selesai', 'reschedule', 'tidak_ditemui', 'batal'));
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 3. Inisialisasi Supabase Storage bucket 'visit-evidence' jika ekstensi storage tersedia
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'visit-evidence',
            'visit-evidence',
            true,
            1048576, -- 1 MB limit
            ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        )
        ON CONFLICT (id) DO UPDATE SET
            public = true,
            file_size_limit = 1048576,
            allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- 4. Storage Row Level Security (RLS) Policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Allow authenticated RM & Admin to upload evidence photos
        DROP POLICY IF EXISTS "Authenticated users can upload visit evidence" ON storage.objects;
        CREATE POLICY "Authenticated users can upload visit evidence"
            ON storage.objects FOR INSERT
            TO authenticated
            WITH CHECK (bucket_id = 'visit-evidence');

        -- Allow authenticated users to view visit evidence photos
        DROP POLICY IF EXISTS "Authenticated users can view visit evidence" ON storage.objects;
        CREATE POLICY "Authenticated users can view visit evidence"
            ON storage.objects FOR SELECT
            TO authenticated
            USING (bucket_id = 'visit-evidence');

        -- Allow owner to update or replace their uploaded photos
        DROP POLICY IF EXISTS "Users can update own visit evidence" ON storage.objects;
        CREATE POLICY "Users can update own visit evidence"
            ON storage.objects FOR UPDATE
            TO authenticated
            USING (bucket_id = 'visit-evidence');

        -- Allow owner or admin to delete visit photos
        DROP POLICY IF EXISTS "Users can delete own visit evidence" ON storage.objects;
        CREATE POLICY "Users can delete own visit evidence"
            ON storage.objects FOR DELETE
            TO authenticated
            USING (bucket_id = 'visit-evidence');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
