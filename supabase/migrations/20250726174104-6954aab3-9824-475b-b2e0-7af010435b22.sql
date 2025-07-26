-- Add supplier response tracking table
CREATE TABLE public.supplier_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assistance_id UUID NOT NULL REFERENCES public.assistances(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('accepted', 'declined', 'no_response')),
  response_date TIMESTAMP WITH TIME ZONE,
  decline_reason TEXT,
  estimated_completion_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assistance_id, supplier_id)
);

-- Enable RLS
ALTER TABLE public.supplier_responses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage supplier responses" 
ON public.supplier_responses 
FOR ALL 
USING (is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view supplier responses" 
ON public.supplier_responses 
FOR SELECT 
USING (true);

-- Add response deadline tracking to assistances
ALTER TABLE public.assistances 
ADD COLUMN response_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN follow_up_count INTEGER DEFAULT 0,
ADD COLUMN last_follow_up_sent TIMESTAMP WITH TIME ZONE;

-- Create trigger for updated_at
CREATE TRIGGER update_supplier_responses_updated_at
BEFORE UPDATE ON public.supplier_responses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to check if assistance needs follow-up
CREATE OR REPLACE FUNCTION public.assistance_needs_followup(assistance_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
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