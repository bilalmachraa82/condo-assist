ALTER TABLE public.buildings
  ADD COLUMN IF NOT EXISTS elevator_supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_buildings_elevator_supplier_id
  ON public.buildings(elevator_supplier_id)
  WHERE elevator_supplier_id IS NOT NULL;