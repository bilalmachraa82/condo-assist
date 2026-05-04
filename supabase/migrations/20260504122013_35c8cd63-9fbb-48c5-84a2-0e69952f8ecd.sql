CREATE OR REPLACE FUNCTION public.bump_pendency_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'email_pendency_notes' THEN
    IF NEW.note_type = 'status_change' THEN
      RETURN NEW;
    END IF;
  END IF;

  UPDATE public.email_pendencies
     SET last_activity_at = now()
   WHERE id = NEW.pendency_id;

  RETURN NEW;
END;
$function$;