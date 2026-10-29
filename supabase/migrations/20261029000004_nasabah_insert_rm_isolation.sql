-- ==============================================================================
-- MIGRATION 4: Strict RM Data Isolation on Nasabah Insert + Follow-up RLS
-- Bank BRI KCP Iskandar Palembang - CallPlan
-- ==============================================================================

-- 1. Ensure nasabahs INSERT policy enforces RM can only create nasabah with their own ID
--    This prevents an RM from setting created_by_rm_id to another RM's ID
DROP POLICY IF EXISTS "nasabahs_insert_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_insert_policy" ON public.nasabahs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_approved() AND
        (
            -- RM can only insert with their own ID as created_by_rm_id
            -- Admin can insert with any (or null) created_by_rm_id
            public.current_user_role() = 'admin' OR
            created_by_rm_id = auth.uid()
        )
    );

-- 2. Enable RLS on follow_ups if not already done
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- 3. Follow-up RLS: RM can only see their own follow-ups; Admin sees all
DROP POLICY IF EXISTS "follow_ups_select_policy" ON public.follow_ups;
CREATE POLICY "follow_ups_select_policy" ON public.follow_ups
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

-- 4. RM can only insert follow-ups with their own rm_id
DROP POLICY IF EXISTS "follow_ups_insert_policy" ON public.follow_ups;
CREATE POLICY "follow_ups_insert_policy" ON public.follow_ups
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

-- 5. RM can only update their own follow-ups
DROP POLICY IF EXISTS "follow_ups_update_policy" ON public.follow_ups;
CREATE POLICY "follow_ups_update_policy" ON public.follow_ups
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

-- 6. RM can only delete their own pending/future follow-ups
DROP POLICY IF EXISTS "follow_ups_delete_policy" ON public.follow_ups;
CREATE POLICY "follow_ups_delete_policy" ON public.follow_ups
    FOR DELETE
    TO authenticated
    USING (
        public.is_user_approved() AND
        (rm_id = auth.uid() OR public.current_user_role() = 'admin')
    );

-- 7. Add trigger to automatically set created_by_rm_id from auth.uid() if not set
--    This is an additional safety net so RM cannot set arbitrary RM IDs
CREATE OR REPLACE FUNCTION public.set_nasabah_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- If created_by_rm_id is not set, set it from the auth session
    IF NEW.created_by_rm_id IS NULL THEN
        NEW.created_by_rm_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_nasabah_created_by ON public.nasabahs;
CREATE TRIGGER trg_set_nasabah_created_by
    BEFORE INSERT ON public.nasabahs
    FOR EACH ROW
    EXECUTE FUNCTION public.set_nasabah_created_by();

-- 8. Add trigger to automatically set rm_id from auth.uid() for follow_ups
CREATE OR REPLACE FUNCTION public.set_follow_up_rm_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.rm_id IS NULL THEN
        NEW.rm_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_follow_up_rm_id ON public.follow_ups;
CREATE TRIGGER trg_set_follow_up_rm_id
    BEFORE INSERT ON public.follow_ups
    FOR EACH ROW
    EXECUTE FUNCTION public.set_follow_up_rm_id();
