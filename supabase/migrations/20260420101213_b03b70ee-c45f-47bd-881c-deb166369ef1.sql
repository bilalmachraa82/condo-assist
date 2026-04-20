-- Backup das colunas afectadas antes de qualquer escrita
CREATE TABLE IF NOT EXISTS public._backup_dates_20260420 AS
SELECT id, content, updated_at, now() AS backed_up_at
FROM public.knowledge_articles
WHERE created_at >= '2026-04-10'
  AND content ~ '\m\d{1,2}/\d{1,2}/\d{2,4}\M';

-- Função utilitária: normaliza datas em formato m/d/yy ou d/m/yy para dd/MM/yyyy
-- Heurística:
--   * primeiro componente > 12  → já é d/m/y, normaliza pad
--   * segundo componente > 12   → é m/d/y, TROCA para d/m/y
--   * ambos <= 12               → ambíguo, deixa como está
CREATE OR REPLACE FUNCTION public.pt_normalize_dates(input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  result text := input;
  m text[];
  match_start int;
  full_match text;
  a int;
  b int;
  y int;
  day int;
  month int;
  replacement text;
  pos int := 1;
  out_text text := '';
BEGIN
  IF input IS NULL THEN RETURN NULL; END IF;

  -- Itera todas as ocorrências de \b\d{1,2}/\d{1,2}/\d{2,4}\b
  FOR m IN
    SELECT regexp_matches(input, '(\m\d{1,2}/\d{1,2}/\d{2,4}\M)', 'g')
  LOOP
    full_match := m[1];
    -- Re-extrai componentes
    SELECT (regexp_match(full_match, '^(\d{1,2})/(\d{1,2})/(\d{2,4})$'))
    INTO m;
    a := m[1]::int;
    b := m[2]::int;
    y := m[3]::int;
    IF y < 100 THEN y := y + 2000; END IF;

    IF a > 12 AND b <= 12 THEN
      day := a; month := b;
    ELSIF b > 12 AND a <= 12 THEN
      day := b; month := a;
    ELSE
      -- Ambíguo: salta, deixa como está
      CONTINUE;
    END IF;

    IF day < 1 OR day > 31 OR month < 1 OR month > 12 THEN
      CONTINUE;
    END IF;

    replacement := lpad(day::text, 2, '0') || '/' || lpad(month::text, 2, '0') || '/' || y::text;
    result := replace(result, full_match, replacement);
  END LOOP;

  RETURN result;
END;
$$;

-- Aplica a correcção nos artigos importados desde 2026-04-10
UPDATE public.knowledge_articles
SET content = public.pt_normalize_dates(content),
    updated_at = now()
WHERE created_at >= '2026-04-10'
  AND content ~ '\m\d{1,2}/\d{1,2}/\d{2,4}\M';

-- Aplica também em assembly_items (caso exista futuramente — agora retorna 0)
UPDATE public.assembly_items
SET description = public.pt_normalize_dates(description),
    status_notes = public.pt_normalize_dates(status_notes),
    updated_at = now()
WHERE description ~ '\m\d{1,2}/\d{1,2}/\d{2,4}\M'
   OR coalesce(status_notes,'') ~ '\m\d{1,2}/\d{1,2}/\d{2,4}\M';