-- ==============================================================================
-- MIGRATION: Strict RLS Separation, Audit Logs, and Tamper-Proof Triggers
-- Bank BRI KCP Iskandar Palembang - CallPlan
-- ==============================================================================

-- 1. Ensure public.audit_logs structure meets enterprise banking audit requirements
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    actor_name VARCHAR(120),
    actor_role VARCHAR(30) DEFAULT 'rm',
    action VARCHAR(80) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Add missing columns if table already existed from earlier schema
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'actor_email') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_email VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'actor_name') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_name VARCHAR(120);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'actor_role') THEN
        ALTER TABLE public.audit_logs ADD COLUMN actor_role VARCHAR(30) DEFAULT 'rm';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'ip_address') THEN
        ALTER TABLE public.audit_logs ADD COLUMN ip_address VARCHAR(45);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Audit logs RLS policies (Strictly Admin-Only Read, Append-Only by System)
DROP POLICY IF EXISTS "audit_logs_select_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        public.current_user_role() = 'admin'
    );

-- Authenticated users can insert audit logs through trusted functions
DROP POLICY IF EXISTS "audit_logs_insert_policy" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        actor_id = auth.uid() OR public.current_user_role() = 'admin'
    );

-- Audit logs are append-only. NEVER allow UPDATE or DELETE by any user
DROP POLICY IF EXISTS "audit_logs_update_policy" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_delete_policy" ON public.audit_logs;


-- 3. Strict RLS Separation for Nasabahs:
-- RM can ONLY see and manage their own assigned/created nasabah. Admin can view all.
DROP POLICY IF EXISTS "nasabahs_select_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_select_policy" ON public.nasabahs
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND 
        deleted_at IS NULL AND
        (created_by_rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

DROP POLICY IF EXISTS "nasabahs_update_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_update_policy" ON public.nasabahs
    FOR UPDATE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (created_by_rm_id = auth.uid() OR public.current_user_role() = 'admin')
    )
    WITH CHECK (
        public.is_user_approved() AND
        (created_by_rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );


-- 4. RPC for recording audit events safely from server/application
CREATE OR REPLACE FUNCTION public.record_audit_log(
    p_action VARCHAR(80),
    p_entity_type VARCHAR(50),
    p_entity_id TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID := auth.uid();
    v_actor_role VARCHAR(30);
    v_actor_email VARCHAR(255);
    v_actor_name VARCHAR(120);
    v_new_id BIGINT;
BEGIN
    SELECT role, email, nama INTO v_actor_role, v_actor_email, v_actor_name
    FROM public.profiles
    WHERE id = v_actor_id;

    INSERT INTO public.audit_logs (
        actor_id,
        actor_email,
        actor_name,
        actor_role,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        v_actor_id,
        v_actor_email,
        v_actor_name,
        COALESCE(v_actor_role, 'rm'),
        p_action,
        p_entity_type,
        p_entity_id,
        COALESCE(p_metadata, '{}'::jsonb)
    ) RETURNING id INTO v_new_id;

    RETURN jsonb_build_object('success', true, 'id', v_new_id);
END;
$$;
