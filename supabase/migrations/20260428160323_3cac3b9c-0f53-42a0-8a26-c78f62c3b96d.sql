-- Allow buildings to be deleted along with their dependent history.
-- Change the FKs that previously blocked the delete (NO ACTION) to CASCADE.

ALTER TABLE public.assistances
  DROP CONSTRAINT IF EXISTS assistances_building_id_fkey,
  ADD CONSTRAINT assistances_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;

ALTER TABLE public.assembly_items
  DROP CONSTRAINT IF EXISTS assembly_items_building_id_fkey,
  ADD CONSTRAINT assembly_items_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;