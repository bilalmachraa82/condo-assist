-- Backup v3 antes da correcção residual
CREATE TABLE IF NOT EXISTS public._backup_dates_20260420_v3 (LIKE public._backup_dates_20260420 INCLUDING ALL);
ALTER TABLE public._backup_dates_20260420_v3 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Only admins can manage v3 backup" ON public._backup_dates_20260420_v3;
CREATE POLICY "Only admins can manage v3 backup" ON public._backup_dates_20260420_v3
  FOR ALL USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

INSERT INTO public._backup_dates_20260420_v3 (id, content, updated_at, backed_up_at)
SELECT id, content, updated_at, now()
FROM public.knowledge_articles
WHERE id = 'a25a8223-24a6-44c7-b2d4-cff8c123c5a1';

-- Correcção da única discrepância: 01/02/2083 → 01/02/1983
UPDATE public.knowledge_articles
SET content = replace(content, '01/02/2083', '01/02/1983'),
    updated_at = now()
WHERE id = 'a25a8223-24a6-44c7-b2d4-cff8c123c5a1';