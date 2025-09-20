-- Fix the stats function to avoid nested aggregates
CREATE OR REPLACE FUNCTION public.get_followup_processing_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stats jsonb;
  type_stats jsonb;
BEGIN
  -- Get main stats
  SELECT jsonb_build_object(
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'overdue', COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for < now()),
    'due_now', COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= now()),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'sent_today', COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE),
    'failed_today', COUNT(*) FILTER (WHERE status = 'failed' AND updated_at >= CURRENT_DATE),
    'max_attempts_reached', COUNT(*) FILTER (WHERE attempt_count >= max_attempts)
  ) INTO stats
  FROM follow_up_schedules;
  
  -- Get type breakdown separately
  SELECT jsonb_object_agg(follow_up_type, pending_count) INTO type_stats
  FROM (
    SELECT 
      follow_up_type, 
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count
    FROM follow_up_schedules 
    GROUP BY follow_up_type
  ) t;
  
  -- Combine results
  RETURN stats || jsonb_build_object('by_type', COALESCE(type_stats, '{}'::jsonb));
END;
$function$;