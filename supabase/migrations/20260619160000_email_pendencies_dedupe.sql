ALTER TABLE public.email_pendencies
  ADD COLUMN IF NOT EXISTS source_fingerprint text;

CREATE INDEX IF NOT EXISTS idx_email_pendencies_source_fingerprint
  ON public.email_pendencies(source_fingerprint)
  WHERE source_fingerprint IS NOT NULL;

CREATE OR REPLACE FUNCTION public.normalize_email_pendency_key_text(value text)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(trim(regexp_replace(lower(coalesce(value, '')), '\s+', ' ', 'g')), '');
$$;

CREATE OR REPLACE FUNCTION public.email_pendency_fingerprint(
  p_building_id uuid,
  p_title text,
  p_subject text,
  p_email_sent_at timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN p_building_id IS NULL THEN NULL
    ELSE md5(
      p_building_id::text || '|' ||
      coalesce(public.normalize_email_pendency_key_text(p_subject), public.normalize_email_pendency_key_text(p_title), '') || '|' ||
      coalesce(to_char(p_email_sent_at AT TIME ZONE 'UTC', 'YYYY-MM-DD'), '')
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.set_email_pendency_fingerprint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.source_fingerprint := public.email_pendency_fingerprint(
    NEW.building_id,
    NEW.title,
    NEW.subject,
    NEW.email_sent_at
  );

  IF NEW.source_fingerprint IS NOT NULL
    AND NEW.status NOT IN ('resolvido', 'cancelado')
    AND EXISTS (
      SELECT 1
      FROM public.email_pendencies ep
      WHERE ep.id <> NEW.id
        AND ep.source_fingerprint = NEW.source_fingerprint
        AND ep.status NOT IN ('resolvido', 'cancelado')
      LIMIT 1
    )
  THEN
    RAISE EXCEPTION 'Pendência de email duplicada para este edifício e assunto'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.email_pendencies
SET source_fingerprint = public.email_pendency_fingerprint(
  building_id,
  title,
  subject,
  email_sent_at
)
WHERE source_fingerprint IS NULL;

DROP TRIGGER IF EXISTS trg_email_pendencies_source_fingerprint ON public.email_pendencies;
CREATE TRIGGER trg_email_pendencies_source_fingerprint
  BEFORE INSERT OR UPDATE OF building_id, title, subject, email_sent_at, status
  ON public.email_pendencies
  FOR EACH ROW
  EXECUTE FUNCTION public.set_email_pendency_fingerprint();
