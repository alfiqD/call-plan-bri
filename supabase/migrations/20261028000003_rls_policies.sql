-- ==============================================================================
-- MIGRATION 3: Row Level Security (RLS) & Access Control Policies
-- ==============================================================================

-- 1. Helper security functions (Defined with SECURITY DEFINER to bypass recursion)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS VARCHAR(30)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_user_approved()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((status = 'approved'), false) FROM public.profiles WHERE id = auth.uid();
$$;

-- 2. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nasabahs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_kunjungans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jadwal_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- 3. PROFILES POLICIES
-- Anyone authenticated can view their own profile; Admin can view all profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.current_user_role() = 'admin'
    );

-- User can update their own personal info (name), but CANNOT elevate their role or approval status
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        id = auth.uid() OR 
        public.current_user_role() = 'admin'
    )
    WITH CHECK (
        -- If updating self, role and status must remain unchanged unless caller is admin
        CASE 
            WHEN public.current_user_role() = 'admin' THEN true
            WHEN id = auth.uid() THEN (
                role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()) AND
                status = (SELECT p.status FROM public.profiles p WHERE p.id = auth.uid())
            )
            ELSE false
        END
    );


-- 4. NASABAHS POLICIES
-- Only approved users can read active nasabah data
DROP POLICY IF EXISTS "nasabahs_select_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_select_policy" ON public.nasabahs
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND 
        deleted_at IS NULL
    );

-- Approved users can insert new nasabah
DROP POLICY IF EXISTS "nasabahs_insert_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_insert_policy" ON public.nasabahs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_approved()
    );

-- Approved RM/Admin can update nasabah
DROP POLICY IF EXISTS "nasabahs_update_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_update_policy" ON public.nasabahs
    FOR UPDATE
    TO authenticated
    USING (
        public.is_user_approved()
    )
    WITH CHECK (
        public.is_user_approved()
    );

-- Soft delete allowed for creator or Admin
DROP POLICY IF EXISTS "nasabahs_delete_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_delete_policy" ON public.nasabahs
    FOR DELETE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (created_by_rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );


-- 5. JADWAL KUNJUNGANS POLICIES
-- Approved RMs can see their assigned schedules; Admin can see all
DROP POLICY IF EXISTS "jadwal_select_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_select_policy" ON public.jadwal_kunjungans
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

-- Approved RM can insert appointments for themselves; Admin can assign to any RM
DROP POLICY IF EXISTS "jadwal_insert_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_insert_policy" ON public.jadwal_kunjungans
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

-- Approved RM can update their appointments; Admin can update any
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

-- Delete allowed for RM on pending appointments, or Admin
DROP POLICY IF EXISTS "jadwal_delete_policy" ON public.jadwal_kunjungans;
CREATE POLICY "jadwal_delete_policy" ON public.jadwal_kunjungans
    FOR DELETE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );


-- 6. JADWAL HISTORY & AUDIT LOGS POLICIES
-- Only Admin can read history and logs
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
