-- Follow-up to the LUVIMG operational review:
-- 1) accept every insurance type exposed by the UI and MCP/LIA;
-- 2) store gas inspections using only the next inspection date.

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.building_insurances'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%coverage_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.building_insurances DROP CONSTRAINT IF EXISTS %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE public.building_insurances
  ADD CONSTRAINT building_insurances_coverage_type_check
  CHECK (coverage_type IN ('multirisco', 'partes_comuns', 'acidentes_trabalho', 'seguro_fracao', 'outro'));

CREATE OR REPLACE FUNCTION public.set_inspection_next_due()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_years integer;
  v_category_key text;
BEGIN
  SELECT validity_years, key
    INTO v_years, v_category_key
  FROM public.inspection_categories
  WHERE id = NEW.category_id;

  IF v_category_key = 'elevador' THEN
    NEW.inspection_date := NULL;
    IF NEW.result <> 'pendente_relatorio' AND NEW.next_due_date IS NULL THEN
      RAISE EXCEPTION 'A próxima data é obrigatória para elevadores não pendentes';
    END IF;
    RETURN NEW;
  END IF;

  IF v_category_key = 'gas' THEN
    NEW.inspection_date := NULL;
    IF NEW.next_due_date IS NULL THEN
      RAISE EXCEPTION 'A próxima data é obrigatória para inspeções de gás';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.inspection_date IS NULL THEN
    RAISE EXCEPTION 'A data de inspeção é obrigatória para esta categoria';
  END IF;

  IF v_years IS NULL THEN
    v_years := 1;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.next_due_date := NEW.inspection_date + (v_years || ' years')::interval;
  ELSIF NEW.next_due_date IS NULL
     OR NEW.inspection_date IS DISTINCT FROM OLD.inspection_date
     OR NEW.category_id IS DISTINCT FROM OLD.category_id THEN
    NEW.next_due_date := NEW.inspection_date + (v_years || ' years')::interval;
  END IF;

  RETURN NEW;
END;
$$;

UPDATE public.building_inspections inspection
SET inspection_date = NULL
FROM public.inspection_categories category
WHERE inspection.category_id = category.id
  AND category.key = 'gas'
  AND inspection.inspection_date IS NOT NULL;
