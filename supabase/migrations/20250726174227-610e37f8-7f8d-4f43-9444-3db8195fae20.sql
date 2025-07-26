-- Fix the function search path security warning
CREATE OR REPLACE FUNCTION public.assistance_needs_followup(assistance_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  assistance_record RECORD;
  response_record RECORD;
BEGIN
  -- Get assistance details
  SELECT * INTO assistance_record 
  FROM public.assistances 
  WHERE id = assistance_id;
  
  -- If no supplier assigned, no follow-up needed
  IF assistance_record.assigned_supplier_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If response deadline not set, no follow-up needed
  IF assistance_record.response_deadline IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- If deadline hasn't passed, no follow-up needed
  IF assistance_record.response_deadline > now() THEN
    RETURN FALSE;
  END IF;
  
  -- Check if supplier has already responded
  SELECT * INTO response_record 
  FROM public.supplier_responses 
  WHERE assistance_id = assistance_id 
  AND supplier_id = assistance_record.assigned_supplier_id;
  
  -- If supplier responded, no follow-up needed
  IF response_record.response_type IN ('accepted', 'declined') THEN
    RETURN FALSE;
  END IF;
  
  -- If too many follow-ups sent (max 3), no more follow-ups
  IF assistance_record.follow_up_count >= 3 THEN
    RETURN FALSE;
  END IF;
  
  -- If last follow-up was sent less than 24 hours ago, wait
  IF assistance_record.last_follow_up_sent IS NOT NULL 
     AND assistance_record.last_follow_up_sent > (now() - interval '24 hours') THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$;