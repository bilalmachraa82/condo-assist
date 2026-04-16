
-- Create knowledge_articles table
CREATE TABLE public.knowledge_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL,
  subcategory text,
  tags text[] DEFAULT '{}',
  building_id uuid REFERENCES public.buildings(id) ON DELETE SET NULL,
  is_global boolean DEFAULT false,
  is_published boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Full-text search index (Portuguese)
CREATE INDEX knowledge_articles_fts ON public.knowledge_articles
  USING gin(to_tsvector('portuguese', coalesce(title, '') || ' ' || coalesce(content, '')));

-- Filter indexes
CREATE INDEX knowledge_articles_category ON public.knowledge_articles(category);
CREATE INDEX knowledge_articles_building_id ON public.knowledge_articles(building_id);
CREATE INDEX knowledge_articles_tags ON public.knowledge_articles USING gin(tags);

-- Enable RLS
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read published articles
CREATE POLICY "Authenticated users can read published articles"
  ON public.knowledge_articles FOR SELECT
  TO authenticated
  USING (is_published = true OR created_by = auth.uid() OR is_admin(auth.uid()));

-- Authenticated users can create articles
CREATE POLICY "Authenticated users can create articles"
  ON public.knowledge_articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins can update any article, users can update their own
CREATE POLICY "Users can update own or admins update any"
  ON public.knowledge_articles FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Admins can delete any, users can delete their own
CREATE POLICY "Users can delete own or admins delete any"
  ON public.knowledge_articles FOR DELETE
  TO authenticated
  USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- Auto-update updated_at trigger
CREATE TRIGGER set_knowledge_articles_updated_at
  BEFORE UPDATE ON public.knowledge_articles
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);
