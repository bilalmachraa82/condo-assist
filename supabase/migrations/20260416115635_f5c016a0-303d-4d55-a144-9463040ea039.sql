UPDATE public.knowledge_articles
SET title = regexp_replace(title, '^Cond\.\s*''?\s*', '', 'i')
WHERE title ~* '^Cond\.\s*''?';