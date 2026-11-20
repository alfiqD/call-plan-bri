-- ==============================================================================
-- MIGRATION: Penambahan Spesialisasi Jenis RM (RMFT & RMSME) pada Profiles
-- Bank BRI KCP Iskandar Palembang - e-VisitBRI
-- ==============================================================================

-- 1. Tambahkan kolom jenis_rm pada tabel public.profiles (NULLABLE)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS jenis_rm VARCHAR(10);

-- 2. Tambahkan constraint pengecekan nilai
--    Admin wajib bernilai NULL; RM bernilai 'RMFT', 'RMSME', atau NULL (akun lama sebelum migrasi)
ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_jenis_rm_check;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_jenis_rm_check
    CHECK (
        jenis_rm IS NULL OR jenis_rm IN ('RMFT', 'RMSME')
    );

COMMENT ON COLUMN public.profiles.jenis_rm IS 'Spesialisasi Relationship Manager: RMFT (Funding & Transaction) atau RMSME (Small Medium Enterprise). Bernilai NULL untuk Admin dan akun lama sebelum migrasi.';

-- 3. Perbarui trigger handle_new_user()
--    Mempertahankan 100% alur lama (pengambilan nama, pendaftar pertama jadi Admin, assigned_area, audit log, ON CONFLICT).
--    Wajib memvalidasi jenis_rm untuk pendaftaran RM baru ('RMFT' atau 'RMSME').
--    Pendaftar pertama otomatis menjadi Admin dengan jenis_rm = NULL.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nama TEXT;
    v_user_count INT;
    v_role VARCHAR(30) := 'rm';
    v_status VARCHAR(30) := 'pending';
    v_jenis_rm VARCHAR(10) := NULL;
BEGIN
    v_nama := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.raw_user_meta_data->>'nama'), ''),
        SPLIT_PART(NEW.email, '@', 1)
    );

    -- Akun pendaftar pertama otomatis menjadi Admin Aktif (Approved)
    SELECT COUNT(*) INTO v_user_count FROM public.profiles;

    IF v_user_count = 0 THEN
        v_role := 'admin';
        v_status := 'approved';
        v_jenis_rm := NULL; -- Admin tidak memiliki jenis RM
    ELSE
        -- Pendaftaran RM baru wajib memilih RMFT atau RMSME
        v_jenis_rm := NULLIF(TRIM(NEW.raw_user_meta_data->>'jenis_rm'), '');
        IF v_jenis_rm IS NULL OR v_jenis_rm NOT IN ('RMFT', 'RMSME') THEN
            RAISE EXCEPTION 'Pendaftaran RM wajib memilih jenis spesialisasi (RMFT atau RMSME).' USING ERRCODE = '22023';
        END IF;
    END IF;

    INSERT INTO public.profiles (
        id,
        nama,
        email,
        role,
        status,
        jenis_rm,
        assigned_area,
        approved_at
    ) VALUES (
        NEW.id,
        v_nama,
        NEW.email,
        v_role,
        v_status,
        v_jenis_rm,
        'Bandung',
        CASE WHEN v_status = 'approved' THEN timezone('utc'::text, now()) ELSE NULL END
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();

    -- Insert into audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        NEW.id,
        'user_registered',
        'profile',
        NEW.id::text,
        jsonb_build_object(
            'email', NEW.email,
            'nama', v_nama,
            'role', v_role,
            'status', v_status,
            'jenis_rm', v_jenis_rm
        )
    );

    RETURN NEW;
END;
$$;

-- 4. Pastikan trigger on_auth_user_created terhubung ke handle_new_user()
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Perbarui RPC admin_approve_user()
--    Memastikan jika akun diubah rolenya menjadi Admin, jenis_rm otomatis di-reset menjadi NULL
CREATE OR REPLACE FUNCTION public.admin_approve_user(
    p_user_id UUID,
    p_role VARCHAR(30),
    p_status VARCHAR(30)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id UUID;
    v_admin_profile public.profiles%ROWTYPE;
BEGIN
    v_admin_id := auth.uid();
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_admin_profile FROM public.profiles WHERE id = v_admin_id;
    IF NOT FOUND OR v_admin_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Hanya Admin yang berwenang mengubah role atau status persetujuan akun.' USING ERRCODE = '42501';
    END IF;

    IF p_role NOT IN ('rm', 'admin') THEN
        RAISE EXCEPTION 'Role tidak valid. Hanya diizinkan rm atau admin.' USING ERRCODE = '22023';
    END IF;

    IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
        RAISE EXCEPTION 'Status tidak valid.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.profiles
    SET role = p_role,
        status = p_status,
        jenis_rm = CASE WHEN p_role = 'admin' THEN NULL ELSE jenis_rm END,
        approved_by = v_admin_id,
        approved_at = CASE WHEN p_status = 'approved' THEN timezone('utc'::text, now()) ELSE NULL END,
        updated_at = timezone('utc'::text, now())
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', format('Pengguna berhasil diperbarui menjadi %s dengan status %s.', p_role, p_status)
    );
END;
$$;

