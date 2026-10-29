-- ==============================================================================
-- MIGRATION 2: Trusted Functions, Triggers, & Stored Procedures (RPCs)
-- ==============================================================================

-- 1. TRIGGER: Auto-create profile on auth.users registration
-- Self-registration defaults to role='rm' and status='pending'.
-- Admin approval is required before the user can access banking data.
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
    END IF;

    INSERT INTO public.profiles (
        id,
        nama,
        email,
        role,
        status,
        assigned_area,
        approved_at
    ) VALUES (
        NEW.id,
        v_nama,
        NEW.email,
        v_role,
        v_status,
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
        jsonb_build_object('email', NEW.email, 'nama', v_nama, 'role', v_role, 'status', v_status)
    );

    RETURN NEW;
END;
$$;

-- Trigger execution on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. HELPER: Calculate Haversine Distance in Meters
CREATE OR REPLACE FUNCTION public.haversine_distance_meters(
    p_lat1 NUMERIC,
    p_lon1 NUMERIC,
    p_lat2 NUMERIC,
    p_lon2 NUMERIC
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    r NUMERIC := 6371000.0; -- Earth radius in meters
    dlat NUMERIC;
    dlon NUMERIC;
    a NUMERIC;
    c NUMERIC;
BEGIN
    IF p_lat1 IS NULL OR p_lon1 IS NULL OR p_lat2 IS NULL OR p_lon2 IS NULL THEN
        RETURN NULL;
    END IF;

    dlat := radians(p_lat2 - p_lat1);
    dlon := radians(p_lon2 - p_lon1);

    a := sin(dlat / 2.0)^2 + 
         cos(radians(p_lat1)) * cos(radians(p_lat2)) * 
         sin(dlon / 2.0)^2;

    -- Clamp to avoid precision issues outside [0, 1]
    IF a > 1.0 THEN a := 1.0; END IF;
    IF a < 0.0 THEN a := 0.0; END IF;

    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));
    RETURN r * c;
END;
$$;


-- 3. RPC: CHECK-IN VISIT (Server-Side Verified GPS Check-In)
CREATE OR REPLACE FUNCTION public.check_in_visit(
    p_jadwal_id BIGINT,
    p_lat NUMERIC,
    p_lng NUMERIC,
    p_notes TEXT,
    p_accuracy NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles%ROWTYPE;
    v_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_nasabah public.nasabahs%ROWTYPE;
    v_distance NUMERIC;
    v_max_radius NUMERIC := 100.0; -- 100 meters standard banking rule
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    -- 1. Authentication check
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak. Pengguna belum login.' USING ERRCODE = '28000';
    END IF;

    -- 2. Profile approval check
    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' THEN
        RAISE EXCEPTION 'Akun Anda belum disetujui untuk melakukan aktivitas operasional.' USING ERRCODE = '42501';
    END IF;

    -- 3. Lock target appointment row to prevent race conditions & double check-ins
    SELECT * INTO v_jadwal
    FROM public.jadwal_kunjungans
    WHERE id = p_jadwal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kunjungan #% tidak ditemukan.', p_jadwal_id USING ERRCODE = 'P0002';
    END IF;

    -- 4. Check ownership: RM assigned or Admin
    IF v_jadwal.rm_id != v_user_id AND v_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak untuk melakukan check-in pada jadwal ini.' USING ERRCODE = '42501';
    END IF;

    -- 5. Prevent double check-in
    IF v_jadwal.check_in_at IS NOT NULL OR v_jadwal.status = 'selesai' THEN
        RAISE EXCEPTION 'Jadwal ini sudah melakukan check-in sebelumnya.' USING ERRCODE = '23505';
    END IF;

    -- 6. Check appointment status
    IF v_jadwal.status != 'pending' THEN
        RAISE EXCEPTION 'Check-in hanya dapat dilakukan untuk jadwal yang masih berstatus Terjadwal (pending).' USING ERRCODE = '22023';
    END IF;

    -- 7. Validate notes
    IF p_notes IS NULL OR TRIM(p_notes) = '' THEN
        RAISE EXCEPTION 'Catatan hasil kunjungan wajib diisi saat check-in.' USING ERRCODE = '22023';
    END IF;

    -- 8. Fetch and validate nasabah coordinates
    SELECT * INTO v_nasabah
    FROM public.nasabahs
    WHERE id = v_jadwal.nasabah_id;

    IF NOT FOUND OR v_nasabah.deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Data nasabah tidak ditemukan atau sudah dinonaktifkan.' USING ERRCODE = 'P0002';
    END IF;

    IF v_nasabah.latitude IS NULL OR v_nasabah.longitude IS NULL THEN
        RAISE EXCEPTION 'Titik koordinat nasabah belum tersedia pada peta. Perbarui koordinat nasabah terlebih dahulu.' USING ERRCODE = '22023';
    END IF;

    -- 9. Check input coordinates
    IF p_lat IS NULL OR p_lng IS NULL OR p_lat < -90 OR p_lat > 90 OR p_lng < -180 OR p_lng > 180 THEN
        RAISE EXCEPTION 'Koordinat GPS perangkat tidak valid.' USING ERRCODE = '22023';
    END IF;

    -- 10. Compute Haversine distance
    v_distance := public.haversine_distance_meters(
        v_nasabah.latitude,
        v_nasabah.longitude,
        p_lat,
        p_lng
    );

    IF v_distance > v_max_radius THEN
        RAISE EXCEPTION 'Check-in ditolak. Anda terdeteksi berjarak % meter dari titik nasabah (maksimal % meter).',
            ROUND(v_distance), ROUND(v_max_radius)
            USING ERRCODE = '22000';
    END IF;

    -- 11. Execute update
    UPDATE public.jadwal_kunjungans
    SET status = 'selesai',
        catatan_hasil = TRIM(p_notes),
        check_in_at = v_now,
        check_in_latitude = p_lat,
        check_in_longitude = p_lng,
        check_in_accuracy = p_accuracy,
        check_in_distance_meters = ROUND(v_distance, 2),
        updated_at = v_now
    WHERE id = p_jadwal_id;

    -- 12. Insert into history
    INSERT INTO public.jadwal_history (
        jadwal_id,
        changed_by,
        action_type,
        previous_status,
        new_status,
        notes
    ) VALUES (
        p_jadwal_id,
        v_user_id,
        'check_in',
        v_jadwal.status,
        'selesai',
        TRIM(p_notes)
    );

    -- 13. Audit log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        'check_in_completed',
        'jadwal_kunjungan',
        p_jadwal_id::text,
        jsonb_build_object(
            'nasabah_id', v_jadwal.nasabah_id,
            'distance_meters', ROUND(v_distance, 2),
            'accuracy', p_accuracy,
            'check_in_at', v_now
        )
    );

    -- Return clean JSON
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Check-in berhasil divalidasi.',
        'data', jsonb_build_object(
            'id', p_jadwal_id,
            'status', 'selesai',
            'catatan_hasil', TRIM(p_notes),
            'check_in_at', v_now,
            'check_in_latitude', p_lat,
            'check_in_longitude', p_lng,
            'check_in_accuracy', p_accuracy,
            'check_in_distance_meters', ROUND(v_distance, 2)
        )
    );
END;
$$;


-- 4. RPC: RESCHEDULE VISIT (Controlled status & date change)
CREATE OR REPLACE FUNCTION public.reschedule_visit(
    p_jadwal_id BIGINT,
    p_new_date DATE,
    p_new_time TIME,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles%ROWTYPE;
    v_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak. Belum login.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' THEN
        RAISE EXCEPTION 'Akun belum disetujui.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_jadwal FROM public.jadwal_kunjungans WHERE id = p_jadwal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal #% tidak ditemukan.', p_jadwal_id USING ERRCODE = 'P0002';
    END IF;

    IF v_jadwal.rm_id != v_user_id AND v_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Tidak berwenang mengubah jadwal ini.' USING ERRCODE = '42501';
    END IF;

    IF p_new_date IS NULL OR p_new_time IS NULL THEN
        RAISE EXCEPTION 'Tanggal dan jam baru wajib ditentukan untuk reschedule.' USING ERRCODE = '22023';
    END IF;

    -- Update appointment
    UPDATE public.jadwal_kunjungans
    SET status = 'reschedule',
        tanggal = p_new_date,
        waktu = p_new_time,
        catatan_hasil = COALESCE(TRIM(p_notes), catatan_hasil),
        updated_at = v_now
    WHERE id = p_jadwal_id;

    -- Insert into history
    INSERT INTO public.jadwal_history (
        jadwal_id,
        changed_by,
        action_type,
        previous_status,
        new_status,
        previous_date,
        new_date,
        previous_time,
        new_time,
        notes
    ) VALUES (
        p_jadwal_id,
        v_user_id,
        'reschedule',
        v_jadwal.status,
        'reschedule',
        v_jadwal.tanggal,
        p_new_date,
        v_jadwal.waktu,
        p_new_time,
        TRIM(p_notes)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Jadwal berhasil di-reschedule.');
END;
$$;


-- 5. RPC: MARK VISIT UNMET (Tidak Ditemui)
CREATE OR REPLACE FUNCTION public.mark_visit_unmet(
    p_jadwal_id BIGINT,
    p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles%ROWTYPE;
    v_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' THEN
        RAISE EXCEPTION 'Akun belum disetujui.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_jadwal FROM public.jadwal_kunjungans WHERE id = p_jadwal_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal #% tidak ditemukan.', p_jadwal_id USING ERRCODE = 'P0002';
    END IF;

    IF v_jadwal.rm_id != v_user_id AND v_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Tidak berwenang mengubah jadwal ini.' USING ERRCODE = '42501';
    END IF;

    UPDATE public.jadwal_kunjungans
    SET status = 'tidak_ditemui',
        catatan_hasil = TRIM(p_notes),
        updated_at = v_now
    WHERE id = p_jadwal_id;

    INSERT INTO public.jadwal_history (
        jadwal_id,
        changed_by,
        action_type,
        previous_status,
        new_status,
        notes
    ) VALUES (
        p_jadwal_id,
        v_user_id,
        'status_change',
        v_jadwal.status,
        'tidak_ditemui',
        TRIM(p_notes)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Status kunjungan diperbarui.');
END;
$$;


-- 6. RPC: GET DASHBOARD SUMMARY (Aggregated Stats in Database)
CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_profile public.profiles%ROWTYPE;
    v_total_today INT := 0;
    v_selesai_today INT := 0;
    v_pending_today INT := 0;
    v_reschedule_today INT := 0;
    v_unmet_today INT := 0;
    v_total_customers INT := 0;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' THEN
        RAISE EXCEPTION 'Akun belum aktif.' USING ERRCODE = '42501';
    END IF;

    -- If RM, calculate stats for this RM. If Admin, calculate for entire team/branch.
    IF v_profile.role = 'rm' THEN
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'selesai'),
            COUNT(*) FILTER (WHERE status = 'pending'),
            COUNT(*) FILTER (WHERE status = 'reschedule'),
            COUNT(*) FILTER (WHERE status = 'tidak_ditemui')
        INTO
            v_total_today,
            v_selesai_today,
            v_pending_today,
            v_reschedule_today,
            v_unmet_today
        FROM public.jadwal_kunjungans
        WHERE tanggal = p_date AND rm_id = v_user_id;

        SELECT COUNT(*) INTO v_total_customers
        FROM public.nasabahs
        WHERE deleted_at IS NULL;
    ELSE
        SELECT
            COUNT(*),
            COUNT(*) FILTER (WHERE status = 'selesai'),
            COUNT(*) FILTER (WHERE status = 'pending'),
            COUNT(*) FILTER (WHERE status = 'reschedule'),
            COUNT(*) FILTER (WHERE status = 'tidak_ditemui')
        INTO
            v_total_today,
            v_selesai_today,
            v_pending_today,
            v_reschedule_today,
            v_unmet_today
        FROM public.jadwal_kunjungans
        WHERE tanggal = p_date;

        SELECT COUNT(*) INTO v_total_customers
        FROM public.nasabahs
        WHERE deleted_at IS NULL;
    END IF;

    RETURN jsonb_build_object(
        'date', p_date,
        'total_today', v_total_today,
        'selesai_today', v_selesai_today,
        'pending_today', v_pending_today,
        'reschedule_today', v_reschedule_today,
        'unmet_today', v_unmet_today,
        'total_customers', v_total_customers
    );
END;
$$;


-- 7. RPC: ADMIN APPROVE OR UPDATE USER
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
        RAISE EXCEPTION 'Role tidak valid.' USING ERRCODE = '22023';
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

    -- Audit Log
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_admin_id,
        'user_approval_updated',
        'profile',
        p_user_id::text,
        jsonb_build_object('role', p_role, 'status', p_status)
    );

    RETURN jsonb_build_object('success', true, 'message', 'Pengguna berhasil diperbarui.');
END;
$$;
