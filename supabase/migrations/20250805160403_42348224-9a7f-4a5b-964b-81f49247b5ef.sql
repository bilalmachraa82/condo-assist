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