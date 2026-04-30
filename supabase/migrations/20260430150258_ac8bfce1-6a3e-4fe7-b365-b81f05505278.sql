DELETE FROM public.building_inspections WHERE notes LIKE '[KB-IMPORT]%';

DO $$
DECLARE
  cat_gas uuid;
  cat_elev uuid;
  cat_ext uuid;
  cat_col uuid;
BEGIN
  SELECT id INTO cat_gas  FROM inspection_categories WHERE key = 'gas';
  SELECT id INTO cat_elev FROM inspection_categories WHERE key = 'elevador';
  SELECT id INTO cat_ext  FROM inspection_categories WHERE key = 'extintor';
  SELECT id INTO cat_col  FROM inspection_categories WHERE key = 'coluna_electrica';

  -- GÁS
  INSERT INTO public.building_inspections
    (building_id, category_id, inspection_date, result, next_due_date, notes)
  SELECT
    ka.building_id,
    cat_gas,
    to_date(m[1], 'DD/MM/YYYY'),
    'ok',
    (to_date(m[1], 'DD/MM/YYYY') + INTERVAL '3 years')::date,
    '[KB-IMPORT] Gás'
  FROM knowledge_articles ka
  CROSS JOIN LATERAL regexp_match(ka.content, 'Inspecionado em (\d{2}/\d{2}/\d{4})') AS m
  WHERE ka.category = 'gas'
    AND ka.building_id IS NOT NULL
    AND m IS NOT NULL;

  -- ELEVADORES
  INSERT INTO public.building_inspections
    (building_id, category_id, inspection_date, result, next_due_date,
     company_name, company_contact, notes)
  SELECT
    ka.building_id,
    cat_elev,
    (to_date(m[1], 'DD/MM/YYYY') - INTERVAL '2 years')::date,
    'ok',
    to_date(m[1], 'DD/MM/YYYY'),
    NULLIF(trim((regexp_match(ka.content, 'Empresa:\*?\*?\s*([^\n]+)'))[1]), ''),
    NULLIF(trim((regexp_match(ka.content, 'Telefone:\*?\*?\s*([^\n]+)'))[1]), ''),
    '[KB-IMPORT] Elevador'
  FROM knowledge_articles ka
  CROSS JOIN LATERAL regexp_match(ka.content, 'Data Inspeção:\*?\*?\s*(\d{2}/\d{2}/\d{4})') AS m
  WHERE ka.category = 'elevadores'
    AND ka.building_id IS NOT NULL
    AND m IS NOT NULL;

  -- EXTINTORES
  INSERT INTO public.building_inspections
    (building_id, category_id, inspection_date, result, next_due_date,
     company_name, company_contact, notes)
  SELECT
    ka.building_id,
    cat_ext,
    (to_date(m[1], 'DD/MM/YYYY') - INTERVAL '1 year')::date,
    'ok',
    to_date(m[1], 'DD/MM/YYYY'),
    NULLIF(trim((regexp_match(ka.content, 'Empresa:\*?\*?\s*([^\n]+)'))[1]), ''),
    NULLIF(trim((regexp_match(ka.content, 'Contacto:\*?\*?\s*([^\n]+)'))[1]), ''),
    '[KB-IMPORT] Extintor'
  FROM knowledge_articles ka
  CROSS JOIN LATERAL regexp_match(ka.content, '\*\*Data:\*\*\s*(\d{2}/\d{2}/\d{4})') AS m
  WHERE ka.category = 'extintores'
    AND ka.building_id IS NOT NULL
    AND m IS NOT NULL;

  -- COLUNAS ELÉCTRICAS: max ano coberto define última inspeção
  INSERT INTO public.building_inspections
    (building_id, category_id, inspection_date, result, next_due_date, notes)
  SELECT
    building_id,
    cat_col,
    make_date(max_year - 2, 6, 30),
    'ok',
    make_date(max_year + 1, 6, 30),
    '[KB-IMPORT] Coluna Eléctrica (último ano coberto: ' || max_year || ')'
  FROM (
    SELECT
      ka.building_id,
      max((m[1])::int) AS max_year
    FROM knowledge_articles ka
    CROSS JOIN LATERAL regexp_matches(ka.content, '\|\s*(20\d{2})\s*\|\s*ok\s*\|', 'gi') AS m
    WHERE ka.category = 'colunas_eletricas'
      AND ka.building_id IS NOT NULL
    GROUP BY ka.building_id
  ) agg;
END $$;