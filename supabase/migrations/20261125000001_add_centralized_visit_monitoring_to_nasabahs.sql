-- ==============================================================================
-- MIGRATION: Monitoring Kunjungan Terpusat pada Tabel Nasabahs (Tahap A)
-- Bank BRI KCP Iskandar Palembang - e-VisitBRI
-- Timestamp: 20261125000001
-- ==============================================================================

-- 1. Tambah kolom ringkasan monitoring pada tabel public.nasabahs
ALTER TABLE public.nasabahs
    ADD COLUMN IF NOT EXISTS latest_visit_status VARCHAR(30) DEFAULT 'Belum Ada Jadwal',
    ADD COLUMN IF NOT EXISTS latest_visit_rm_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS latest_visit_date DATE,
    ADD COLUMN IF NOT EXISTS latest_status_changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS latest_status_updated_at TIMESTAMPTZ;

-- 2. Tambah constraint validasi nilai status (Scoped pada public.nasabahs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_constraint 
        WHERE conname = 'nasabahs_latest_visit_status_check'
          AND conrelid = 'public.nasabahs'::pg_catalog.regclass
    ) THEN
        ALTER TABLE public.nasabahs
            ADD CONSTRAINT nasabahs_latest_visit_status_check
            CHECK (latest_visit_status IN (
                'Belum Ada Jadwal',
                'pending',
                'execute',
                'selesai',
                'reschedule',
                'tidak_ditemui',
                'batal'
            ));
    END IF;
END $$;

-- 3. Tambah indeks untuk performa filter peta dan query sinkronisasi
CREATE INDEX IF NOT EXISTS idx_nasabahs_latest_visit_status 
    ON public.nasabahs(latest_visit_status);

CREATE INDEX IF NOT EXISTS idx_nasabahs_latest_visit_rm 
    ON public.nasabahs(latest_visit_rm_id);

CREATE INDEX IF NOT EXISTS idx_nasabahs_latest_visit_date 
    ON public.nasabahs(latest_visit_date DESC);

-- Indeks komposit performa tinggi untuk pencarian siklus hidup dan riwayat
CREATE INDEX IF NOT EXISTS idx_jadwal_monitoring_lookup 
    ON public.jadwal_kunjungans(nasabah_id, status, tanggal DESC);

CREATE INDEX IF NOT EXISTS idx_jadwal_history_actor_lookup 
    ON public.jadwal_history(jadwal_id, new_status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_jadwal_history_checkin_lookup 
    ON public.jadwal_history(jadwal_id, action_type, created_at DESC, id DESC);

-- ==============================================================================
-- 4. FUNGSI SINKRONISASI: Menghitung Ringkasan Kunjungan Nasabah
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_nasabah_visit_monitoring(p_nasabah_id BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_target_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_rm_pelaksana_id UUID := NULL;
    v_status_changed_by UUID := NULL;
    v_status_updated_at TIMESTAMPTZ := NULL;
    v_visit_date DATE := NULL;
    v_today DATE := (pg_catalog.timezone('Asia/Jakarta', pg_catalog.now()))::pg_catalog.date;
BEGIN
    IF p_nasabah_id IS NULL THEN
        RETURN;
    END IF;

    -- Baris nasabah dikunci (Row Lock) untuk serialisasi update konkuren
    PERFORM 1 FROM public.nasabahs WHERE id = p_nasabah_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Evaluasi jadwal paling representatif sesuai urutan siklus hidup bisnis
    SELECT j.* INTO v_target_jadwal
    FROM public.jadwal_kunjungans j
    WHERE j.nasabah_id = p_nasabah_id
    ORDER BY
        -- 1. Hierarki Status Siklus Hidup Kunjungan
        CASE 
            WHEN j.status = 'execute' THEN 1  -- Tahap administrasi aktif (prioritas tertinggi)
            WHEN j.status IN ('pending', 'reschedule') AND j.tanggal >= v_today THEN 2 -- Agenda aktif
            WHEN j.status IN ('selesai', 'tidak_ditemui') THEN 3  -- Hasil kunjungan
            WHEN j.status IN ('pending', 'reschedule') AND j.tanggal < v_today THEN 4  -- Agenda terlewat
            WHEN j.status = 'batal' THEN 5
            ELSE 6
        END ASC,
        -- 2. Tie-Breaker Tier 1 (Multiple Execute: utamakan check-in fisik terbaru)
        CASE 
            WHEN j.status = 'execute' THEN j.check_in_at 
            ELSE NULL 
        END DESC NULLS LAST,
        -- 3. Tie-Breaker Tier 2 (Agenda Aktif: jadwal terdekat yang akan datang)
        CASE 
            WHEN j.status IN ('pending', 'reschedule') AND j.tanggal >= v_today THEN j.tanggal 
            ELSE NULL 
        END ASC NULLS LAST,
        CASE 
            WHEN j.status IN ('pending', 'reschedule') AND j.tanggal >= v_today THEN j.waktu 
            ELSE NULL 
        END ASC NULLS LAST,
        -- 4. Tie-Breaker Tier 3 (Hasil Kunjungan): Waktu transisi status riil dari jadwal_history
        CASE 
            WHEN j.status IN ('selesai', 'tidak_ditemui') THEN (
                SELECT h.created_at 
                FROM public.jadwal_history h 
                WHERE h.jadwal_id = j.id 
                  AND h.new_status = j.status 
                ORDER BY h.created_at DESC, h.id DESC 
                LIMIT 1
            )
            ELSE NULL 
        END DESC NULLS LAST,
        -- 5. Fallback Tier 3/4/5 (Jika riwayat history tidak ada / legacy check-in)
        COALESCE(j.check_in_at, j.created_at) DESC NULLS LAST,
        j.tanggal DESC,
        j.waktu DESC,
        j.id DESC
    LIMIT 1;

    -- Jika nasabah tidak memiliki jadwal sama sekali
    IF NOT FOUND THEN
        UPDATE public.nasabahs
        SET latest_visit_status = 'Belum Ada Jadwal',
            latest_visit_rm_id = NULL,
            latest_visit_date = NULL,
            latest_status_changed_by = NULL,
            latest_status_updated_at = NULL
        WHERE id = p_nasabah_id;
        RETURN;
    END IF;

    -- Evaluasi RM Pelaksana: HANYA dari entri check-in fisik oleh akun role 'rm'
    -- (Berlaku untuk execute, selesai, dan tidak_ditemui jika ada bukti check-in fisik di lapangan)
    IF v_target_jadwal.status IN ('execute', 'selesai', 'tidak_ditemui') THEN
        SELECT h.changed_by INTO v_rm_pelaksana_id
        FROM public.jadwal_history h
        JOIN public.profiles p ON p.id = h.changed_by
        WHERE h.jadwal_id = v_target_jadwal.id
          AND h.action_type = 'check_in'
          AND p.role = 'rm'
        ORDER BY h.created_at DESC, h.id DESC
        LIMIT 1;
        -- Tanpa fallback rm_id: jika tidak ada catatan check-in RM terverifikasi, tetap NULL
    ELSE
        -- Status pending, reschedule, batal tidak memiliki pelaksana fisik
        v_rm_pelaksana_id := NULL;
    END IF;

    -- Evaluasi Aktor Pengubah Status Terakhir dari jadwal_history
    SELECT h.changed_by, h.created_at
    INTO v_status_changed_by, v_status_updated_at
    FROM public.jadwal_history h
    WHERE h.jadwal_id = v_target_jadwal.id
      AND h.new_status = v_target_jadwal.status
    ORDER BY h.created_at DESC, h.id DESC
    LIMIT 1;

    -- Evaluasi Waktu Perubahan Status jika entri jadwal_history tidak ada (Data Warisan)
    -- Catatan: updated_at sengaja TIDAK digunakan karena berubah saat edit non-status
    IF v_status_updated_at IS NULL THEN
        IF v_target_jadwal.check_in_at IS NOT NULL THEN
            v_status_updated_at := v_target_jadwal.check_in_at;
        ELSE
            v_status_updated_at := v_target_jadwal.created_at;
        END IF;
    END IF;

    -- Evaluasi Tanggal Kunjungan: utamakan tanggal check-in riil (WIB) jika tersedia
    IF v_target_jadwal.check_in_at IS NOT NULL THEN
        v_visit_date := (pg_catalog.timezone('Asia/Jakarta', v_target_jadwal.check_in_at))::pg_catalog.date;
    ELSE
        v_visit_date := v_target_jadwal.tanggal;
    END IF;

    -- Tulis pembaruan ringkasan ke baris nasabah
    UPDATE public.nasabahs
    SET latest_visit_status = v_target_jadwal.status,
        latest_visit_rm_id = v_rm_pelaksana_id,
        latest_visit_date = v_visit_date,
        latest_status_changed_by = v_status_changed_by,
        latest_status_updated_at = v_status_updated_at
    WHERE id = p_nasabah_id;
END;
$$;

-- Cabut hak eksekusi dari peran publik / klien HTTP PostgREST
REVOKE ALL ON FUNCTION public.sync_nasabah_visit_monitoring(BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_nasabah_visit_monitoring(BIGINT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_nasabah_visit_monitoring(BIGINT) TO postgres, service_role;

-- ==============================================================================
-- 5. TRIGGER FUNCTION & CONSTRAINT TRIGGER (DENGAN SAFE ORDERING)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trg_nasabah_visit_monitoring_sync()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.sync_nasabah_visit_monitoring(OLD.nasabah_id);
        RETURN OLD;
    ELSIF TG_OP = 'INSERT' THEN
        PERFORM public.sync_nasabah_visit_monitoring(NEW.nasabah_id);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.nasabah_id IS DISTINCT FROM NEW.nasabah_id THEN
            -- Mitigasi deadlock untuk mutasi 2 nasabah: kunci ID terkecil terlebih dahulu
            IF OLD.nasabah_id < NEW.nasabah_id THEN
                PERFORM public.sync_nasabah_visit_monitoring(OLD.nasabah_id);
                PERFORM public.sync_nasabah_visit_monitoring(NEW.nasabah_id);
            ELSE
                PERFORM public.sync_nasabah_visit_monitoring(NEW.nasabah_id);
                PERFORM public.sync_nasabah_visit_monitoring(OLD.nasabah_id);
            END IF;
        ELSE
            -- Hanya sinkronkan jika kolom monitoring operasional berubah
            IF OLD.status IS DISTINCT FROM NEW.status
               OR OLD.tanggal IS DISTINCT FROM NEW.tanggal
               OR OLD.waktu IS DISTINCT FROM NEW.waktu
               OR OLD.check_in_at IS DISTINCT FROM NEW.check_in_at
               OR OLD.rm_id IS DISTINCT FROM NEW.rm_id
            THEN
                PERFORM public.sync_nasabah_visit_monitoring(NEW.nasabah_id);
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_nasabah_visit_monitoring_sync() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_nasabah_visit_monitoring_sync() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_nasabah_visit_monitoring_sync() TO postgres, service_role;

-- Bersihkan trigger sebelumnya jika ada
DROP TRIGGER IF EXISTS trg_jadwal_sync_nasabah_monitoring ON public.jadwal_kunjungans;
DROP TRIGGER IF EXISTS trg_sync_nasabah_visit_monitoring ON public.jadwal_kunjungans;

-- Pasang Constraint Trigger yang ditunda hingga COMMIT transaksi
CREATE CONSTRAINT TRIGGER trg_sync_nasabah_visit_monitoring
AFTER INSERT OR UPDATE OR DELETE ON public.jadwal_kunjungans
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION public.trg_nasabah_visit_monitoring_sync();

-- ==============================================================================
-- 6. BACKFILL DATA NASABAH LAMA (DILAKUKAN SEBELUM REALTIME AKTIF)
-- ==============================================================================
DO $$
DECLARE
    v_nasabah_id BIGINT;
BEGIN
    -- Hanya backfill nasabah aktif (mengabaikan nasabah yang telah soft-deleted)
    FOR v_nasabah_id IN (
        SELECT id FROM public.nasabahs 
        WHERE deleted_at IS NULL 
        ORDER BY id ASC
    ) LOOP
        PERFORM public.sync_nasabah_visit_monitoring(v_nasabah_id);
    END LOOP;
END $$;

-- ==============================================================================
-- 7. PENDAFTARAN SUPABASE REALTIME (IDEMPOTEN, SETELAH BACKFILL TUNTAS)
-- ==============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_catalog.pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'nasabahs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.nasabahs;
    END IF;
END $$;
