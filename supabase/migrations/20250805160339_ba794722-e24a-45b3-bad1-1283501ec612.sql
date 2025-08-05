-- Update the reminder schedule function to only escalate after the specified hours
-- Critical: 24h, Urgent: 72h, Normal: 120h
-- No early reminders, only escalation at the specified time

CREATE OR REPLACE FUNCTION public.calculate_reminder_schedule(assistance_priority assistance_priority)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  CASE assistance_priority
    WHEN 'critical' THEN
      RETURN jsonb_build_object(
        'escalation', 24         -- 24 hours - only escalation, no early reminders
      );
    WHEN 'urgent' THEN
      RETURN jsonb_build_object(
        'escalation', 72         -- 72 hours - only escalation, no early reminders
      );
    ELSE -- normal
      RETURN jsonb_build_object(
        'escalation', 120        -- 120 hours - only escalation, no early reminders
      );
  END CASE;
END;
$function$

-- Update the schedule reminders function to only send escalation emails
CREATE OR REPLACE FUNCTION public.schedule_assistance_reminders()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  assistance_record RECORD;
  schedule_config JSONB;
  now_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Process assistances that need escalation (no early reminders)
  FOR assistance_record IN 
    SELECT a.*, s.name as supplier_name, s.email as supplier_email
    FROM assistances a
    LEFT JOIN suppliers s ON a.assigned_supplier_id = s.id
    WHERE a.status IN ('pending', 'awaiting_quotation', 'in_progress')
    AND a.assigned_supplier_id IS NOT NULL
    AND a.created_at < now_time
  LOOP
    -- Get escalation schedule for this priority
    SELECT public.calculate_reminder_schedule(assistance_record.priority) INTO schedule_config;
    
    -- Check if we need to escalate (only send email at escalation time)
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE assistance_id = assistance_record.id 
      AND notification_type = 'escalation'
    ) AND assistance_record.created_at + (schedule_config->>'escalation')::int * interval '1 hour' <= now_time THEN
      
      INSERT INTO notifications (
        assistance_id, supplier_id, notification_type, priority,
        scheduled_for, reminder_count, metadata
      ) VALUES (
        assistance_record.id, assistance_record.assigned_supplier_id, 'escalation', assistance_record.priority::text,
        now_time, 0,
        jsonb_build_object('escalation_reason', 'no_response_timeout', 'original_deadline', assistance_record.response_deadline)
      );
      
      -- Update assistance with escalation timestamp
      UPDATE assistances 
      SET escalated_at = now_time 
      WHERE id = assistance_record.id;
      
    END IF;
  END LOOP;
END;
$function$