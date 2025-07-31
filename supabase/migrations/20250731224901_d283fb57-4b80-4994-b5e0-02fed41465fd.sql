-- Add escalation tracking fields to assistances table
ALTER TABLE public.assistances 
ADD COLUMN escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN escalation_level INTEGER DEFAULT 0,
ADD COLUMN follow_up_count INTEGER DEFAULT 0,
ADD COLUMN last_follow_up_sent TIMESTAMP WITH TIME ZONE;

-- Add approval tracking fields to quotations table  
ALTER TABLE public.quotations
ADD COLUMN approved_by TEXT,
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;