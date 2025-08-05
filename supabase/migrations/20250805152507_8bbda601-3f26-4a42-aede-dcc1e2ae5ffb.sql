-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.calculate_reminder_schedule(assistance_priority assistance_priority)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE assistance_priority
    WHEN 'critical' THEN
      RETURN jsonb_build_object(
        'first_reminder', 6,     -- 6 hours
        'second_reminder', 12,   -- 12 hours  
        'escalation', 24         -- 24 hours
      );
    WHEN 'urgent' THEN
      RETURN jsonb_build_object(
        'first_reminder', 24,    -- 24 hours
        'second_reminder', 48,   -- 48 hours
        'escalation', 72         -- 72 hours  
      );
    ELSE -- normal
      RETURN jsonb_build_object(
        'first_reminder', 48,    -- 48 hours
        'second_reminder', 96,   -- 96 hours
        'escalation', 120        -- 120 hours
      );
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.schedule_assistance_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assistance_record RECORD;
  schedule_config JSONB;
  now_time TIMESTAMP WITH TIME ZONE := now();
BEGIN
  -- Process assistances that need reminders
  FOR assistance_record IN 
    SELECT a.*, s.name as supplier_name, s.email as supplier_email
    FROM assistances a
    LEFT JOIN suppliers s ON a.assigned_supplier_id = s.id
    WHERE a.status IN ('pending', 'awaiting_quotation', 'in_progress')
    AND a.assigned_supplier_id IS NOT NULL
    AND a.created_at < now_time
  LOOP
    -- Get reminder schedule for this priority
    SELECT public.calculate_reminder_schedule(assistance_record.priority) INTO schedule_config;
    
    -- Check if we need to send first reminder
    IF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE assistance_id = assistance_record.id 
      AND notification_type = 'reminder'
      AND reminder_count >= 1
    ) AND assistance_record.created_at + (schedule_config->>'first_reminder')::int * interval '1 hour' <= now_time THEN
      
      INSERT INTO notifications (
        assistance_id, supplier_id, notification_type, priority,
        scheduled_for, reminder_count, metadata
      ) VALUES (
        assistance_record.id, assistance_record.assigned_supplier_id, 'reminder', assistance_record.priority::text,
        now_time, 1,
        jsonb_build_object('reminder_type', 'first', 'original_deadline', assistance_record.response_deadline)
      );
      
    -- Check if we need to send second reminder  
    ELSIF NOT EXISTS (
      SELECT 1 FROM notifications 
      WHERE assistance_id = assistance_record.id 
      AND notification_type = 'reminder'
      AND reminder_count >= 2
    ) AND assistance_record.created_at + (schedule_config->>'second_reminder')::int * interval '1 hour' <= now_time THEN
      
      INSERT INTO notifications (
        assistance_id, supplier_id, notification_type, priority,
        scheduled_for, reminder_count, metadata
      ) VALUES (
        assistance_record.id, assistance_record.assigned_supplier_id, 'reminder', assistance_record.priority::text,
        now_time, 2,
        jsonb_build_object('reminder_type', 'second', 'original_deadline', assistance_record.response_deadline)
      );
      
    -- Check if we need to escalate
    ELSIF NOT EXISTS (
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
$$;