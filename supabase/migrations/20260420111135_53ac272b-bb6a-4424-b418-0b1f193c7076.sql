-- Final cleanup: convert remaining 24 short M/D/YY dates to dd/MM/yyyy (US locale interpretation, consistent with prior batch)
DO $$
DECLARE
  rec RECORD;
  match TEXT;
  parts TEXT[];
  m INT; d INT; y INT;
  new_date TEXT;
  new_content TEXT;
BEGIN
  FOR rec IN 
    SELECT id, content FROM knowledge_articles 
    WHERE content ~ '\m[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}\M'
  LOOP
    new_content := rec.content;
    FOR match IN 
      SELECT (regexp_matches(rec.content, '\m[0-9]{1,2}/[0-9]{1,2}/[0-9]{2}\M', 'g'))[1]
    LOOP
      parts := string_to_array(match, '/');
      m := parts[1]::INT;
      d := parts[2]::INT;
      y := parts[3]::INT;
      -- US locale: month/day/year. Year 2000+
      IF y < 100 THEN y := 2000 + y; END IF;
      new_date := lpad(d::TEXT, 2, '0') || '/' || lpad(m::TEXT, 2, '0') || '/' || y::TEXT;
      new_content := regexp_replace(new_content, '\m' || regexp_replace(match, '([\.\^\$\*\+\?\(\)\[\]\{\}\\\|])', '\\\1', 'g') || '\M', new_date, 'g');
    END LOOP;
    IF new_content <> rec.content THEN
      UPDATE knowledge_articles SET content = new_content, updated_at = now() WHERE id = rec.id;
    END IF;
  END LOOP;
END $$;