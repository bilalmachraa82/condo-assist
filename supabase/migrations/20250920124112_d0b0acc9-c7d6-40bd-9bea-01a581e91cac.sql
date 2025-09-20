-- Create a function to automatically process due follow-ups
CREATE OR REPLACE FUNCTION public.auto_process_followups()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  -- Call the edge function to process due follow-ups
  SELECT content::jsonb INTO result
  FROM http_post(
    'https://zmpitnpmplemfozvtbam.supabase.co/functions/v1/process-followups',
    '{"mode": "due"}',
    'application/json'
  );
  
  -- Log the execution
  INSERT INTO activity_log (
    action,
    details,
    metadata
  ) VALUES (
    'auto_followup_processed',
    'Automatic follow-up processing executed',
    jsonb_build_object(
      'result', result,
      'executed_at', now()
    )
  );
  
  RETURN result;
END;
$function$;

-- Create a function to get follow-up statistics for monitoring
CREATE OR REPLACE FUNCTION public.get_followup_processing_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'overdue', COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for < now()),
    'due_now', COUNT(*) FILTER (WHERE status = 'pending' AND scheduled_for <= now()),
    'processing', COUNT(*) FILTER (WHERE status = 'processing'),
    'sent_today', COUNT(*) FILTER (WHERE status = 'sent' AND sent_at >= CURRENT_DATE),
    'failed_today', COUNT(*) FILTER (WHERE status = 'failed' AND updated_at >= CURRENT_DATE),
    'max_attempts_reached', COUNT(*) FILTER (WHERE attempt_count >= max_attempts),
    'by_type', jsonb_object_agg(
      follow_up_type, 
      COUNT(*) FILTER (WHERE status = 'pending')
    )
  ) INTO stats
  FROM follow_up_schedules;
  
  RETURN stats;
END;
$function$;