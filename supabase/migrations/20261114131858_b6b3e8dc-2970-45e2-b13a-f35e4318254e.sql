CREATE INDEX IF NOT EXISTS idx_assistances_created_at_id ON public.assistances (created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_assistance_id ON public.quotations (assistance_id);

CREATE OR REPLACE FUNCTION public.search_assistances_page(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_priority text DEFAULT NULL,
  p_building_id uuid DEFAULT NULL,
  p_supplier_id uuid DEFAULT NULL,
  p_assistance_number text DEFAULT NULL,
  p_date_from timestamptz DEFAULT NULL,
  p_date_to timestamptz DEFAULT NULL,
  p_elevator_only boolean DEFAULT false,
  p_limit integer DEFAULT 30,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH params AS (
    SELECT lower(btrim(coalesce(p_search, ''))) AS term,
           regexp_replace(lower(btrim(coalesce(p_search, ''))), '#', '') AS term_nohash,
           coalesce(p_search, '') = '' AS no_search
  ),
  filtered AS (
    SELECT a.*, b AS b_row, s AS s_row, it AS it_row
    FROM public.assistances a
    LEFT JOIN public.buildings b ON b.id = a.building_id
    LEFT JOIN public.suppliers s ON s.id = a.assigned_supplier_id
    LEFT JOIN public.intervention_types it ON it.id = a.intervention_type_id
    CROSS JOIN params p
    WHERE (p_status IS NULL OR a.status::text = p_status)
      AND (p_priority IS NULL OR a.priority::text = p_priority)
      AND (p_building_id IS NULL OR a.building_id = p_building_id)
      AND (p_supplier_id IS NULL OR a.assigned_supplier_id = p_supplier_id)
      AND (p_assistance_number IS NULL OR p_assistance_number = ''
           OR strpos(coalesce(a.assistance_number::text, ''), p_assistance_number) > 0)
      AND (p_date_from IS NULL OR a.created_at >= p_date_from)
      AND (p_date_to IS NULL OR a.created_at <= p_date_to)
      AND (NOT coalesce(p_elevator_only, false) OR (
            strpos(lower(coalesce(it.name, '')), 'elevador') > 0
            AND a.status::text IN ('pending','in_progress','accepted','scheduled','awaiting_quotation')))
      AND (p.no_search
        OR strpos(lower(coalesce(a.title, '')), p.term) > 0
        OR strpos(lower(coalesce(a.description, '')), p.term) > 0
        OR strpos(lower(coalesce(b.name, '')), p.term) > 0
        OR strpos(lower(coalesce(b.address, '')), p.term) > 0
        OR strpos(lower(coalesce(b.code, '')), p.term) > 0
        OR strpos(lower(coalesce(s.name, '')), p.term) > 0
        OR strpos(lower(coalesce(it.name, '')), p.term) > 0
        OR strpos(lower(coalesce(a.supplier_notes, '')), p.term) > 0
        OR strpos(lower(coalesce(a.admin_notes, '')), p.term) > 0
        OR strpos(lower(coalesce(a.progress_notes, '')), p.term) > 0
        OR strpos(coalesce(a.assistance_number::text, ''), p.term_nohash) > 0
        OR strpos('#' || coalesce(a.assistance_number::text, ''), p.term) > 0)
  ),
  page AS (
    SELECT f.* FROM filtered f
    ORDER BY f.created_at DESC, f.id DESC
    LIMIT greatest(1, least(coalesce(p_limit, 30), 1000))
    OFFSET greatest(0, coalesce(p_offset, 0))
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'rows', coalesce((
      SELECT jsonb_agg(
        (to_jsonb(pg.*) - 'b_row' - 's_row' - 'it_row')
        || jsonb_build_object(
          'buildings', CASE WHEN (pg.b_row).id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', (pg.b_row).id, 'name', (pg.b_row).name, 'code', (pg.b_row).code,
            'address', (pg.b_row).address, 'nif', (pg.b_row).nif, 'cadastral_code', (pg.b_row).cadastral_code) END,
          'suppliers', CASE WHEN (pg.s_row).id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', (pg.s_row).id, 'name', (pg.s_row).name) END,
          'intervention_types', CASE WHEN (pg.it_row).id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', (pg.it_row).id, 'name', (pg.it_row).name, 'category', (pg.it_row).category) END,
          'quotation_count', (SELECT count(*) FROM public.quotations q WHERE q.assistance_id = pg.id)
        )
        ORDER BY pg.created_at DESC, pg.id DESC)
      FROM page pg), '[]'::jsonb)
  );
$$;