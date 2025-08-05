-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create notifications table for persistent notifications
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID NOT NULL,
  supplier_id UUID,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('reminder', 'escalation', 'info', 'urgent_alert')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'urgent', 'normal')),
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
  reminder_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Admins can manage notifications"
ON public.notifications
FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view notifications"
ON public.notifications
FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_notifications_assistance_id ON public.notifications(assistance_id);
CREATE INDEX idx_notifications_scheduled_for ON public.notifications(scheduled_for);
CREATE INDEX idx_notifications_status ON public.notifications(status);

-- Create function to calculate reminder delays based on priority
CREATE OR REPLACE FUNCTION public.calculate_reminder_schedule(assistance_priority assistance_priority)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create function to schedule automatic reminders
CREATE OR REPLACE FUNCTION public.schedule_assistance_reminders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Create cron job to run reminder scheduler every hour
SELECT cron.schedule(
  'process-assistance-reminders',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT public.schedule_assistance_reminders();
  $$
);

-- Create trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();