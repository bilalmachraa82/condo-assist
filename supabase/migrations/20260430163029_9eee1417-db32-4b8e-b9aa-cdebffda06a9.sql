ALTER TABLE public.email_pendencies
  ADD CONSTRAINT email_pendencies_building_id_fkey
    FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE;

ALTER TABLE public.email_pendencies
  ADD CONSTRAINT email_pendencies_assistance_id_fkey
    FOREIGN KEY (assistance_id) REFERENCES public.assistances(id) ON DELETE SET NULL;

ALTER TABLE public.email_pendencies
  ADD CONSTRAINT email_pendencies_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;