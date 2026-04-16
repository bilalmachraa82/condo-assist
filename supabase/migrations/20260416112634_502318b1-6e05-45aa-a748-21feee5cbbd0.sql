
-- Drop existing overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can create articles" ON knowledge_articles;
DROP POLICY IF EXISTS "Authenticated users can read published articles" ON knowledge_articles;
DROP POLICY IF EXISTS "Users can delete own or admins delete any" ON knowledge_articles;
DROP POLICY IF EXISTS "Users can update own or admins update any" ON knowledge_articles;

-- Replace with admin-only full access (consistent with other tables)
CREATE POLICY "Admins can manage knowledge articles"
  ON knowledge_articles FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Allow authenticated users to read published articles (read-only)
CREATE POLICY "Authenticated users can read published articles"
  ON knowledge_articles FOR SELECT
  TO authenticated
  USING (is_published = true OR is_admin(auth.uid()));

-- Create full-text search function with Portuguese config and relevance ranking
CREATE OR REPLACE FUNCTION public.search_knowledge_articles(
  search_query text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_building_id uuid DEFAULT NULL,
  filter_tags text[] DEFAULT NULL,
  result_limit int DEFAULT 20,
  result_offset int DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  title text,
  content text,
  category text,
  subcategory text,
  tags text[],
  building_id uuid,
  is_global boolean,
  is_published boolean,
  metadata jsonb,
  created_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  rank real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.id, ka.title, ka.content, ka.category, ka.subcategory,
    ka.tags, ka.building_id, ka.is_global, ka.is_published,
    ka.metadata, ka.created_by, ka.created_at, ka.updated_at,
    CASE
      WHEN search_query IS NOT NULL AND trim(search_query) <> '' THEN
        ts_rank(
          to_tsvector('portuguese', ka.title || ' ' || ka.content),
          plainto_tsquery('portuguese', search_query)
        )
      ELSE 0.0
    END::real AS rank
  FROM knowledge_articles ka
  WHERE ka.is_published = true
    AND (search_query IS NULL OR trim(search_query) = '' OR
         to_tsvector('portuguese', ka.title || ' ' || ka.content) @@ plainto_tsquery('portuguese', search_query)
         OR ka.title ILIKE '%' || search_query || '%'
         OR ka.content ILIKE '%' || search_query || '%')
    AND (filter_category IS NULL OR ka.category = filter_category)
    AND (filter_building_id IS NULL OR ka.building_id = filter_building_id OR ka.is_global = true)
    AND (filter_tags IS NULL OR ka.tags && filter_tags)
  ORDER BY
    CASE WHEN search_query IS NOT NULL AND trim(search_query) <> '' THEN rank END DESC NULLS LAST,
    ka.updated_at DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$;
