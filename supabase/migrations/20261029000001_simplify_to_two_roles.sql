-- ==============================================================================
-- MIGRATION: Penyederhanaan Menjadi 2 Role (Admin & RM)
-- Menghapus role 'supervisor' sehingga hanya tersisa 'admin' dan 'rm'
-- ==============================================================================

-- 1. Perbarui Constraint CHECK pada tabel profiles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('rm', 'admin'));

-- 2. Perbarui RPC admin_approve_user
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

-- 3. Perbarui RLS Policies (Hanya Admin dan RM)
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.current_user_role() = 'admin'
    );

DROP POLICY IF EXISTS "nasabahs_delete_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_delete_policy" ON public.nasabahs
    FOR DELETE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (created_by_rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "jadwal_select_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_select_policy" ON public.jadwal_kunjungans
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "jadwal_insert_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_insert_policy" ON public.jadwal_kunjungans
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "jadwal_update_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_update_policy" ON public.jadwal_kunjungans
    FOR UPDATE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    )
    WITH CHECK (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "jadwal_delete_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_delete_policy" ON public.jadwal_kunjungans
    FOR DELETE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "jadwal_history_select_policy" ON public.jadwal_history;
CREATE POLICY "jadwal_history_select_policy" ON public.jadwal_history
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        public.current_user_role() = 'admin'
    );

DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        public.current_user_role() = 'admin'
    );
