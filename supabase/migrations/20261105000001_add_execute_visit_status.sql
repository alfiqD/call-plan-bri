-- Add the administrative processing stage to visit statuses.
ALTER TABLE public.jadwal_kunjungans
    DROP CONSTRAINT IF EXISTS jadwal_kunjungans_status_check;

ALTER TABLE public.jadwal_kunjungans
    ADD CONSTRAINT jadwal_kunjungans_status_check
    CHECK (status IN ('pending', 'execute', 'selesai', 'reschedule', 'tidak_ditemui', 'batal'));

-- A verified field check-in submits the visit to administration rather than
-- marking the administrative process complete.
CREATE OR REPLACE FUNCTION public.submit_visit_for_administration(
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
    v_user_id UUID := auth.uid();
    v_profile public.profiles%ROWTYPE;
    v_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_result JSONB;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak. Pengguna belum login.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' THEN
        RAISE EXCEPTION 'Akun Anda belum disetujui untuk melakukan aktivitas operasional.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_jadwal
    FROM public.jadwal_kunjungans
    WHERE id = p_jadwal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kunjungan #% tidak ditemukan.', p_jadwal_id USING ERRCODE = 'P0002';
    END IF;

    IF v_jadwal.rm_id != v_user_id AND v_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak untuk melakukan check-in pada jadwal ini.' USING ERRCODE = '42501';
    END IF;

    IF v_jadwal.status NOT IN ('pending', 'reschedule') OR v_jadwal.check_in_at IS NOT NULL THEN
        RAISE EXCEPTION 'Hanya jadwal baru atau jadwal ulang tanpa check-in yang dapat dikirim ke tahap administrasi.' USING ERRCODE = '22023';
    END IF;

    IF v_jadwal.status = 'reschedule' THEN
        UPDATE public.jadwal_kunjungans
        SET status = 'pending'
        WHERE id = p_jadwal_id;
    END IF;

    v_result := public.check_in_visit(
        p_jadwal_id,
        p_lat,
        p_lng,
        COALESCE(NULLIF(TRIM(p_notes), ''), 'Status hasil kunjungan: Execute'),
        p_accuracy
    );

    UPDATE public.jadwal_kunjungans
    SET status = 'execute',
        updated_at = timezone('utc'::text, now())
    WHERE id = p_jadwal_id
      AND status = 'selesai';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Status kunjungan tidak berhasil dikirim ke tahap administrasi.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.jadwal_history
    SET previous_status = v_jadwal.status,
        new_status = 'execute'
    WHERE id = (
        SELECT id
        FROM public.jadwal_history
        WHERE jadwal_id = p_jadwal_id
          AND changed_by = v_user_id
          AND action_type = 'check_in'
          AND new_status = 'selesai'
        ORDER BY id DESC
        LIMIT 1
    );
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Riwayat check-in kunjungan tidak ditemukan.' USING ERRCODE = 'P0002';
    END IF;

    RETURN jsonb_set(v_result, '{data,status}', '"execute"'::jsonb);
END;
$$;

-- Only an approved administrator may mark an Execute visit as administratively complete.
CREATE OR REPLACE FUNCTION public.complete_visit_administration(p_jadwal_id BIGINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_profile public.profiles%ROWTYPE;
    v_jadwal public.jadwal_kunjungans%ROWTYPE;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak. Pengguna belum login.' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_profile FROM public.profiles WHERE id = v_user_id;
    IF NOT FOUND OR v_profile.status != 'approved' OR v_profile.role != 'admin' THEN
        RAISE EXCEPTION 'Hanya Admin yang dapat menyelesaikan tahap administrasi.' USING ERRCODE = '42501';
    END IF;

    SELECT * INTO v_jadwal
    FROM public.jadwal_kunjungans
    WHERE id = p_jadwal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kunjungan #% tidak ditemukan.', p_jadwal_id USING ERRCODE = 'P0002';
    END IF;

    IF v_jadwal.status != 'execute' OR v_jadwal.check_in_at IS NULL THEN
        RAISE EXCEPTION 'Hanya kunjungan Execute dengan check-in valid yang dapat diselesaikan.' USING ERRCODE = '22023';
    END IF;

    UPDATE public.jadwal_kunjungans
    SET status = 'selesai',
        updated_at = v_now
    WHERE id = p_jadwal_id;

    INSERT INTO public.jadwal_history (
        jadwal_id,
        changed_by,
        action_type,
        previous_status,
        new_status
    ) VALUES (
        p_jadwal_id,
        v_user_id,
        'status_change',
        'execute',
        'selesai'
    );

    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_user_id,
        'visit_administration_completed',
        'jadwal_kunjungan',
        p_jadwal_id::text,
        jsonb_build_object('previous_status', 'execute', 'new_status', 'selesai')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Tahap administrasi kunjungan selesai.', 'status', 'selesai');
END;
$$;
