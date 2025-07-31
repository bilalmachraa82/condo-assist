-- Add escalation tracking fields to assistances table (only missing ones)
ALTER TABLE public.assistances 
ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;

-- Add approval tracking fields to quotations table (only missing ones)
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS approved_by TEXT;