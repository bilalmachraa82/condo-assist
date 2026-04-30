-- Make activity bump skip status-change notes (status trigger already updates last_activity_at on NEW)
CREATE OR REPLACE FUNCTION public.bump_pendency_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.note_type = 'status_change' THEN
    RETURN NEW;
  END IF;
  UPDATE public.email_pendencies
     SET last_activity_at = now()
   WHERE id = NEW.pendency_id;
  RETURN NEW;
END;
$$;

-- Make status-change logger SECURITY DEFINER so insert into notes never trips RLS in trigger context
CREATE OR REPLACE FUNCTION public.log_pendency_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.last_activity_at := now();
    INSERT INTO public.email_pendency_notes (pendency_id, author_id, body, note_type, metadata)
    VALUES (
      NEW.id,
      auth.uid(),
      'Estado alterado: ' || OLD.status::text || ' → ' || NEW.status::text,
      'status_change',
      jsonb_build_object('from', OLD.status::text, 'to', NEW.status::text)
    );
  END IF;
  RETURN NEW;
END;
$$;