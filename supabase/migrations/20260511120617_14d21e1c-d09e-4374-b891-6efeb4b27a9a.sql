-- Permitir código de edifício vazio/NULL para os casos em que o utilizador
-- explicitamente apaga o código ao editar.
ALTER TABLE public.buildings ALTER COLUMN code DROP NOT NULL;

-- Substituir UNIQUE total por UNIQUE parcial (ignora NULL).
ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS buildings_code_unique_not_null
  ON public.buildings (code)
  WHERE code IS NOT NULL AND code <> '';