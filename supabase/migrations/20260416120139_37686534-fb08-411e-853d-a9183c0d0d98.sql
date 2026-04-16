-- Create assembly_items table
CREATE TABLE public.assembly_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_code integer NOT NULL,
  building_address text,
  building_id uuid REFERENCES public.buildings(id),
  year integer NOT NULL DEFAULT 2025,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  status_notes text,
  category text,
  priority text DEFAULT 'normal',
  assigned_to text,
  estimated_cost numeric(10,2),
  resolution_date date,
  source_sheet text DEFAULT '2025',
  knowledge_article_id uuid REFERENCES public.knowledge_articles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for status and priority
CREATE OR REPLACE FUNCTION public.validate_assembly_item()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'in_progress', 'done', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  IF NEW.priority NOT IN ('urgent', 'high', 'normal', 'low') THEN
    RAISE EXCEPTION 'Invalid priority: %', NEW.priority;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_assembly_item_trigger
BEFORE INSERT OR UPDATE ON public.assembly_items
FOR EACH ROW EXECUTE FUNCTION public.validate_assembly_item();

-- Indexes
CREATE INDEX idx_assembly_items_building_code ON public.assembly_items (building_code);
CREATE INDEX idx_assembly_items_status ON public.assembly_items (status);
CREATE INDEX idx_assembly_items_year ON public.assembly_items (year);
CREATE INDEX idx_assembly_items_category ON public.assembly_items (category);

-- RLS
ALTER TABLE public.assembly_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage assembly items"
ON public.assembly_items
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view assembly items"
ON public.assembly_items
FOR SELECT
TO authenticated
USING (true);