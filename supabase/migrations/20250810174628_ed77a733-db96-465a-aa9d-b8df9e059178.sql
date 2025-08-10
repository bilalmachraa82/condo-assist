-- Ensure RLS is enabled and admin policies exist for activity_log
ALTER TABLE IF EXISTS public.activity_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'Admins can manage activity log'
  ) THEN
    CREATE POLICY "Admins can manage activity log"
    ON public.activity_log
    FOR ALL
    TO authenticated
    USING (is_admin(auth.uid()))
    WITH CHECK (is_admin(auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_log' AND policyname = 'Admins can view activity log'
  ) THEN
    CREATE POLICY "Admins can view activity log"
    ON public.activity_log
    FOR SELECT
    TO authenticated
    USING (is_admin(auth.uid()));
  END IF;
END $$;