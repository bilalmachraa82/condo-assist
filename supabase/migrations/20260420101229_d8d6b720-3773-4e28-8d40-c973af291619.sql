ALTER TABLE public._backup_dates_20260420 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage date backup"
ON public._backup_dates_20260420
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));