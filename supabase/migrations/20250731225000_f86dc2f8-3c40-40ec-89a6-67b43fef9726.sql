-- Add escalation tracking fields to assistances table (only missing ones)
ALTER TABLE public.assistances 
ADD COLUMN escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN escalation_level INTEGER DEFAULT 0;

-- Add approval tracking fields to quotations table  
ALTER TABLE public.quotations
ADD COLUMN approved_by TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;