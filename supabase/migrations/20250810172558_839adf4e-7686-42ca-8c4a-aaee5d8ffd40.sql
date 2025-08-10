-- Create RLS policy for activity_log to allow admin access
CREATE POLICY "Admins can manage activity log"
ON public.activity_log
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));