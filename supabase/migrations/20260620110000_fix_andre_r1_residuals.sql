-- Allow all insurance coverage types exposed by the UI.
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

UPDATE public.building_insurances
SET coverage_type = 'outro'
WHERE coverage_type NOT IN ('multirisco','partes_comuns','acidentes_trabalho','outro');

ALTER TABLE public.building_insurances
  ADD CONSTRAINT building_insurances_coverage_type_check
  CHECK (coverage_type IN ('multirisco','partes_comuns','acidentes_trabalho','outro'));
