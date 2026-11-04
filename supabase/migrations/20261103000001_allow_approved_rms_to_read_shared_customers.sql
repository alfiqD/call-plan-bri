-- Approved RMs in this branch-scoped app share the customer directory.
-- Customer updates and deletes remain restricted by their existing policies.
DROP POLICY IF EXISTS "nasabahs_select_policy" ON public.nasabahs;
CREATE POLICY "nasabahs_select_policy" ON public.nasabahs
    FOR SELECT
    TO authenticated
    USING (
        public.is_user_approved() AND
        deleted_at IS NULL AND
        public.current_user_role() IN ('rm', 'admin')
    );
